import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { config } from "@/lib/config";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workerUrl = config.worker.url;
  const workerSecret = config.worker.secret;

  try {
    // Request one-time token from worker
    const res = await fetch(`${workerUrl}/recorder/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${workerSecret}`,
      },
      body: JSON.stringify({ userId: session.user.id }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Worker token request failed: ${text}` },
        { status: 502 }
      );
    }

    const { token } = await res.json();

    // Build WebSocket URL for worker
    const wsProtocol = workerUrl.startsWith("https") ? "wss" : "ws";
    const workerHost = workerUrl.replace(/^https?:\/\//, "");
    const workerWsUrl = `${wsProtocol}://${workerHost}/recorder`;

    return NextResponse.json({ workerWsUrl, token });
  } catch (err) {
    console.error("[recorder/start] Error:", err);
    return NextResponse.json(
      { error: "Failed to start recorder session" },
      { status: 500 }
    );
  }
}
