import Link from "next/link";
import { Plus, Bot } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { robots } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";
import { DeleteRobotButton } from "./delete-button";
import { DuplicateRobotButton } from "./duplicate-button";

export default async function RobotsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getDb();
  const userRobots = await db
    .select()
    .from(robots)
    .where(eq(robots.ownerId, session.user.id))
    .orderBy(desc(robots.updatedAt));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ロボット</h1>
        <Link
          href="/robots/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <Plus size={16} />
          新規作成
        </Link>
      </div>

      {userRobots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <Bot className="mx-auto mb-4 text-gray-400" size={48} />
          <h2 className="mb-2 text-lg font-medium text-gray-900">
            ロボットがありません
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            最初のロボットを作成して自動化を始めましょう。
          </p>
          <Link
            href="/robots/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Plus size={16} />
            ロボットを作成
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userRobots.map((robot) => (
            <div
              key={robot.id}
              className="group relative rounded-lg border border-gray-200 bg-white p-5 transition hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between">
                <Link
                  href={`/robots/${robot.id}/edit`}
                  className="text-base font-semibold text-gray-900 hover:text-blue-600"
                >
                  {robot.name}
                </Link>
                <StatusBadge status={robot.status} />
              </div>
              {robot.description && (
                <p className="mb-4 line-clamp-2 text-sm text-gray-500">
                  {robot.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  更新: {new Date(robot.updatedAt).toLocaleDateString("ja-JP")}
                </span>
                <div className="flex gap-2">
                  <Link
                    href={`/robots/${robot.id}/edit`}
                    className="rounded px-2 py-1 text-blue-600 hover:bg-blue-50"
                  >
                    編集
                  </Link>
                  <DuplicateRobotButton robotId={robot.id} />
                  <DeleteRobotButton robotId={robot.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    active: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    archived: "bg-red-100 text-red-600",
  };

  const labels: Record<string, string> = {
    draft: "下書き",
    active: "有効",
    paused: "一時停止",
    archived: "アーカイブ",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.draft}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
