import { createHmac } from "crypto";
import { getDb } from "@/lib/db/client";
import { webhooks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export interface WebhookPayload {
  robotId: string;
  robotName: string;
  executionId: string;
  status: "completed" | "failed";
  startedAt: string; // ISO 8601
  finishedAt: string; // ISO 8601
  error?: string;
}

/**
 * Send webhook notifications to all active webhooks for the given event type
 */
export async function sendWebhookNotification(
  userId: string,
  eventType: "execution.completed" | "execution.failed",
  payload: WebhookPayload
): Promise<void> {
  const db = getDb();

  try {
    // Fetch all active webhooks for this user that include this event
    const userWebhooks = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.userId, userId),
          eq(webhooks.isActive, true)
        )
      );

    // Filter webhooks that have this event type
    const webhooksToNotify = userWebhooks.filter((wh) => {
      const events = Array.isArray(wh.events) ? wh.events : [];
      return events.includes(eventType);
    });

    if (webhooksToNotify.length === 0) {
      console.log(
        `[WEBHOOK] No active webhooks found for user ${userId} and event ${eventType}`
      );
      return;
    }

    // Send to each webhook
    const timestamp = new Date().toISOString();
    for (const webhook of webhooksToNotify) {
      try {
        const body = JSON.stringify(payload);

        // Generate HMAC-SHA256 signature
        const signature = createHmac("sha256", webhook.secret)
          .update(body)
          .digest("hex");

        // Send POST request with headers
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Event": eventType,
            "X-Webhook-Timestamp": timestamp,
            "X-Webhook-Signature": `sha256=${signature}`,
          },
          body,
        });

        if (!response.ok) {
          console.error(
            `[WEBHOOK] Failed to send webhook ${webhook.id}: ${response.status} ${await response.text()}`
          );
        } else {
          console.log(
            `[WEBHOOK] Successfully sent webhook ${webhook.id} for event ${eventType}`
          );
        }
      } catch (error) {
        // Log error but continue with next webhook
        console.error(
          `[WEBHOOK] Error sending webhook ${webhook.id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("[WEBHOOK] Error in sendWebhookNotification:", error);
    // Don't throw - webhook failure should not stop execution
  }
}
