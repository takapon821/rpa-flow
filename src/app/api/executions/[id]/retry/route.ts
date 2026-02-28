import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { executions, robots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Get original execution
  const [execution] = await db
    .select()
    .from(executions)
    .where(eq(executions.id, id));

  if (!execution) {
    return NextResponse.json(
      { error: "Execution not found" },
      { status: 404 }
    );
  }

  // Check if status is "failed" or "cancelled"
  if (execution.status !== "failed" && execution.status !== "cancelled") {
    return NextResponse.json(
      { error: `Cannot retry execution with status "${execution.status}"` },
      { status: 400 }
    );
  }

  // Verify robot belongs to user
  const [robot] = await db
    .select({ ownerId: robots.ownerId })
    .from(robots)
    .where(eq(robots.id, execution.robotId));

  if (!robot || robot.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Create new execution with same robotId
  const [newExecution] = await db
    .insert(executions)
    .values({
      robotId: execution.robotId,
      triggeredBy: "manual",
      status: "queued",
    })
    .returning();

  // Trigger Inngest function for new execution
  await inngest.send({
    name: "robot/execute",
    data: { executionId: newExecution.id, robotId: execution.robotId },
  });

  return NextResponse.json(
    { execution: newExecution, retryOf: id },
    { status: 201 }
  );
}
