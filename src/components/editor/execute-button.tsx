"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";

export function ExecuteButton({ robotId }: { robotId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    executionId?: string;
  } | null>(null);

  const handleExecute = async () => {
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch("/api/executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ robotId }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setResult({
          status: "started",
          executionId: data.execution?.id,
        });
      } else {
        setResult({ status: "error" });
      }
    } catch {
      setResult({ status: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExecute}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
        {loading ? "実行中..." : "実行"}
      </button>
      {result?.status === "started" && result.executionId && (
        <a
          href={`/executions/${result.executionId}`}
          className="text-xs text-blue-600 hover:underline"
        >
          実行詳細を見る
        </a>
      )}
    </div>
  );
}
