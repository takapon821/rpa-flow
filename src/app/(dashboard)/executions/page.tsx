import { getDb } from "@/lib/db/client";
import { executions, robots } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Ban,
  Play,
} from "lucide-react";

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

export default async function ExecutionsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getDb();
  const results = await db
    .select({
      id: executions.id,
      robotName: robots.name,
      triggeredBy: executions.triggeredBy,
      status: executions.status,
      startedAt: executions.startedAt,
      completedAt: executions.completedAt,
      errorMessage: executions.errorMessage,
      createdAt: executions.createdAt,
    })
    .from(executions)
    .innerJoin(robots, eq(executions.robotId, robots.id))
    .where(eq(robots.ownerId, session.user.id))
    .orderBy(desc(executions.createdAt))
    .limit(50);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">実行履歴</h1>
      </div>

      {results.length === 0 ? (
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
              {results.map((exec) => {
                const cfg = statusConfig[exec.status] ?? statusConfig.queued;
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
                      {exec.robotName}
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
                        ? new Date(exec.completedAt).toLocaleString("ja-JP")
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
