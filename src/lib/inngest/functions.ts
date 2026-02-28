import { inngest } from "./client";
import { getDb } from "@/lib/db/client";
import { executions, executionLogs, robots, notificationSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendExecutionNotification, type ExecutionNotificationData } from "@/lib/notifications/email";
import { sendWebhookNotification, type WebhookPayload } from "@/lib/webhooks/sender";

// ─ Type definitions ─
interface RobotSchedule {
  enabled: boolean;
  type: "cron" | "interval";
  cron?: string;
  interval?: "hourly" | "daily" | "weekly";
  timezone?: string;
  nextRunAt?: string;
}

interface FlowNode {
  id: string;
  type: string;
  data: { actionType: string; config: Record<string, unknown> };
}

interface FlowEdge {
  source: string;
  target: string;
}

interface FlowDef {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

function topoSort(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  const queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const sorted: FlowNode[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);
    for (const next of adj.get(id) ?? []) {
      const deg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  return sorted;
}

export const executeRobot = inngest.createFunction(
  { id: "execute-robot", retries: 0 },
  { event: "robot/execute" },
  async ({ event, step }) => {
    const { executionId, robotId } = event.data as {
      executionId: string;
      robotId: string;
    };
    const db = getDb();
    const workerUrl = process.env.WORKER_URL || "http://localhost:3001";
    const workerSecret = process.env.WORKER_SECRET || "";

    // Mark execution as running
    await step.run("mark-running", async () => {
      await db
        .update(executions)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(executions.id, executionId));
    });

    // Load robot flow definition
    const flow = await step.run("load-flow", async () => {
      const [robot] = await db
        .select({ flowDefinition: robots.flowDefinition })
        .from(robots)
        .where(eq(robots.id, robotId));
      return robot?.flowDefinition as FlowDef | null;
    });

    if (!flow?.nodes?.length) {
      await step.run("no-steps", async () => {
        await db
          .update(executions)
          .set({
            status: "failed",
            completedAt: new Date(),
            errorMessage: "No steps defined",
          })
          .where(eq(executions.id, executionId));
      });
      return { status: "failed", error: "No steps defined" };
    }

    // Sort nodes topologically
    const sortedNodes = topoSort(flow.nodes, flow.edges);
    const steps = sortedNodes.map((n, i) => ({
      id: n.id,
      actionType: n.data.actionType || n.type,
      config: n.data.config || {},
    }));

    // Call worker to execute
    const result = await step.run("execute-on-worker", async () => {
      const resp = await fetch(`${workerUrl}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${workerSecret}`,
        },
        body: JSON.stringify({ executionId, steps }),
      });

      if (!resp.ok) {
        throw new Error(`Worker error: ${resp.status} ${await resp.text()}`);
      }

      return resp.json();
    });

    // Wait for completion (worker calls back, but also poll with timeout)
    await step.sleep("wait-for-worker", "60s");

    // Mark completed
    const completedAt = new Date();
    await step.run("mark-completed", async () => {
      await db
        .update(executions)
        .set({ status: "completed", completedAt })
        .where(eq(executions.id, executionId));
    });

    // Send notification
    await step.run("send-notification", async () => {
      try {
        // Fetch execution with full details
        const [execution] = await db
          .select()
          .from(executions)
          .where(eq(executions.id, executionId));

        if (!execution) return;

        // Fetch robot with owner info
        const [robot] = await db
          .select()
          .from(robots)
          .where(eq(robots.id, robotId));

        if (!robot) return;

        // Fetch notification settings for this user
        const [settings] = await db
          .select()
          .from(notificationSettings)
          .where(
            and(
              eq(notificationSettings.userId, robot.ownerId),
              eq(notificationSettings.channel, "email")
            )
          );

        if (!settings) return;

        // Fetch execution logs to get step count
        const logs = await db
          .select()
          .from(executionLogs)
          .where(eq(executionLogs.executionId, executionId));

        // Check if notification should be sent based on execution status
        const config = settings.config as { email?: string };
        const shouldNotify =
          (execution.status === "completed" && settings.onSuccess) ||
          (execution.status === "failed" && settings.onFailure);

        if (shouldNotify && config.email) {
          const notificationData: ExecutionNotificationData = {
            executionId: execution.id,
            robotName: robot.name,
            status: execution.status as "completed" | "failed",
            startedAt: execution.startedAt?.toISOString() ?? new Date().toISOString(),
            completedAt: completedAt.toISOString(),
            stepCount: logs.length,
            errorMessage: execution.errorMessage ?? undefined,
          };

          await sendExecutionNotification(config.email, notificationData);
        }
      } catch (error) {
        // Log error but don't throw - notification failure should not stop execution
        console.error("[NOTIFICATION] Error in notification step:", error);
      }
    });

