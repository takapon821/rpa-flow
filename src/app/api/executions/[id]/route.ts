import { getDb } from '@/lib/db/client';
import { executions, executionLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const db = getDb();

  const [execution] = await db
    .select()
    .from(executions)
    .where(eq(executions.id, id));

  if (!execution) {
    return NextResponse.json(
      { error: 'Execution not found' },
      { status: 404 }
    );
  }

  const logs = await db
    .select()
    .from(executionLogs)
    .where(eq(executionLogs.executionId, id))
    .orderBy(executionLogs.stepOrder);

  return NextResponse.json(
    { execution, logs },
    {
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
      },
    }
  );
}
