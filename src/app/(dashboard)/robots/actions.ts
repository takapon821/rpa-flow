"use server";

import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { robots } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createRobot(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name?.trim()) throw new Error("Name is required");

  const db = getDb();
  const [robot] = await db
    .insert(robots)
    .values({
      name: name.trim(),
      description: description?.trim() || null,
      ownerId: session.user.id,
      flowDefinition: { nodes: [], edges: [] },
    })
    .returning();

  redirect(`/robots/${robot.id}/edit`);
}

export async function updateRobot(robotId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name?.trim()) throw new Error("Name is required");

  const db = getDb();
  await db
    .update(robots)
    .set({
      name: name.trim(),
      description: description?.trim() || null,
      updatedAt: new Date(),
    })
    .where(and(eq(robots.id, robotId), eq(robots.ownerId, session.user.id)));

  revalidatePath("/robots");
}

export async function deleteRobot(robotId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const db = getDb();
  await db
    .delete(robots)
    .where(and(eq(robots.id, robotId), eq(robots.ownerId, session.user.id)));

  revalidatePath("/robots");
}

export async function saveFlowDefinition(
  robotId: string,
  flowDefinition: { nodes: unknown[]; edges: unknown[] }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const db = getDb();
  await db
    .update(robots)
    .set({
      flowDefinition,
      updatedAt: new Date(),
    })
    .where(and(eq(robots.id, robotId), eq(robots.ownerId, session.user.id)));

  revalidatePath(`/robots/${robotId}/edit`);
}
