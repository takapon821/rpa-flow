import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { robots } from "@/lib/db/schema";
import { getTemplateById } from "@/lib/templates/robot-templates";

interface CreateFromTemplateRequest {
  templateId: string;
  name?: string;
}

/**
 * POST /api/robots/from-template
 * テンプレートから新規ロボットを作成
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateFromTemplateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate request
  if (!body.templateId || typeof body.templateId !== "string") {
    return NextResponse.json(
      { error: "templateId is required" },
      { status: 400 }
    );
  }

  // Get template
  const template = getTemplateById(body.templateId);
  if (!template) {
    return NextResponse.json(
      { error: "Template not found" },
      { status: 404 }
    );
  }

  // Use provided name or default to template name
  const robotName = body.name?.trim() || template.name;

  try {
    const db = getDb();
    const [newRobot] = await db
      .insert(robots)
      .values({
        name: robotName,
        description: template.description,
        ownerId: session.user.id,
        flowDefinition: template.flowDefinition,
        variables: template.variables,
        status: "draft",
      })
      .returning({
        id: robots.id,
        name: robots.name,
      });

    return NextResponse.json(
      {
        robot: newRobot,
        editorUrl: `/robots/${newRobot.id}/edit`,
        message: "Robot created from template successfully",
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
