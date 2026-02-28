import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { executions, executionLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Redis } from "@upstash/redis";

export async function POST(req: Request) {
  // Verify worker secret
  const authHeader = req.headers.get("authorization");
  const secret = process.env.WORKER_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, executionId } = body;
  const db = getDb();

  if (type === "step_complete") {
    const { step } = body;
    await db.insert(executionLogs).values({
      executionId,
      stepOrder: step.stepOrder ?? 0,
      actionType: step.actionType,
      status: step.status,
      screenshotUrl: step.screenshotUrl ?? null,
      outputData: step.output ?? null,
      errorMessage: step.error ?? null,
      startedAt: new Date(step.startedAt),
      completedAt: step.completedAt ? new Date(step.completedAt) : null,
    });

    // Publish to Redis if configured
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      await redis.rpush(
        `execution:${executionId}:steps`,
        JSON.stringify(step)
      );
      await redis.set(`execution:${executionId}:status`, "running");
      await redis.expire(`execution:${executionId}:steps`, 3600);
      await redis.expire(`execution:${executionId}:status`, 3600);
    }
  }

  if (type === "execution_complete") {
    const { status, error } = body;
    await db
      .update(executions)
      .set({
        status: status === "completed" ? "completed" : "failed",
        completedAt: new Date(),
        errorMessage: error ?? null,
      })
      .where(eq(executions.id, executionId));

    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      await redis.set(`execution:${executionId}:status`, status);
    }
  }

  return NextResponse.json({ ok: true });
}
