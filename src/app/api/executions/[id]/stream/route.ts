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
        // No Redis: fall back to database polling
        const { getDb } = await import("@/lib/db/client");
        const { executions } = await import("@/lib/db/schema");
        const { eq } = await import("drizzle-orm");

        const interval = setInterval(async () => {
          try {
            const db = getDb();
            const [execution] = await db
              .select()
              .from(executions)
              .where(eq(executions.id, executionId));

            if (execution) {
              send("status", { executionId, status: execution.status });

              if (
                execution.status === "completed" ||
                execution.status === "failed" ||
                execution.status === "cancelled"
              ) {
                clearInterval(interval);
                send("done", { executionId, status: execution.status });
                controller.close();
              }
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
