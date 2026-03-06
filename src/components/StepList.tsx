'use client';

import { useState } from 'react';
import { VisualStep } from '@/hooks/useVisualEditor';
import {
  Trash2,
  ChevronUp,
  ChevronDown,
  Play,
  Plus,
  Check,
  X,
  AlertCircle,
  Loader2,
  Pencil,
} from 'lucide-react';

export type StepExecutionStatus = 'idle' | 'running' | 'success' | 'error';

interface StepListProps {
  steps: VisualStep[];
  selectedStepId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddClick: () => void;
  onInsertAfter: (afterId: string) => void;
  onExecuteStep?: (step: VisualStep) => void;
  onUpdateStep?: (id: string, updates: Partial<Omit<VisualStep, 'id'>>) => void;
  stepStatuses?: Record<string, StepExecutionStatus>;
}

const STEP_ICONS: Record<VisualStep['type'], string> = {
  navigate: '🌐',
  click: '👆',
  type: '⌨️',
  select: '📋',
  scroll: '📜',
  wait: '⏳',
};

const STEP_LABELS: Record<VisualStep['type'], string> = {
  navigate: 'URLを開く',
  click: 'クリック',
  type: 'テキスト入力',
  select: '選択',
  scroll: 'スクロール',
  wait: '待機',
};

function StatusIndicator({ status }: { status: StepExecutionStatus }) {
  switch (status) {
    case 'running':
      return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />;
    case 'success':
      return <Check className="w-3.5 h-3.5 text-green-500" />;
    case 'error':
      return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
    default:
      return null;
  }
}

function InlineEditForm({
  step,
  onSave,
  onCancel,
}: {
  step: VisualStep;
  onSave: (updates: Partial<Omit<VisualStep, 'id'>>) => void;
  onCancel: () => void;
}) {
  const [selector, setSelector] = useState(step.selector || '');
  const [value, setValue] = useState(step.value || '');
  const [url, setUrl] = useState(step.url || '');

  const needsSelector = step.type === 'click' || step.type === 'type' || step.type === 'select' || step.type === 'scroll';
  const needsUrl = step.type === 'navigate';
  const needsValue = step.type === 'type' || step.type === 'select' || step.type === 'wait';

  return (
    <div className="px-3 py-2 bg-blue-50 border-b space-y-2" onClick={(e) => e.stopPropagation()}>
      {needsUrl && (
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">URL</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}
      {needsSelector && (
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">セレクター</label>
          <input
            type="text"
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}
      {needsValue && (
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">
            {step.type === 'wait' ? 'タイムアウト (ms)' : '値'}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}
      <div className="flex gap-1 justify-end">
        <button
          onClick={() => {
            onSave({
              ...(needsSelector && { selector }),
              ...(needsValue && { value }),
              ...(needsUrl && { url }),
            });
          }}
          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
        >
          保存
        </button>
        <button
          onClick={onCancel}
          className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

function InsertPoint({ onClick }: { onClick: () => void }) {
  return (
    <div className="group relative h-0 flex items-center justify-center">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="absolute z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full shadow-sm hover:bg-blue-600"
        title="ここにステップを挿入"
      >
        <Plus size={12} />
      </button>
      <div className="absolute w-full border-t border-transparent group-hover:border-blue-300 transition-colors" />
    </div>
  );
}

export function StepList({
  steps,
  selectedStepId,
  onSelect,
  onRemove,
  onReorder,
  onAddClick,
  onInsertAfter,
  onExecuteStep,
  onUpdateStep,
  stepStatuses = {},
}: StepListProps) {
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  const getStepLabel = (step: VisualStep): string => {
    const baseLabel = STEP_LABELS[step.type] || step.type;
    if (step.description) {
      return step.description;
    }
    if (step.url) {
      return `${baseLabel} → ${step.url}`;
    }
    if (step.value) {
      return `${baseLabel} → "${step.value.substring(0, 30)}"`;
    }
    if (step.selector) {
      return `${baseLabel} → ${step.selector.substring(0, 30)}`;
    }
    return baseLabel;
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-white flex flex-col">
      {/* START node */}
      <div className="flex items-center gap-2 px-3 py-3 border-b cursor-default bg-gray-50 hover:bg-gray-50">
        <div className="text-base font-bold text-green-600">▶</div>
        <div className="flex-1 text-sm font-semibold text-gray-700">START</div>
      </div>

      {/* Step list */}
      {steps.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          ステップを追加してください
        </div>
      ) : (
        steps.map((step, index) => (
          <div key={step.id}>
            {/* Insert point above each step */}
            {index === 0 && (
              <InsertPoint onClick={() => {
                // Insert before first = insert after START (no afterId needed, use addStep at index 0)
                // We'll handle this by using a special callback
                onInsertAfter('__start__');
              }} />
            )}

            <div
              onClick={() => onSelect(step.id)}
              className={`flex items-center gap-2 px-3 py-2 border-b cursor-pointer transition ${
                selectedStepId === step.id
                  ? 'bg-blue-50 border-l-4 border-l-blue-500'
                  : 'bg-white hover:bg-gray-50'
              } ${stepStatuses[step.id] === 'running' ? 'ring-1 ring-blue-400' : ''}`}
            >
              {/* Step number + icon */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs text-gray-500 font-medium w-5 text-right">
                  {index + 1}
                </span>
                <span className="text-lg">{STEP_ICONS[step.type]}</span>
              </div>

              {/* Step description */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-900 truncate">
                  {getStepLabel(step)}
                </div>
              </div>

              {/* Status indicator */}
              <StatusIndicator status={stepStatuses[step.id] || 'idle'} />

              {/* Action buttons */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {/* Execute button */}
                {onExecuteStep && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExecuteStep(step);
                    }}
                    disabled={stepStatuses[step.id] === 'running'}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30"
                    title="このステップを実行"
                  >
                    <Play size={14} />
                  </button>
                )}

                {/* Edit button */}
                {onUpdateStep && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingStepId(editingStepId === step.id ? null : step.id);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                    title="編集"
                  >
                    <Pencil size={14} />
                  </button>
                )}

                {/* Move up */}
                {index > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorder(index, index - 1);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                    title="上に移動"
                  >
                    <ChevronUp size={16} />
                  </button>
                )}

                {/* Move down */}
                {index < steps.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorder(index, index + 1);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                    title="下に移動"
                  >
                    <ChevronDown size={16} />
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(step.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="削除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Inline edit form */}
            {editingStepId === step.id && onUpdateStep && (
              <InlineEditForm
                step={step}
                onSave={(updates) => {
                  onUpdateStep(step.id, updates);
                  setEditingStepId(null);
                }}
                onCancel={() => setEditingStepId(null)}
              />
            )}

            {/* Insert point after each step */}
            <InsertPoint onClick={() => onInsertAfter(step.id)} />
          </div>
        ))
      )}

      {/* Add step button */}
      <button
        onClick={onAddClick}
        className="flex items-center justify-center gap-1.5 px-3 py-3 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100 transition font-medium"
      >
        <Plus size={16} />
        ステップを追加
      </button>
    </div>
  );
}
