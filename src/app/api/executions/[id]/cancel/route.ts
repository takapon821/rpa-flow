import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { executions, robots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

  // Get execution
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

  // Check if status is "running"
  if (execution.status !== "running") {
    return NextResponse.json(
      { error: `Cannot cancel execution with status "${execution.status}"` },
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

  const workerUrl = process.env.WORKER_URL || "http://localhost:3001";
  const workerSecret = process.env.WORKER_SECRET || "";

  let workerCancelSuccess = false;

  try {
    // Try to cancel on Worker
    const resp = await fetch(`${workerUrl}/cancel/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${workerSecret}`,
      },
    });

    if (resp.ok) {
      workerCancelSuccess = true;
    }
  } catch (error) {
    // Log error but continue - we still update DB status
    console.error(`[CANCEL] Worker communication failed for execution ${id}:`, error);
  }

  // Update DB status to "cancelled" regardless of Worker response
  await db
    .update(executions)
    .set({ status: "cancelled", completedAt: new Date() })
    .where(eq(executions.id, id));

  return NextResponse.json(
    {
      executionId: id,
      status: "cancelled",
      workerCancelSuccess,
      message: workerCancelSuccess
        ? "Execution cancelled successfully"
        : "Execution marked as cancelled (Worker communication failed)",
    },
    { status: 200 }
  );
}
