'use client';

import { useState, useCallback, useRef } from 'react';
import { useVisualEditor, type VisualStep } from '@/hooks/useVisualEditor';
import { useRecorderWebSocket } from '@/hooks/useRecorderWebSocket';
import { dbStepToVisualStep, type DbStep } from '@/lib/visualStepConverter';
import { StepList, type StepExecutionStatus } from './StepList';
import { PlaywrightRecorderPanel } from './recorder/PlaywrightRecorderPanel';
import { ManualStepDialog } from './recorder/ManualStepDialog';
import { FlowEditor } from './editor/flow-editor';
import { SchedulePanel } from './editor/schedule-panel';
import { PlayCircle, Loader2 } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';

interface VisualEditorWrapperProps {
  robotId: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  schedule?: any;
}

export function VisualEditorWrapper({
  robotId,
  initialNodes,
  initialEdges,
  schedule,
}: VisualEditorWrapperProps) {
  const [mode, setMode] = useState<'flow' | 'visual'>('flow');
  const [saving, setSaving] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [insertAfterId, setInsertAfterId] = useState<string | null>(null);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepExecutionStatus>>({});
  const [isRunningAll, setIsRunningAll] = useState(false);
  const runAllAbortRef = useRef(false);

  const {
    steps,
    addStep,
    insertStepAfter,
    updateStep,
    removeStep,
    reorderSteps,
    selectedStepId,
    setSelectedStepId,
    setSteps,
  } = useVisualEditor();

  const recorder = useRecorderWebSocket();

  // Load steps from DB when switching to visual mode
  const handleSwitchToVisual = async () => {
    try {
      const res = await fetch(`/api/robots/${robotId}/steps`);
      if (res.ok) {
        const { steps: dbSteps } = await res.json();
        const visualSteps = (dbSteps as DbStep[]).map(dbStepToVisualStep);
        setSteps(visualSteps);
      }
      setMode('visual');
    } catch (error) {
      console.error('Failed to load steps:', error);
      setMode('visual');
    }
  };

  // Save visual steps
  const handleVisualSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/robots/${robotId}/visual-steps`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps }),
      });

      if (res.ok) {
        alert('ビジュアルステップを保存しました');
      } else {
        alert('保存に失敗しました');
      }
    } catch (error) {
      console.error('Failed to save steps:', error);
      alert('保存エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  // Convert VisualStep to execute_step payload
  const stepToExecutePayload = (step: VisualStep) => {
    const config: Record<string, unknown> = {};
    if (step.selector) config.selector = step.selector;
    if (step.value) config.value = step.value;
    if (step.url) config.url = step.url;
    // For wait steps, map value to type+value format
    if (step.type === 'wait') {
      config.type = step.selector ? 'selector' : 'delay';
      config.value = step.value || '1000';
    }
    return { actionType: step.type, config };
  };

  // Ensure recorder session is connected
  const ensureSession = async (): Promise<boolean> => {
    if (recorder.status === 'connected' && recorder.sessionId) {
      return true;
    }

    // Need to start a session — find the first navigate step's URL, or use a blank page
    const firstNav = steps.find((s) => s.type === 'navigate');
    const url = firstNav?.url || 'about:blank';

    try {
      const res = await fetch('/api/recorder/start', { method: 'POST' });
      if (!res.ok) return false;
      const { workerWsUrl, token } = await res.json();
      await recorder.connect(workerWsUrl, token);
      recorder.sendStart(url, { width: 1280, height: 720 });
      // Wait for ready
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          // The recorder state updates are async, give it a moment
          resolve();
          clearInterval(check);
        }, 1000);
      });
      return true;
    } catch (err) {
      console.error('Failed to ensure session:', err);
      return false;
    }
  };

  // Execute a single step
  const handleExecuteStep = useCallback(async (step: VisualStep) => {
    setStepStatuses((prev) => ({ ...prev, [step.id]: 'running' }));

    const connected = await ensureSession();
    if (!connected) {
      setStepStatuses((prev) => ({ ...prev, [step.id]: 'error' }));
      return;
    }

    try {
      const result = await recorder.sendExecuteStep(stepToExecutePayload(step));
      setStepStatuses((prev) => ({
        ...prev,
        [step.id]: result.success ? 'success' : 'error',
      }));
    } catch (err) {
      console.error('Step execution failed:', err);
      setStepStatuses((prev) => ({ ...prev, [step.id]: 'error' }));
    }
  }, [recorder, steps]);

  // Run all steps sequentially
  const handleRunAllSteps = useCallback(async () => {
    if (steps.length === 0) return;

    setIsRunningAll(true);
    runAllAbortRef.current = false;

    // Reset all statuses
    const initial: Record<string, StepExecutionStatus> = {};
    steps.forEach((s) => { initial[s.id] = 'idle'; });
    setStepStatuses(initial);

    const connected = await ensureSession();
    if (!connected) {
      setIsRunningAll(false);
      return;
    }

    for (const step of steps) {
      if (runAllAbortRef.current) break;

      setStepStatuses((prev) => ({ ...prev, [step.id]: 'running' }));
      setSelectedStepId(step.id);

      try {
        const result = await recorder.sendExecuteStep(stepToExecutePayload(step));
        setStepStatuses((prev) => ({
          ...prev,
          [step.id]: result.success ? 'success' : 'error',
        }));

        if (!result.success) {
          // Stop on first failure
          break;
        }
      } catch (err) {
        console.error('Step execution failed:', err);
        setStepStatuses((prev) => ({ ...prev, [step.id]: 'error' }));
        break;
      }
    }

    setIsRunningAll(false);
  }, [steps, recorder, setSelectedStepId]);

  // Manual step dialog handlers
  const handleAddClick = () => {
    setInsertAfterId(null);
    setShowManualDialog(true);
  };

  const handleInsertAfter = (afterId: string) => {
    setInsertAfterId(afterId);
    setShowManualDialog(true);
  };

  const handleManualStepAdd = (step: Omit<VisualStep, 'id'>) => {
    if (insertAfterId && insertAfterId !== '__start__') {
      insertStepAfter(insertAfterId, step);
    } else {
      addStep(step);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
        <button
          onClick={() => setMode('flow')}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            mode === 'flow'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          フローエディタ
        </button>
        <button
          onClick={handleSwitchToVisual}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            mode === 'visual'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ビジュアルエディタ
        </button>

        {/* Visual mode actions */}
        {mode === 'visual' && (
          <div className="ml-auto flex items-center gap-2">
            {/* Run all steps */}
            <button
              onClick={handleRunAllSteps}
              disabled={isRunningAll || steps.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunningAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              {isRunningAll ? '実行中...' : '全ステップ実行'}
            </button>

            {/* Save */}
            <button
              onClick={handleVisualSave}
              disabled={saving}
              className="px-4 py-2 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        )}

        {mode === 'flow' && (
          <div className="ml-auto">
            <button
              disabled
              className="px-4 py-2 rounded text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
            >
              保存
            </button>
          </div>
        )}
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-hidden">
        {mode === 'flow' && (
          <div className="flex gap-4 h-full overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <FlowEditor
                robotId={robotId}
                initialNodes={initialNodes}
                initialEdges={initialEdges}
              />
            </div>
            <div className="w-80 overflow-y-auto">
              <SchedulePanel robotId={robotId} schedule={schedule} />
            </div>
          </div>
        )}

        {mode === 'visual' && (
          <div className="flex h-full border rounded-lg overflow-hidden bg-gray-50">
            {/* Left panel: Step list */}
            <div className="w-72 border-r flex-shrink-0 bg-white">
              <StepList
                steps={steps}
                selectedStepId={selectedStepId}
                onSelect={setSelectedStepId}
                onRemove={removeStep}
                onReorder={reorderSteps}
                onAddClick={handleAddClick}
                onInsertAfter={handleInsertAfter}
                onExecuteStep={handleExecuteStep}
                onUpdateStep={updateStep}
                stepStatuses={stepStatuses}
              />
            </div>

            {/* Right panel: Playwright recorder */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <PlaywrightRecorderPanel onActionSelect={addStep} />
            </div>
          </div>
        )}
      </div>

      {/* Manual step dialog */}
      {showManualDialog && (
        <ManualStepDialog
          onAdd={handleManualStepAdd}
          onClose={() => setShowManualDialog(false)}
        />
      )}
    </div>
  );
}
