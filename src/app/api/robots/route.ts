import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { robots } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/robots
 * ユーザーのロボット一覧を取得
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const userRobots = await db
      .select()
      .from(robots)
      .where(eq(robots.ownerId, session.user.id))
      .orderBy(desc(robots.updatedAt));

    return NextResponse.json(
      { robots: userRobots, message: "Robots retrieved successfully" },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * POST /api/robots
 * 新規ロボットを作成（空のロボット）
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name: string;
    description?: string;
    flowDefinition?: Record<string, unknown>;
    variables?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate name
  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json(
      { error: "name is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  try {
    const db = getDb();
    const [newRobot] = await db
      .insert(robots)
      .values({
        name: body.name.trim(),
        description: body.description?.trim() || null,
        ownerId: session.user.id,
        flowDefinition: body.flowDefinition || { nodes: [], edges: [] },
        variables: body.variables || {},
        status: "draft",
      })
      .returning();

    return NextResponse.json(
      {
        robot: newRobot,
        editorUrl: `/robots/${newRobot.id}/edit`,
        message: "Robot created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
