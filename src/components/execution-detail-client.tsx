'use client';

import { useExecutionStream } from '@/hooks/useExecutionStream';
import { useEffect, useState } from 'react';
import type { InferSelectModel } from 'drizzle-orm';
import type { executions, executionLogs, robots } from '@/lib/db/schema';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock, Loader2, RotateCcw, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getNodeTypeConfig } from '@/components/editor/node-types';

type Execution = InferSelectModel<typeof executions>;
type ExecutionLog = InferSelectModel<typeof executionLogs>;

interface ExecutionDetailClientProps {
  executionId: string;
  robotName: string | undefined;
  initialExecution: Execution;
  initialLogs: ExecutionLog[];
}

const stepStatusIcons: Record<
  string,
  { icon: typeof CheckCircle; color: string }
> = {
  running: { icon: Loader2, color: 'text-blue-500' },
  completed: { icon: CheckCircle, color: 'text-green-500' },
  failed: { icon: XCircle, color: 'text-red-500' },
  skipped: { icon: Clock, color: 'text-gray-400' },
};

export function ExecutionDetailClient({
  executionId,
  robotName,
  initialExecution,
  initialLogs,
}: ExecutionDetailClientProps) {
  const { execution, logs, isStreaming } = useExecutionStream(executionId);
  const [displayExecution, setDisplayExecution] = useState(initialExecution);
  const [displayLogs, setDisplayLogs] = useState(initialLogs);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const router = useRouter();

  // Update display data when stream updates
  useEffect(() => {
    if (execution) {
      setDisplayExecution(execution);
    }
  }, [execution]);

  useEffect(() => {
    if (logs.length > 0) {
      setDisplayLogs(logs);
    }
  }, [logs]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryError(null);
    try {
      const res = await fetch(`/api/executions/${executionId}/retry`, {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.json();
        setRetryError(error.error || 'Failed to retry execution');
        return;
      }

      const data = await res.json();
      router.push(`/executions/${data.execution.id}`);
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/executions/${executionId}/cancel`, {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.json();
        setCancelError(error.error || 'Failed to cancel execution');
        return;
      }

      // Refresh execution status
      const refreshRes = await fetch(`/api/executions/${executionId}`);
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setDisplayExecution(data.execution);
      }

      setShowCancelConfirm(false);
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/executions"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">実行詳細</h1>
          <p className="text-sm text-gray-500">
            {robotName ?? '不明なロボット'} &middot; {displayExecution.triggeredBy}
            {isStreaming && (
              <span className="ml-3 inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            )}
          </p>
        </div>
      </div>

      {/* Status summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard label="ステータス" value={displayExecution.status} />
        <InfoCard
          label="開始時刻"
          value={
            displayExecution.startedAt
              ? new Date(displayExecution.startedAt).toLocaleString('ja-JP')
              : '-'
          }
        />
        <InfoCard
          label="完了時刻"
          value={
            displayExecution.completedAt
              ? new Date(displayExecution.completedAt).toLocaleString('ja-JP')
              : '-'
          }
        />
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-2">
        {(displayExecution.status === 'failed' || displayExecution.status === 'cancelled') && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <RotateCcw size={16} />
            {isRetrying ? '再試行中...' : '再試行'}
          </button>
        )}
        {displayExecution.status === 'running' && (
          <>
            {showCancelConfirm ? (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <AlertCircle size={16} />
                  {isCancelling ? 'キャンセル中...' : 'キャンセルを確認'}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                >
                  キャンセルを中止
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <AlertCircle size={16} />
                キャンセル
              </button>
            )}
          </>
        )}
      </div>

      {/* Error messages */}
      {retryError && (
        <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-medium text-orange-800">再試行エラー</p>
          <p className="mt-1 text-sm text-orange-600">{retryError}</p>
        </div>
      )}
      {cancelError && (
        <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-medium text-orange-800">キャンセルエラー</p>
          <p className="mt-1 text-sm text-orange-600">{cancelError}</p>
        </div>
      )}

      {displayExecution.errorMessage && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">エラー</p>
          <p className="mt-1 text-sm text-red-600">
            {displayExecution.errorMessage}
          </p>
        </div>
      )}

      {/* Step timeline */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            ステップ ({displayLogs.length})
            {isStreaming && (
              <span className="ml-2 inline-block text-xs text-blue-600">
                更新中...
              </span>
            )}
          </h2>
        </div>
        {displayLogs.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">ステップログがありません。</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {displayLogs.map((log) => {
              const cfg = stepStatusIcons[log.status] ?? stepStatusIcons.running;
              const Icon = cfg.icon;
              const typeConfig = getNodeTypeConfig(log.actionType);
              const TypeIcon = typeConfig?.icon;

              return (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="mt-0.5">
                    <Icon size={16} className={cfg.color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {TypeIcon && (
                        <TypeIcon
                          size={14}
                          className={typeConfig?.color ?? 'text-gray-400'}
                        />
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {typeConfig?.label ?? log.actionType}
                      </span>
                      <span className="text-xs text-gray-400">
                        Step {log.stepOrder + 1}
                      </span>
                    </div>
                    {log.errorMessage && (
                      <p className="mt-1 text-xs text-red-500">
                        {log.errorMessage}
                      </p>
                    )}
                    {log.screenshotUrl && (
                      <a
                        href={log.screenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                      >
                        スクリーンショットを表示
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {log.completedAt
                      ? new Date(log.completedAt).toLocaleTimeString('ja-JP')
                      : '-'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
