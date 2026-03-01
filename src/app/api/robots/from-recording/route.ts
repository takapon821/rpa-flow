import { NextResponse, NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { robots, robotSteps, apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

interface RecordedAction {
  type: "click" | "type" | "navigate" | "select" | "scroll";
  selector?: string;
  value?: string;
  url?: string;
  x?: number;
  y?: number;
  timestamp: number;
}

interface FromRecordingRequest {
  name: string;
  actions: RecordedAction[];
}

interface StepConfig {
  [key: string]: unknown;
}

/**
 * Convert RecordedAction to FlowStep config
 */
function actionToConfig(action: RecordedAction): StepConfig {
  switch (action.type) {
    case "navigate":
      return {
        url: action.url || "",
        description: `${action.url} に移動`,
      };
    case "click":
      return {
        selector: action.selector || "",
        description: `${action.selector} をクリック`,
      };
    case "type":
      return {
        selector: action.selector || "",
        value: action.value || "",
        description: `${action.selector} に入力: "${action.value}"`,
      };
    case "select":
      return {
        selector: action.selector || "",
        value: action.value || "",
        description: `${action.selector} で "${action.value}" を選択`,
      };
    case "scroll":
      return {
        description: "スクロール",
      };
    default:
      return {
        description: String(action.type),
      };
  }
}

/**
 * POST /api/robots/from-recording
 * Chrome拡張機能で録画した操作をロボットにインポート
 */
export async function POST(req: NextRequest) {
  const db = getDb();
  let userId: string | null = null;

  // APIキー認証
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

  // Check if user is authenticated
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  let body: FromRecordingRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate request
  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json(
      { error: "name is required and must be a string" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.actions)) {
    return NextResponse.json(
      { error: "actions must be an array" },
      { status: 400 }
    );
  }

  if (body.actions.length === 0) {
    return NextResponse.json(
      { error: "actions array cannot be empty" },
      { status: 400 }
    );
  }

  if (body.actions.length > 100) {
    return NextResponse.json(
      { error: "actions array cannot exceed 100 items" },
      { status: 400 }
    );
  }

  try {
    // Create robot
    const [newRobot] = await db
      .insert(robots)
      .values({
        name: body.name.trim(),
        description: `Imported from Chrome recording at ${new Date().toISOString()}`,
        ownerId: userId,
        flowDefinition: {},
        status: "draft",
      })
      .returning({
        id: robots.id,
        name: robots.name,
      });

    // Create robot steps
    const stepsToInsert = body.actions.map((action, index) => ({
      robotId: newRobot.id,
      stepOrder: index,
      actionType: action.type,
      config: actionToConfig(action),
    }));

    await db.insert(robotSteps).values(stepsToInsert);

    return NextResponse.json(
      {
        robotId: newRobot.id,
        name: newRobot.name,
        stepsCount: body.actions.length,
        editorUrl: `/robots/${newRobot.id}/edit`,
        message: "Robot created from recording successfully",
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
