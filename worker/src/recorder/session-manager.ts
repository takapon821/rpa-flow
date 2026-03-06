import type { Page, BrowserContext, CDPSession } from "playwright";
import { createContext, destroyContext } from "../browser-pool.js";

export interface RecordedAction {
  type: "navigate" | "click" | "type" | "select" | "scroll" | "wait";
  selector?: string;
  value?: string;
  url?: string;
  description?: string;
}

export interface RecorderSession {
  sessionId: string;
  page: Page;
  context: BrowserContext;
  cdpSession: CDPSession;
  actions: RecordedAction[];
  createdAt: number;
  lastActivity: number;
}

interface TokenEntry {
  userId: string;
  createdAt: number;
}

const sessions = new Map<string, RecorderSession>();
const tokens = new Map<string, TokenEntry>();

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // 60 seconds

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function generateToken(userId: string): string {
  const token = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  tokens.set(token, { userId, createdAt: Date.now() });
  return token;
}

export function validateAndConsumeToken(token: string): string | null {
  const entry = tokens.get(token);
  if (!entry) return null;

  tokens.delete(token); // one-time use

  if (Date.now() - entry.createdAt > TOKEN_EXPIRY_MS) {
    return null;
  }
  return entry.userId;
}

export async function createRecorderSession(
  viewport: { width: number; height: number } = { width: 1280, height: 720 }
): Promise<RecorderSession> {
  const sessionId = `recorder_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const context = await createContext(sessionId);
  const page = await context.newPage();

  // Set viewport
  await page.setViewportSize(viewport);

  // Connect CDP for screencast
  const cdpSession = await page.context().newCDPSession(page);

  const session: RecorderSession = {
    sessionId,
    page,
    context,
    cdpSession,
    actions: [],
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };

  sessions.set(sessionId, session);
  console.log(`[recorder] Session created: ${sessionId}`);
  return session;
}

export async function startScreencast(
  session: RecorderSession,
  quality: number = 60,
  maxWidth: number = 1280,
  maxHeight: number = 720
): Promise<void> {
  await session.cdpSession.send("Page.startScreencast", {
    format: "jpeg",
    quality,
    maxWidth,
    maxHeight,
    everyNthFrame: 1,
  });
}

export async function stopScreencast(
  session: RecorderSession
): Promise<void> {
  try {
    await session.cdpSession.send("Page.stopScreencast");
  } catch {
    // Session may already be closed
  }
}

export async function ackScreencastFrame(
  session: RecorderSession,
  sessionIdParam: number
): Promise<void> {
  try {
    await session.cdpSession.send("Page.screencastFrameAck", {
      sessionId: sessionIdParam,
    });
  } catch {
    // Ignore ack errors
  }
}

export function getSession(sessionId: string): RecorderSession | undefined {
  return sessions.get(sessionId);
}

export function touchSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivity = Date.now();
  }
}

export function addAction(
  sessionId: string,
  action: RecordedAction
): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.actions.push(action);
  }
}

export async function destroyRecorderSession(
  sessionId: string
): Promise<RecordedAction[]> {
  const session = sessions.get(sessionId);
  if (!session) return [];

  const actions = [...session.actions];

  try {
    await stopScreencast(session);
  } catch {
    // Ignore
  }

  try {
    await session.cdpSession.detach();
  } catch {
    // Ignore
  }

  await destroyContext(sessionId);
  sessions.delete(sessionId);

  console.log(`[recorder] Session destroyed: ${sessionId} (${actions.length} actions recorded)`);
  return actions;
}

function cleanup(): void {
  const now = Date.now();

  // Clean expired tokens
  for (const [token, entry] of tokens) {
    if (now - entry.createdAt > TOKEN_EXPIRY_MS) {
      tokens.delete(token);
    }
  }

  // Clean timed-out sessions
  for (const [sessionId, session] of sessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      console.log(`[recorder] Session timed out: ${sessionId}`);
      destroyRecorderSession(sessionId).catch((err) => {
        console.error(`[recorder] Cleanup error for ${sessionId}:`, err);
      });
    }
  }
}

export function startCleanupTimer(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL_MS);
}

export function stopCleanupTimer(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

export async function destroyAllSessions(): Promise<void> {
  for (const sessionId of sessions.keys()) {
    await destroyRecorderSession(sessionId);
  }
  stopCleanupTimer();
}
