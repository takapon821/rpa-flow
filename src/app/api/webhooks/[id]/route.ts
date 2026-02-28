import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { webhooks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface UpdateWebhookRequest {
  url?: string;
  events?: string[];
  isActive?: boolean;
  label?: string;
}

interface WebhookResponse {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

// PATCH /api/webhooks/[id] — Update a webhook
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await req.json()) as UpdateWebhookRequest;

    const db = getDb();

    // Fetch webhook and verify ownership
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(
        and(eq(webhooks.id, id), eq(webhooks.userId, session.user.id))
      );

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (body.url !== undefined) {
      if (typeof body.url !== "string" || body.url.length === 0) {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
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
      updateData.url = body.url;
    }

    if (body.events !== undefined) {
      if (!Array.isArray(body.events) || body.events.length === 0) {
        return NextResponse.json(
          { error: "At least one event must be selected" },
          { status: 400 }
        );
      }
      updateData.events = body.events;
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json(
          { error: "isActive must be boolean" },
          { status: 400 }
        );
      }
      updateData.isActive = body.isActive;
    }

    // If no updates, return current webhook
    if (Object.keys(updateData).length === 0) {
      const response: WebhookResponse = {
        id: webhook.id,
        url: webhook.url,
        events: Array.isArray(webhook.events) ? webhook.events : [],
        isActive: webhook.isActive,
        createdAt: webhook.createdAt.toISOString(),
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Update webhook
    const [updated] = await db
      .update(webhooks)
      .set(updateData)
      .where(eq(webhooks.id, id))
      .returning();

    const response: WebhookResponse = {
      id: updated.id,
      url: updated.url,
      events: Array.isArray(updated.events) ? updated.events : [],
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[WEBHOOK] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update webhook" },
      { status: 500 }
    );
  }
}

// DELETE /api/webhooks/[id] — Delete a webhook
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const db = getDb();

    // Fetch webhook and verify ownership
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(
        and(eq(webhooks.id, id), eq(webhooks.userId, session.user.id))
      );

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    // Delete webhook
    await db.delete(webhooks).where(eq(webhooks.id, id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[WEBHOOK] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 }
    );
  }
}
