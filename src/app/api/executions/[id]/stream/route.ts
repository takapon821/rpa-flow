import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: executionId } = await params;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      // If Redis is configured, subscribe for updates
      if (
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        // Poll Redis for status updates (SSE via polling since Upstash HTTP doesn't support true pub/sub)
        const interval = setInterval(async () => {
          try {
            const status = await redis.get<string>(
              `execution:${executionId}:status`
            );
            const steps = await redis.lrange(
              `execution:${executionId}:steps`,
              0,
              -1
            );

            if (status) {
              send("status", { executionId, status, steps });
            }

            if (status === "completed" || status === "failed") {
              clearInterval(interval);
              send("done", { executionId, status });
              controller.close();
            }
          } catch {
            // Continue polling
          }
        }, 2000);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(interval);
          controller.close();
        }, 300_000);
      } else {
        // No Redis: send a simple polling hint
        send("info", { message: "Redis not configured, use polling" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
