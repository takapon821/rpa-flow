"use client";

import { useEffect, useState } from "react";
import { Bot, Play, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";

interface DashboardStats {
  totalRobots: number;
  todayExecutions: number;
  successRate: number;
  failedCount: number;
  recentExecutions: RecentExecution[];
  weeklyChart: ChartData[];
}

interface RecentExecution {
  id: string;
  robotName: string;
  status: string;
  startedAt: string | null;
  duration: number | null;
}

interface ChartData {
  date: string;
  count: number;
  success: number;
  failed: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/dashboard/stats");
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard stats");
        }
        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      label: "ロボット数",
      value: stats?.totalRobots ?? 0,
      icon: Bot,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "今日の実行",
      value: stats?.todayExecutions ?? 0,
      icon: Play,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "成功率",
      value: `${stats?.successRate ?? 0}%`,
      icon: CheckCircle,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "失敗",
      value: stats?.failedCount ?? 0,
      icon: AlertCircle,
      color: "text-red-600 bg-red-50",
    },
  ];

  if (error) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">エラー: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">ダッシュボード</h1>

      {isLoading ? (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg border border-gray-200 bg-white p-5 animate-pulse"
            >
              <div className="h-full bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-lg border border-gray-200 bg-white p-5"
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${color}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Weekly Chart */}
      {stats && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <TrendingUp size={20} />
            過去7日の実行数
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-gray-600">日付</th>
                  <th className="px-4 py-2 text-right text-gray-600">実行数</th>
                  <th className="px-4 py-2 text-right text-gray-600">成功</th>
                  <th className="px-4 py-2 text-right text-gray-600">失敗</th>
                </tr>
              </thead>
              <tbody>
                {stats.weeklyChart.map((row) => (
                  <tr key={row.date} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">{row.date}</td>
                    <td className="px-4 py-2 text-right text-gray-900 font-medium">
                      {row.count}
                    </td>
                    <td className="px-4 py-2 text-right text-emerald-600 font-medium">
                      {row.success}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600 font-medium">
                      {row.failed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Executions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          最近の実行
        </h2>
        {isLoading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : stats && stats.recentExecutions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-gray-600">ロボット名</th>
                  <th className="px-4 py-2 text-left text-gray-600">ステータス</th>
                  <th className="px-4 py-2 text-left text-gray-600">開始時刻</th>
                  <th className="px-4 py-2 text-left text-gray-600">実行時間</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentExecutions.map((exec) => (
                  <tr key={exec.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">{exec.robotName}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          exec.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : exec.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {exec.status === "completed"
                          ? "完了"
                          : exec.status === "failed"
                          ? "失敗"
                          : exec.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {exec.startedAt
                        ? new Date(exec.startedAt).toLocaleString("ja-JP")
                        : "-"}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {exec.duration
                        ? `${Math.round(exec.duration / 1000)}秒`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">まだ実行履歴がありません。</p>
        )}
      </div>
    </div>
  );
}
