import { getDb } from "@/lib/db/client";
import { robots } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FlowEditor } from "@/components/editor/flow-editor";
import { SchedulePanel } from "@/components/editor/schedule-panel";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";
import { ExecuteButton } from "@/components/editor/execute-button";

interface FlowDef {
  nodes?: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
  edges?: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
  }>;
}

export default async function EditRobotPage({
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

  const initialNodes: Node[] = (flow.nodes || []).map((n) => ({
    id: n.id,
    type: "actionNode",
    position: n.position,
    data: n.data,
  }));

  const initialEdges: Edge[] = (flow.edges || []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
  }));

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
        <Link
          href="/robots"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-semibold text-gray-900">{robot.name}</h1>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          {robot.status}
        </span>
        <div className="ml-auto">
          <ExecuteButton robotId={robot.id} />
        </div>
      </div>
      <div className="flex flex-1 gap-4 overflow-hidden bg-gray-50 p-4">
        {/* Main Editor */}
        <div className="flex-1 overflow-hidden">
          <FlowEditor
            robotId={robot.id}
            initialNodes={initialNodes}
            initialEdges={initialEdges}
          />
        </div>
        {/* Right Sidebar */}
        <div className="w-80 overflow-y-auto">
          <SchedulePanel
            robotId={robot.id}
            schedule={robot.schedule as any}
          />
        </div>
      </div>
    </div>
  );
}
