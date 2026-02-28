import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { notificationSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface NotificationConfig {
  email?: string;
}

interface UpdateNotificationRequest {
  emailEnabled: boolean;
  email?: string;
  onSuccess: boolean;
  onFailure: boolean;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Fetch email notification settings for this user
  const [settings] = await db
    .select()
    .from(notificationSettings)
    .where(
      and(
        eq(notificationSettings.userId, session.user.id),
        eq(notificationSettings.channel, "email")
      )
    );

  if (!settings) {
    return NextResponse.json(
      {
        emailEnabled: false,
        email: "",
        onSuccess: false,
        onFailure: true,
      },
      { status: 200 }
    );
  }

  const config = settings.config as NotificationConfig;
  return NextResponse.json(
    {
      emailEnabled: !!config.email,
      email: config.email || "",
      onSuccess: settings.onSuccess,
      onFailure: settings.onFailure,
    },
    { status: 200 }
  );
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: UpdateNotificationRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate request
  if (typeof body.emailEnabled !== "boolean") {
    return NextResponse.json(
      { error: "emailEnabled must be a boolean" },
      { status: 400 }
    );
  }

  if (body.emailEnabled && !body.email) {
    return NextResponse.json(
      { error: "email is required when emailEnabled is true" },
      { status: 400 }
    );
  }

  if (typeof body.onSuccess !== "boolean" || typeof body.onFailure !== "boolean") {
    return NextResponse.json(
      { error: "onSuccess and onFailure must be booleans" },
      { status: 400 }
    );
  }

  const db = getDb();

  // Check if user already has email notification settings
  const [existing] = await db
    .select()
    .from(notificationSettings)
    .where(
      and(
        eq(notificationSettings.userId, session.user.id),
        eq(notificationSettings.channel, "email")
      )
    );

  const config: NotificationConfig = body.emailEnabled ? { email: body.email } : {};

  if (existing) {
    // Update existing settings
    const [updated] = await db
      .update(notificationSettings)
      .set({
        config,
        onSuccess: body.onSuccess,
        onFailure: body.onFailure,
      })
      .where(eq(notificationSettings.id, existing.id))
      .returning();

    return NextResponse.json(
      {
        settings: {
          emailEnabled: body.emailEnabled,
          email: body.email || "",
          onSuccess: body.onSuccess,
          onFailure: body.onFailure,
        },
        message: "Notification settings updated successfully",
      },
      { status: 200 }
    );
  } else {
    // Create new settings
    const [created] = await db
      .insert(notificationSettings)
      .values({
        userId: session.user.id,
        channel: "email",
        config,
        onSuccess: body.onSuccess,
        onFailure: body.onFailure,
      })
      .returning();

    return NextResponse.json(
      {
        settings: {
          emailEnabled: body.emailEnabled,
          email: body.email || "",
          onSuccess: body.onSuccess,
          onFailure: body.onFailure,
        },
        message: "Notification settings created successfully",
      },
      { status: 201 }
    );
  }
}
