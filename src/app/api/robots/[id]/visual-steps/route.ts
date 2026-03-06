import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { robots, robotSteps } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { VisualStep } from "@/hooks/useVisualEditor";
import { visualStepToDbStep } from "@/lib/visualStepConverter";

/**
 * PUT /api/robots/[id]/visual-steps
 * ビジュアルエディタのステップをDBに保存する
 */
export async function PUT(
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

    // Parse request body
    const { steps } = await req.json();
    if (!Array.isArray(steps)) {
      return NextResponse.json(
        { error: "Invalid steps format" },
        { status: 400 }
      );
    }

    // Delete existing steps for this robot
    await db
      .delete(robotSteps)
      .where(eq(robotSteps.robotId, id));

    // Insert new steps
    if (steps.length > 0) {
      const dbStepsValues = (steps as VisualStep[]).map((step, index) =>
        ({
          robotId: id,
          ...visualStepToDbStep(step, index),
        })
      );

      await db.insert(robotSteps).values(dbStepsValues);
    }

    return NextResponse.json({
      ok: true,
      stepsCount: steps.length,
    });
  } catch (error) {
    console.error("[visual-steps PUT]", error);
    return NextResponse.json(
      { error: "Failed to save visual steps" },
      { status: 500 }
    );
  }
}
