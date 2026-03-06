import { createHmac, timingSafeEqual } from "crypto";

export interface WebhookHeaders {
  "x-webhook-event"?: string;
  "x-webhook-timestamp"?: string;
  "x-webhook-signature"?: string;
}

/**
 * Verify webhook signature using constant-time comparison
 * 
 * @param payload Raw request body as string
 * @param signature Signature from X-Webhook-Signature header (e.g., "sha256=...")
 * @param secret Webhook secret from database
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    if (!signature || !secret) {
      console.warn("[WEBHOOK] Missing signature or secret");
      return false;
    }

    // Extract algorithm and hash from header (e.g., "sha256=abc123...")
    const [algo, hash] = signature.split("=");
    if (algo !== "sha256" || !hash) {
      console.warn("[WEBHOOK] Invalid signature format");
      return false;
    }

    // Generate expected signature
    const expectedSignature = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    try {
      return timingSafeEqual(
        Buffer.from(hash, "hex"),
        Buffer.from(expectedSignature, "hex")
      );
    } catch {
      // Buffers have different lengths
      return false;
    }
  } catch (error) {
    console.error("[WEBHOOK] Error verifying signature:", error);
    return false;
  }
}

/**
 * Verify webhook timestamp is within acceptable window (5 minutes)
 * Prevents replay attacks
 * 
 * @param timestamp ISO 8601 timestamp from X-Webhook-Timestamp header
 * @param maxAgeSeconds Maximum age of webhook in seconds (default: 300 = 5 minutes)
 * @returns true if timestamp is recent, false otherwise
 */
export function verifyWebhookTimestamp(
  timestamp: string,
  maxAgeSeconds: number = 300
): boolean {
  try {
    const webhookTime = new Date(timestamp).getTime();
    const now = Date.now();
    const ageSeconds = (now - webhookTime) / 1000;

    if (ageSeconds < 0) {
      console.warn("[WEBHOOK] Timestamp is in the future");
      return false;
    }

    if (ageSeconds > maxAgeSeconds) {
      console.warn(
        `[WEBHOOK] Timestamp is too old: ${ageSeconds}s > ${maxAgeSeconds}s`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("[WEBHOOK] Error verifying timestamp:", error);
    return false;
  }
}

/**
 * Extract webhook headers from Next.js request headers
 */
export function extractWebhookHeaders(
  headers: Record<string, string | string[] | undefined>
): WebhookHeaders {
  return {
    "x-webhook-event": Array.isArray(headers["x-webhook-event"])
      ? headers["x-webhook-event"][0]
      : (headers["x-webhook-event"] as string | undefined),
    "x-webhook-timestamp": Array.isArray(headers["x-webhook-timestamp"])
      ? headers["x-webhook-timestamp"][0]
      : (headers["x-webhook-timestamp"] as string | undefined),
    "x-webhook-signature": Array.isArray(headers["x-webhook-signature"])
      ? headers["x-webhook-signature"][0]
      : (headers["x-webhook-signature"] as string | undefined),
  };
}
