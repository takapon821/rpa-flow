import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { apiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// DELETE /api/keys/[id] - Delete an API key (only user's own keys)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const db = getDb();

  // Verify the key belongs to the current user
  const [key] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, session.user.id)));

  if (!key) {
    return NextResponse.json(
      { error: "API key not found or does not belong to you" },
      { status: 404 }
    );
  }

  // Delete the key
  await db.delete(apiKeys).where(eq(apiKeys.id, id));

  return NextResponse.json(
    { message: "API key deleted successfully" },
    { status: 200 }
  );
}
