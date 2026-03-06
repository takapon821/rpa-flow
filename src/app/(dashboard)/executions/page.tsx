'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Ban,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { InferSelectModel } from "drizzle-orm";
import type { executions } from "@/lib/db/schema";

type Execution = InferSelectModel<typeof executions> & { robotName: string };

const statusConfig: Record<
  string,
  { icon: typeof CheckCircle; color: string; label: string }
> = {
  queued: { icon: Clock, color: "text-gray-500", label: "待機中" },
  running: { icon: Loader2, color: "text-blue-500", label: "実行中" },
  completed: { icon: CheckCircle, color: "text-green-500", label: "成功" },
  failed: { icon: XCircle, color: "text-red-500", label: "失敗" },
  cancelled: { icon: Ban, color: "text-gray-400", label: "キャンセル" },
};

const PAGE_SIZE = 20;

export default function ExecutionsPage() {
  const [results, setResults] = useState<Execution[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExecutions = async () => {
      setIsLoading(true);
      try {
        const offset = (currentPage - 1) * PAGE_SIZE;
        const res = await fetch(
          `/api/executions?limit=${PAGE_SIZE}&offset=${offset}`
        );
        if (!res.ok) return;

        const data = (await res.json()) as {
          executions: Execution[];
          total: number;
        };
        setResults(data.executions);
        setTotalCount(data.total);
      } catch {
        // Error fetching executions
      } finally {
        setIsLoading(false);
      }
    };

    fetchExecutions();
  }, [currentPage]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">実行履歴</h1>
        <p className="text-sm text-gray-500">全 {totalCount} 件</p>
      </div>

      {results.length === 0 && !isLoading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <Play className="mx-auto mb-4 text-gray-400" size={48} />
          <h2 className="mb-2 text-lg font-medium text-gray-900">
            実行履歴がありません
          </h2>
          <p className="text-sm text-gray-500">
            ロボットを実行すると、ここに履歴が表示されます。
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    ステータス
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    ロボット
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    トリガー
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    開始
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    完了
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center text-sm text-gray-500">
                      読み込み中...
                    </td>
                  </tr>
                ) : (
                  results.map((exec) => {
                    const cfg =
                      statusConfig[exec.status] ?? statusConfig.queued;
                    const Icon = cfg.icon;
                    return (
                      <tr key={exec.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3">
                          <Link
                            href={`/executions/${exec.id}`}
                            className="flex items-center gap-2"
                          >
                            <Icon size={16} className={cfg.color} />
                            <span className={`text-sm font-medium ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                          {(exec as any).robotName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {exec.triggeredBy}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {exec.startedAt
                            ? new Date(exec.startedAt).toLocaleString("ja-JP")
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {exec.completedAt
                            ? new Date(exec.completedAt).toLocaleString(
                                "ja-JP"
                              )
                            : "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (page) =>
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1
                )
                .map((page, idx, arr) => (
                  <div key={page}>
                    {idx > 0 && arr[idx - 1] !== page - 1 && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                ))}

              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
