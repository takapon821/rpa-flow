import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { robots } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/robots/[id]
 * ロボット詳細情報を取得
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

  try {
    const db = getDb();
    const [robot] = await db
      .select()
      .from(robots)
      .where(and(eq(robots.id, id), eq(robots.ownerId, session.user.id)));

    if (!robot) {
      return NextResponse.json({ error: "Robot not found" }, { status: 404 });
    }

    return NextResponse.json(
      { robot, message: "Robot retrieved successfully" },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * PATCH /api/robots/[id]
 * ロボット情報を更新（flowDefinition, schedule, variables, status など）
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: Partial<typeof robots.$inferInsert>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  try {
    const db = getDb();

    // Verify ownership
    const [existingRobot] = await db
      .select()
      .from(robots)
      .where(and(eq(robots.id, id), eq(robots.ownerId, session.user.id)));

    if (!existingRobot) {
      return NextResponse.json({ error: "Robot not found" }, { status: 404 });
    }

    // Update robot (allow only specific fields)
    const updateData: Partial<typeof robots.$inferInsert> = {};
    if ("name" in body && typeof body.name === "string") {
      updateData.name = body.name;
    }
    if ("description" in body && typeof body.description === "string") {
      updateData.description = body.description;
    }
    if ("flowDefinition" in body) {
      updateData.flowDefinition = body.flowDefinition;
    }
    if ("variables" in body) {
      updateData.variables = body.variables;
    }
    if ("schedule" in body) {
      updateData.schedule = body.schedule;
    }
    if ("status" in body && typeof body.status === "string") {
      updateData.status = body.status;
    }

    const [updatedRobot] = await db
      .update(robots)
      .set(updateData)
      .where(eq(robots.id, id))
      .returning();

    return NextResponse.json(
      {
        robot: updatedRobot,
        message: "Robot updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * DELETE /api/robots/[id]
 * ロボットを削除
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const db = getDb();

    // Verify ownership
    const [existingRobot] = await db
      .select()
      .from(robots)
      .where(and(eq(robots.id, id), eq(robots.ownerId, session.user.id)));

    if (!existingRobot) {
      return NextResponse.json({ error: "Robot not found" }, { status: 404 });
    }

    // Delete robot (cascade will handle related records)
    await db.delete(robots).where(eq(robots.id, id));

    return NextResponse.json(
      { message: "Robot deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
