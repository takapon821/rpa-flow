import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { robots, executions } from "@/lib/db/schema";
import { eq, and, gte, count } from "drizzle-orm";

interface DashboardStats {
  totalRobots: number;
  todayExecutions: number;
  successRate: number;
  failedCount: number;
  recentExecutions: RecentExecution[];
  weeklyChart: ChartData[];
}

interface RecentExecution {
  id: string;
  robotName: string;
  status: string;
  startedAt: string | null;
  duration: number | null;
}

interface ChartData {
  date: string;
  count: number;
  success: number;
  failed: number;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const db = getDb();

    // 1. Total robots count
    const robotsResult = await db
      .select({ count: count() })
      .from(robots)
      .where(eq(robots.ownerId, userId));
    const totalRobots = robotsResult[0]?.count ?? 0;

    // 2. Today's executions count (UTC midnight to now)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStart = today;

    const todayExecsResult = await db
      .select({ count: count() })
      .from(executions)
      .innerJoin(robots, eq(executions.robotId, robots.id))
      .where(
        and(
          eq(robots.ownerId, userId),
          gte(executions.createdAt, todayStart),
          eq(executions.status, "completed")
        )
      );
    const todayExecutions = todayExecsResult[0]?.count ?? 0;

    // 3. Success rate (past 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    // Get all executions in past 30 days
    const last30DaysExecs = await db
      .select({ status: executions.status })
      .from(executions)
      .innerJoin(robots, eq(executions.robotId, robots.id))
      .where(
        and(
          eq(robots.ownerId, userId),
          gte(executions.createdAt, thirtyDaysAgo)
        )
      );

    const totalCount = last30DaysExecs.length;
    const completedCount = last30DaysExecs.filter(
      (e) => e.status === "completed"
    ).length;
    const successRate =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // 4. Failed count (past 30 days)
    const failedCount = last30DaysExecs.filter(
      (e) => e.status === "failed"
    ).length;

    // 5. Recent executions (last 10)
    const recentExecsData = await db
      .select({
        id: executions.id,
        robotName: robots.name,
        status: executions.status,
        startedAt: executions.startedAt,
        completedAt: executions.completedAt,
        createdAt: executions.createdAt,
      })
      .from(executions)
      .innerJoin(robots, eq(executions.robotId, robots.id))
      .where(eq(robots.ownerId, userId))
      .orderBy(executions.createdAt)
      .limit(10);

    const recentExecutions: RecentExecution[] = recentExecsData.map((exec) => {
      let duration: number | null = null;
      if (exec.startedAt && exec.completedAt) {
        duration =
          new Date(exec.completedAt).getTime() -
          new Date(exec.startedAt).getTime();
      }
      return {
        id: exec.id,
        robotName: exec.robotName,
        status: exec.status,
        startedAt: exec.startedAt ? new Date(exec.startedAt).toISOString() : null,
        duration,
      };
    });

    // 6. Weekly chart data (past 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    const weeklyData = await db
      .select({
        createdAt: executions.createdAt,
        status: executions.status,
      })
      .from(executions)
      .innerJoin(robots, eq(executions.robotId, robots.id))
      .where(
        and(
          eq(robots.ownerId, userId),
          gte(executions.createdAt, sevenDaysAgo)
        )
      );

    // Group by date
    const chartDataMap = new Map<string, ChartData>();
    weeklyData.forEach((row) => {
      const date = new Date(row.createdAt);
      const dateStr = `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(
        date.getUTCDate()
      ).padStart(2, "0")}`;

      const existing = chartDataMap.get(dateStr) || {
        date: dateStr,
        count: 0,
        success: 0,
        failed: 0,
      };

      chartDataMap.set(dateStr, {
        ...existing,
        count: existing.count + 1,
        success:
          existing.success + (row.status === "completed" ? 1 : 0),
        failed:
          existing.failed + (row.status === "failed" ? 1 : 0),
      });
    });

    // Fill in missing days
    const weeklyChart: ChartData[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - i);
      const dateStr = `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(
        date.getUTCDate()
      ).padStart(2, "0")}`;
      weeklyChart.push(
        chartDataMap.get(dateStr) || { date: dateStr, count: 0, success: 0, failed: 0 }
      );
    }

    const stats: DashboardStats = {
      totalRobots,
      todayExecutions,
      successRate,
      failedCount,
      recentExecutions,
      weeklyChart,
    };

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Dashboard stats error:", error);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
