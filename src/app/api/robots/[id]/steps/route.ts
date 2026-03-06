import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { robots, robotSteps } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { DbStep } from "@/lib/visualStepConverter";

/**
 * GET /api/robots/[id]/steps
 * ロボットのビジュアルステップをDB形式で取得する
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  try {
    // Robot ownership check
    const [robot] = await db
      .select()
      .from(robots)
      .where(and(eq(robots.id, id), eq(robots.ownerId, session.user.id)));

    if (!robot) {
      return NextResponse.json(
        { error: "Robot not found or not owned by user" },
        { status: 404 }
      );
    }

    // Fetch steps ordered by stepOrder
    const steps = await db
      .select()
      .from(robotSteps)
      .where(eq(robotSteps.robotId, id))
      .orderBy(asc(robotSteps.stepOrder));

    const dbSteps: DbStep[] = steps.map((step) => ({
      id: step.id,
      stepOrder: step.stepOrder,
      actionType: step.actionType,
      config: (step.config ?? {}) as Record<string, unknown>,
    }));

    return NextResponse.json({ steps: dbSteps });
  } catch (error) {
    console.error("[steps GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch steps" },
      { status: 500 }
    );
  }
}
