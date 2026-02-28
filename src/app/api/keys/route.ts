import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";

interface CreateKeyRequest {
  name?: string;
}

interface ApiKeyResponse {
  id: string;
  keyPrefix: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

interface CreateKeyResponseData extends ApiKeyResponse {
  plainKey: string;
  warning: string;
}

// GET /api/keys - List all API keys for current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const keys = await db
    .select({
      id: apiKeys.id,
      keyPrefix: apiKeys.keyPrefix,
      name: apiKeys.name,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.user.id));

  return NextResponse.json({ keys });
}

// POST /api/keys - Create a new API key
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateKeyRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const name = body.name || `API Key ${new Date().toLocaleDateString()}`;

  // Generate cryptographically secure random key (32 bytes = 64 hex chars)
  const plainKey = randomBytes(32).toString("hex");
  const keyPrefix = plainKey.substring(0, 8);
  const keyHash = createHash("sha256").update(plainKey).digest("hex");

  const db = getDb();

  try {
    const [newKey] = await db
      .insert(apiKeys)
      .values({
        userId: session.user.id,
        name,
        keyHash,
        keyPrefix,
        lastUsedAt: null,
      })
      .returning({
        id: apiKeys.id,
        keyPrefix: apiKeys.keyPrefix,
        name: apiKeys.name,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
      });

    const response: CreateKeyResponseData = {
      ...newKey,
      plainKey,
      warning:
        "This key will only be shown once. Save it in a secure location.",
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
