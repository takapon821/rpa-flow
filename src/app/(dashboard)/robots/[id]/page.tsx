import { getDb } from "@/lib/db/client";
import { robots } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Clock } from "lucide-react";

interface FlowDef {
  nodes?: Array<{ id: string }>;
  edges?: Array<{ id: string }>;
}

interface Schedule {
  frequency?: string;
  time?: string;
  daysOfWeek?: string[];
}

export default async function RobotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getDb();
  const [robot] = await db
    .select()
    .from(robots)
    .where(and(eq(robots.id, id), eq(robots.ownerId, session.user.id)));

  if (!robot) notFound();

  const flow = (robot.flowDefinition ?? { nodes: [], edges: [] }) as FlowDef;
  const nodeCount = flow.nodes?.length ?? 0;
  const edgeCount = flow.edges?.length ?? 0;
  const schedule = robot.schedule as Schedule | null;

  const variables = robot.variables as Record<string, unknown> | null;

  const statusStyles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    active: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    archived: "bg-red-100 text-red-700",
  };

  const statusLabels: Record<string, string> = {
    draft: "下書き",
    active: "有効",
    paused: "一時停止",
    archived: "アーカイブ",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            href="/robots"
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} />
            ロボット一覧に戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{robot.name}</h1>
          <span
            className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-medium ${statusStyles[robot.status] ?? statusStyles.draft}`}
          >
            {statusLabels[robot.status] ?? robot.status}
          </span>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/robots/${robot.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Edit size={16} />
            編集
          </Link>
        </div>
      </div>

      {/* Description */}
      {robot.description && (
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">{robot.description}</p>
        </div>
      )}

      {/* Overview Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Flow Stats */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">
            フロー統計
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">ノード数</span>
              <span className="text-lg font-semibold text-gray-900">
                {nodeCount}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-3">
              <span className="text-sm text-gray-600">接続数</span>
              <span className="text-lg font-semibold text-gray-900">
                {edgeCount}
              </span>
            </div>
          </div>
        </div>

        {/* Schedule Info */}
        {schedule && (schedule.frequency || schedule.time) && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <Clock size={16} className="text-gray-900" />
              <h3 className="text-sm font-semibold text-gray-900">
                スケジュール
              </h3>
            </div>
            <div className="space-y-3">
              {schedule.frequency && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">頻度</span>
                  <span className="text-sm font-medium text-gray-900">
                    {schedule.frequency}
                  </span>
                </div>
              )}
              {schedule.time && (
                <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                  <span className="text-sm text-gray-600">実行時刻</span>
                  <span className="text-sm font-medium text-gray-900">
                    {schedule.time}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">タイムライン</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">作成日時</span>
            <span className="font-medium text-gray-900">
              {new Date(robot.createdAt).toLocaleString("ja-JP")}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-sm">
            <span className="text-gray-600">最終更新</span>
            <span className="font-medium text-gray-900">
              {new Date(robot.updatedAt).toLocaleString("ja-JP")}
            </span>
          </div>
        </div>
      </div>

      {/* Variables Info (if any) */}
      {variables && Object.keys(variables).length > 0 && (
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">変数</h3>
          <div className="space-y-2">
            {Object.entries(variables).map(([key, value]) => {
              const valueStr =
                typeof value === "string"
                  ? value
                  : JSON.stringify(value).slice(0, 50);
              return (
                <div
                  key={key}
                  className="flex items-start justify-between text-sm"
                >
                  <span className="font-mono text-gray-600">{key}</span>
                  <span className="font-mono text-gray-900">
                    {valueStr}
                    {valueStr.length > 50 ? "..." : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
