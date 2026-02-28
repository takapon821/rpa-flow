'use client';

import { useEffect, useState } from 'react';
import type { InferSelectModel } from 'drizzle-orm';
import type { executions, executionLogs } from '@/lib/db/schema';

type Execution = InferSelectModel<typeof executions>;
type ExecutionLog = InferSelectModel<typeof executionLogs>;

interface ExecutionStreamData {
  execution: Execution | null;
  logs: ExecutionLog[];
  isStreaming: boolean;
  error: string | null;
}

export function useExecutionStream(executionId: string): ExecutionStreamData {
  const [data, setData] = useState<ExecutionStreamData>({
    execution: null,
    logs: [],
    isStreaming: false,
    error: null,
  });

  useEffect(() => {
    if (!executionId) return;

    setData((prev) => ({ ...prev, isStreaming: true, error: null }));

    const eventSource = new EventSource(
      `/api/executions/${executionId}/stream`
    );

    eventSource.addEventListener('status', (event: Event) => {
      try {
        const customEvent = event as MessageEvent;
        const payload = JSON.parse(customEvent.data);

        // Fetch the latest execution and logs when we receive a status update
        const fetchExecutionData = async () => {
          try {
            const response = await fetch(
              `/api/executions/${executionId}`
            );
            if (!response.ok) return;

            const result = await response.json() as { execution: Execution; logs: ExecutionLog[] };
            setData((prev) => ({
              ...prev,
              execution: result.execution,
              logs: result.logs,
            }));
          } catch {
            // Continue with previous state
          }
        };

        // Small delay to ensure server has persisted changes
        setTimeout(fetchExecutionData, 100);
      } catch {
        setData((prev) => ({
          ...prev,
          error: 'ストリームデータの解析に失敗しました',
        }));
      }
    });

    eventSource.addEventListener('done', (event: Event) => {
      try {
        const customEvent = event as MessageEvent;
        const payload = JSON.parse(customEvent.data);

        // Final fetch for complete data
        const fetchFinalData = async () => {
          try {
            const response = await fetch(
              `/api/executions/${executionId}`
            );
            if (!response.ok) return;

            const result = await response.json() as { execution: Execution; logs: ExecutionLog[] };
            setData((prev) => ({
              ...prev,
              execution: result.execution,
              logs: result.logs,
              isStreaming: false,
            }));
          } catch {
            setData((prev) => ({ ...prev, isStreaming: false }));
          }
        };

        fetchFinalData();
        eventSource.close();
      } catch {
        setData((prev) => ({ ...prev, isStreaming: false }));
        eventSource.close();
      }
    });

    eventSource.addEventListener('error', () => {
      setData((prev) => ({
        ...prev,
        isStreaming: false,
        error: 'ストリーム接続エラー',
      }));
      eventSource.close();
    });

    // Cleanup on unmount
    return () => {
      eventSource.close();
      setData((prev) => ({ ...prev, isStreaming: false }));
    };
  }, [executionId]);

  return data;
}
