import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { robots } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/robots/[id]/duplicate
 * 既存のロボットを複製する
 */
export async function POST(
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
    // Get the original robot
    const [originalRobot] = await db
      .select()
      .from(robots)
      .where(and(eq(robots.id, id), eq(robots.ownerId, session.user.id)));

    if (!originalRobot) {
      return NextResponse.json(
        { error: "Robot not found" },
        { status: 404 }
      );
    }

    // Create a copy with "(コピー)" suffix
    const newRobotName = `${originalRobot.name} (コピー)`;

    const [duplicatedRobot] = await db
      .insert(robots)
      .values({
        name: newRobotName,
        description: originalRobot.description,
        ownerId: session.user.id,
        flowDefinition: originalRobot.flowDefinition,
        variables: originalRobot.variables,
        status: "draft",
      })
      .returning({
        id: robots.id,
        name: robots.name,
      });

    return NextResponse.json(
      {
        robot: duplicatedRobot,
        editorUrl: `/robots/${duplicatedRobot.id}/edit`,
        message: "Robot duplicated successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
