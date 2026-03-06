import { NextResponse, NextRequest } from "next/server";
import {
  verifyWebhookSignature,
  verifyWebhookTimestamp,
  extractWebhookHeaders,
} from "@/lib/webhooks/validate";

/**
 * POST /api/webhooks/test
 * 
 * Test endpoint to verify webhook signature validation
 * In production, this would be your actual webhook receiver
 */
export async function POST(req: NextRequest) {
  try {
    // Get raw body as string for signature verification
    const rawBody = await req.text();

    // Extract headers
    const headerRecord = Object.fromEntries(
      Array.from(req.headers.entries())
    );
    const { "x-webhook-event": event, "x-webhook-timestamp": timestamp, "x-webhook-signature": signature } =
      extractWebhookHeaders(headerRecord);

    // Validate headers present
    if (!event || !timestamp || !signature) {
      return NextResponse.json(
        { error: "Missing required webhook headers" },
        { status: 400 }
      );
    }

    // Validate timestamp (must be within 5 minutes)
    if (!verifyWebhookTimestamp(timestamp)) {
      return NextResponse.json(
        { error: "Webhook timestamp is outside acceptable window" },
        { status: 401 }
      );
    }

    // In production, you would look up the webhook in your database
    // and use its secret for verification. For testing, use test secret:
    const testSecret = "test-webhook-secret";

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature, testSecret)) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // Parse and process webhook payload
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // Log webhook reception
    console.log(`[WEBHOOK] Received ${event}:`, payload);

    // In production, process webhook here
    // e.g., update database, trigger jobs, etc.

    return NextResponse.json(
      {
        success: true,
        event,
        message: "Webhook processed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[WEBHOOK] Error processing test webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
