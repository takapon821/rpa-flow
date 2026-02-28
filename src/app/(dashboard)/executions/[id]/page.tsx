import { getDb } from "@/lib/db/client";
import { executions, executionLogs, robots } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ExecutionDetailClient } from "@/components/execution-detail-client";

export default async function ExecutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getDb();
  const [execution] = await db
    .select()
    .from(executions)
    .where(eq(executions.id, id));

  if (!execution) notFound();

  const [robot] = await db
    .select({ name: robots.name })
    .from(robots)
    .where(eq(robots.id, execution.robotId));

  const logs = await db
    .select()
    .from(executionLogs)
    .where(eq(executionLogs.executionId, id))
    .orderBy(executionLogs.stepOrder);

  return (
    <ExecutionDetailClient
      executionId={id}
      robotName={robot?.name}
      initialExecution={execution}
      initialLogs={logs}
    />
  );
}
