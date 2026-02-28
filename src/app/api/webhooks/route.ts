import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { webhooks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

interface WebhookConfig {
  label?: string;
}

interface CreateWebhookRequest {
  url: string;
  events: string[]; // e.g., ["execution.completed", "execution.failed"]
  label?: string;
}

interface WebhookResponse {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  label?: string;
  createdAt: string;
  secret?: string; // Only in creation response
}

// GET /api/webhooks — List all webhooks for the authenticated user
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  try {
    const userWebhooks = await db
      .select({
        id: webhooks.id,
        url: webhooks.url,
        events: webhooks.events,
        isActive: webhooks.isActive,
        createdAt: webhooks.createdAt,
      })
      .from(webhooks)
      .where(eq(webhooks.userId, session.user.id));

    const response: WebhookResponse[] = userWebhooks.map((wh) => ({
      id: wh.id,
      url: wh.url,
      events: Array.isArray(wh.events) ? wh.events : [],
      isActive: wh.isActive,
      createdAt: wh.createdAt.toISOString(),
    }));

    return NextResponse.json({ webhooks: response }, { status: 200 });
  } catch (error) {
    console.error("[WEBHOOK] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
      { status: 500 }
    );
  }
}

// POST /api/webhooks — Create a new webhook
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as CreateWebhookRequest;

    // Validation
    if (!body.url || typeof body.url !== "string") {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json(
        { error: "At least one event must be selected" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Generate secret
    const secret = randomBytes(32).toString("hex");

    const db = getDb();

    // Insert webhook
    const [newWebhook] = await db
      .insert(webhooks)
      .values({
        userId: session.user.id,
        url: body.url,
        secret: secret,
        events: body.events,
        isActive: true,
      })
      .returning();

    const response: WebhookResponse = {
      id: newWebhook.id,
      url: newWebhook.url,
      events: Array.isArray(newWebhook.events) ? newWebhook.events : [],
      isActive: newWebhook.isActive,
      createdAt: newWebhook.createdAt.toISOString(),
      secret: secret, // Only returned on creation
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("[WEBHOOK] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 }
    );
  }
}
