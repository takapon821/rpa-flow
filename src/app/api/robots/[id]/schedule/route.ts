import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { robots } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface RobotSchedule {
  enabled: boolean;
  type: "cron" | "interval";
  cron?: string;
  interval?: "hourly" | "daily" | "weekly";
  timezone?: string;
  nextRunAt?: string;
}

interface UpdateScheduleRequest {
  enabled: boolean;
  type: "cron" | "interval";
  cron?: string;
  interval?: "hourly" | "daily" | "weekly";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  // Verify robot belongs to user
  const [robot] = await db
    .select({ id: robots.id, schedule: robots.schedule })
    .from(robots)
    .where(and(eq(robots.id, id), eq(robots.ownerId, session.user.id)));

  if (!robot) {
    return NextResponse.json({ error: "Robot not found" }, { status: 404 });
  }

  let body: UpdateScheduleRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate request
  if (typeof body.enabled !== "boolean" || !["cron", "interval"].includes(body.type)) {
    return NextResponse.json(
      { error: "Invalid enabled or type field" },
      { status: 400 }
    );
  }

  // Calculate next run time
  let nextRunAt: string | undefined;
  if (body.enabled) {
    nextRunAt = calculateNextRunAt(body).toISOString();
  }

  // Build schedule object
  const newSchedule: RobotSchedule = {
    enabled: body.enabled,
    type: body.type,
    timezone: "Asia/Tokyo",
    nextRunAt,
  };

  if (body.type === "cron" && body.cron) {
    newSchedule.cron = body.cron;
  }
  if (body.type === "interval" && body.interval) {
    newSchedule.interval = body.interval;
  }

  // Update robot schedule
  const [updatedRobot] = await db
    .update(robots)
    .set({
      schedule: newSchedule,
      updatedAt: new Date(),
    })
    .where(eq(robots.id, id))
    .returning({
      id: robots.id,
      name: robots.name,
      schedule: robots.schedule,
    });

  return NextResponse.json(
    {
      robot: updatedRobot,
      message: "Schedule updated successfully",
    },
    { status: 200 }
  );
}

// ─ Helper: Calculate next run time ─
function calculateNextRunAt(
  body: UpdateScheduleRequest
): Date {
  const now = new Date();

  if (body.type === "interval") {
    switch (body.interval) {
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

  // For cron type, default to next hour for now
  return new Date(now.getTime() + 60 * 60 * 1000);
}