    // Send webhook notifications
    await step.run("send-webhook", async () => {
      try {
        // Fetch execution with full details
        const [execution] = await db
          .select()
          .from(executions)
          .where(eq(executions.id, executionId));

        if (!execution) return;

        // Fetch robot with owner info
        const [robot] = await db
          .select()
          .from(robots)
          .where(eq(robots.id, robotId));

        if (!robot) return;

        // Determine event type based on execution status
        const eventType: "execution.completed" | "execution.failed" =
          execution.status === "completed"
            ? "execution.completed"
            : "execution.failed";

        // Prepare webhook payload
        const payload: WebhookPayload = {
          robotId: robot.id,
          robotName: robot.name,
          executionId: execution.id,
          status: execution.status as "completed" | "failed",
          startedAt: execution.startedAt?.toISOString() ?? new Date().toISOString(),
          finishedAt: completedAt.toISOString(),
          error: execution.errorMessage ?? undefined,
        };

        // Send webhook notification
        await sendWebhookNotification(robot.ownerId, eventType, payload);
      } catch (error) {
        // Log error but don't throw - webhook failure should not stop execution
        console.error("[WEBHOOK] Error in webhook step:", error);
      }
    });

    return { status: "completed", executionId };
  }
);

// ─ Scheduled Robot Run ─
export const scheduledRobotRun = inngest.createFunction(
  { id: "scheduled-robot-run", retries: 0 },
  { cron: "TZ=Asia/Tokyo 0 * * * *" },
  async ({ step }) => {
    const db = getDb();

    // Fetch all robots with active schedules
    const scheduledRobots = await step.run(
      "fetch-scheduled-robots",
      async () => {
        const results = await db
          .select({
            id: robots.id,
            schedule: robots.schedule,
          })
          .from(robots)
          .where(and(eq(robots.status, "active")));

        return results.filter((robot) => {
          const schedule = robot.schedule as RobotSchedule | null;
          return schedule?.enabled === true;
        });
      }
    );

    // Process each robot
    for (const robot of scheduledRobots) {
      await step.run(`check-robot-${robot.id}`, async () => {
        const schedule = robot.schedule as RobotSchedule;
        const now = new Date();

        // Check if robot should run
        if (schedule.nextRunAt && new Date(schedule.nextRunAt) <= now) {
          // Create execution record
          const [execution] = await db
            .insert(executions)
            .values({
              robotId: robot.id,
              triggeredBy: "schedule",
              status: "queued",
            })
            .returning();

          // Trigger execution via Inngest
          await inngest.send({
            name: "robot/execute",
            data: { executionId: execution.id, robotId: robot.id },
          });

          // Update nextRunAt based on schedule type
          const nextRunAt = calculateNextRunAt(schedule);
          await db
            .update(robots)
            .set({
              schedule: {
                ...schedule,
                nextRunAt: nextRunAt.toISOString(),
              },
              updatedAt: new Date(),
            })
            .where(eq(robots.id, robot.id));
        }
      });
    }

    return {
      status: "completed",
      robotsChecked: scheduledRobots.length,
    };
  }
);

// ─ Helper: Calculate next run time ─
function calculateNextRunAt(schedule: RobotSchedule): Date {
  const now = new Date();
  const tz = schedule.timezone || "Asia/Tokyo";

  switch (schedule.interval) {
    case "hourly":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "daily":
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    case "weekly":
      const nextWeek = new Date(now);
      const daysUntilMonday = (8 - nextWeek.getDay()) % 7 || 7;
      nextWeek.setDate(nextWeek.getDate() + daysUntilMonday);
      nextWeek.setHours(9, 0, 0, 0);
      return nextWeek;
    default:
      return now;
  }
}
