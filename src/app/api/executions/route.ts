import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { executions, robots, apiKeys } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { createHash } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const results = await db
    .select({
      id: executions.id,
      robotId: executions.robotId,
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

  return NextResponse.json({ executions: results });
}

// POST: Trigger manual execution (with session or API key auth)
export async function POST(req: NextRequest) {
  const db = getDb();
  let userId: string | null = null;

  // Try session authentication first
  const session = await auth();
  if (session?.user?.id) {
    userId = session.user.id;
  } else {
    // Try API key authentication as fallback
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const plainKey = authHeader.substring(7);
      const keyHash = createHash("sha256").update(plainKey).digest("hex");

      const [keyRecord] = await db
        .select({ userId: apiKeys.userId, id: apiKeys.id })
        .from(apiKeys)
        .where(eq(apiKeys.keyHash, keyHash));

      if (keyRecord) {
        userId = keyRecord.userId;

        // Update lastUsedAt
        await db
          .update(apiKeys)
          .set({ lastUsedAt: new Date() })
          .where(eq(apiKeys.id, keyRecord.id));
      }
    }
  }

  // Check if user is authenticated
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { robotId } = (await req.json()) as { robotId: string };
  if (!robotId) {
    return NextResponse.json(
      { error: "robotId is required" },
      { status: 400 }
    );
  }

  // Verify robot belongs to user
  const [robot] = await db
    .select({ id: robots.id })
    .from(robots)
    .where(eq(robots.id, robotId));
  if (!robot) {
    return NextResponse.json({ error: "Robot not found" }, { status: 404 });
  }

  // Create execution record
  const [execution] = await db
    .insert(executions)
    .values({
      robotId,
      triggeredBy: "api",
      status: "queued",
    })
    .returning();

  // Trigger Inngest function
  await inngest.send({
    name: "robot/execute",
    data: { executionId: execution.id, robotId },
  });

  return NextResponse.json({ execution }, { status: 201 });
}
