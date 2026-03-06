import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Duplex } from "stream";
import {
  validateAndConsumeToken,
  createRecorderSession,
  destroyRecorderSession,
  getSession,
  touchSession,
  addAction,
  startScreencast,
  stopScreencast,
  ackScreencastFrame,
  type RecorderSession,
  type RecordedAction,
} from "./session-manager.js";
import { generateSelector, getElementAtPoint } from "./selector-generator.js";
import { executeAction } from "../engine/actions/index.js";

const wss = new WebSocketServer({ noServer: true });

interface ClientMessage {
  type: string;
  [key: string]: unknown;
}

function send(ws: WebSocket, type: string, payload: Record<string, unknown> = {}): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...payload }));
  }
}

function sendError(ws: WebSocket, message: string): void {
  send(ws, "error", { message });
}

async function handleStart(
  ws: WebSocket,
  session: RecorderSession,
  msg: ClientMessage
): Promise<void> {
  const url = msg.url as string;
  const viewport = msg.viewport as { width: number; height: number } | undefined;

  if (!url) {
    sendError(ws, "url is required");
    return;
  }

  try {
    if (viewport) {
      await session.page.setViewportSize(viewport);
    }

    await session.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const title = await session.page.title();

    // Start CDP screencast
    await startScreencast(session);

    // Listen for screencast frames
    session.cdpSession.on("Page.screencastFrame", (params) => {
      send(ws, "frame", {
        data: params.data,
        width: params.metadata.deviceWidth,
        height: params.metadata.deviceHeight,
      });
      // Ack internally to enable next frame (client ack controls pacing)
      ackScreencastFrame(session, params.sessionId).catch(() => {});
    });

    // Listen for navigation events
    session.page.on("framenavigated", (frame) => {
      if (frame === session.page.mainFrame()) {
        const newUrl = frame.url();
        const pageTitle = session.page.title().catch(() => "");
        pageTitle.then((t) => {
          send(ws, "navigated", { url: newUrl, title: t });
          // Auto-record navigate action if URL changed after initial load
          if (session.actions.length > 0) {
            addAction(session.sessionId, {
              type: "navigate",
              url: newUrl,
              description: `${newUrl} に移動`,
            });
          }
        });
      }
    });

    // Record first navigate action
    addAction(session.sessionId, {
      type: "navigate",
      url,
      description: `${url} に移動`,
    });

    send(ws, "ready", {
      sessionId: session.sessionId,
      url: session.page.url(),
      title,
    });
  } catch (err) {
    sendError(ws, `Failed to load page: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function handleClick(
  ws: WebSocket,
  session: RecorderSession,
  msg: ClientMessage
): Promise<void> {
  const x = msg.x as number;
  const y = msg.y as number;

  if (typeof x !== "number" || typeof y !== "number") {
    sendError(ws, "x and y coordinates are required");
    return;
  }

  touchSession(session.sessionId);

  try {
    // Get element info before clicking
    const elementInfo = await generateSelector(session.page, x, y);

    // Perform the actual click
    await session.page.mouse.click(x, y);

    // Wait briefly for any navigation/render
    await session.page.waitForTimeout(300);

    send(ws, "element_info", {
      selector: elementInfo.selector,
      altSelectors: elementInfo.altSelectors,
      tag: elementInfo.tag,
      text: elementInfo.text,
      rect: elementInfo.rect,
      suggestedAction: elementInfo.suggestedAction,
    });
  } catch (err) {
    sendError(ws, `Click failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function handleType(
  ws: WebSocket,
  session: RecorderSession,
  msg: ClientMessage
): Promise<void> {
  const text = msg.text as string;
  if (typeof text !== "string") {
    sendError(ws, "text is required");
    return;
  }

  touchSession(session.sessionId);

  try {
    // Clear current field and type
    await session.page.keyboard.press("Control+a");
    await session.page.keyboard.type(text, { delay: 30 });
  } catch (err) {
    sendError(ws, `Type failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function handleScroll(
  ws: WebSocket,
  session: RecorderSession,
  msg: ClientMessage
): Promise<void> {
  const deltaX = (msg.deltaX as number) || 0;
  const deltaY = (msg.deltaY as number) || 0;

  touchSession(session.sessionId);

  try {
    await session.page.evaluate(
      ({ dx, dy }) => window.scrollBy(dx, dy),
      { dx: deltaX, dy: deltaY }
    );
  } catch (err) {
    sendError(ws, `Scroll failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function handleHover(
  ws: WebSocket,
  session: RecorderSession,
  msg: ClientMessage
): Promise<void> {
  const x = msg.x as number;
  const y = msg.y as number;

  if (typeof x !== "number" || typeof y !== "number") return;

  touchSession(session.sessionId);

  try {
    const info = await getElementAtPoint(session.page, x, y);
    if (info) {
      send(ws, "hover_result", info);
    }
  } catch {
    // Hover failures are non-critical
  }
}

async function handleNavigate(
  ws: WebSocket,
  session: RecorderSession,
  msg: ClientMessage
): Promise<void> {
  const url = msg.url as string;
  if (!url) {
    sendError(ws, "url is required");
    return;
  }

  touchSession(session.sessionId);

  try {
    await session.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    const title = await session.page.title();

    addAction(session.sessionId, {
      type: "navigate",
      url,
      description: `${url} に移動`,
    });

    send(ws, "navigated", { url: session.page.url(), title });
  } catch (err) {
    sendError(ws, `Navigation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function handleBrowserAction(
  ws: WebSocket,
  session: RecorderSession,
  action: "back" | "forward" | "refresh"
): Promise<void> {
  touchSession(session.sessionId);

  try {
    switch (action) {
      case "back":
        await session.page.goBack({ waitUntil: "domcontentloaded" });
        break;
      case "forward":
        await session.page.goForward({ waitUntil: "domcontentloaded" });
        break;
      case "refresh":
        await session.page.reload({ waitUntil: "domcontentloaded" });
        break;
    }
  } catch (err) {
    sendError(ws, `${action} failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function handleExecuteStep(
  ws: WebSocket,
  session: RecorderSession,
  msg: ClientMessage
): Promise<void> {
  const actionType = msg.actionType as string;
  const config = (msg.config as Record<string, unknown>) || {};

  if (!actionType) {
    sendError(ws, "actionType is required");
    return;
  }

  touchSession(session.sessionId);

  try {
    await executeAction(session.page, actionType, config);

    // Wait briefly for any navigation/render to settle
    await session.page.waitForTimeout(500);

    // Take a screenshot after execution
    const screenshotBuffer = await session.page.screenshot({ type: "jpeg", quality: 60 });
    const screenshotBase64 = screenshotBuffer.toString("base64");

    send(ws, "step_executed", {
      success: true,
      screenshot: screenshotBase64,
      url: session.page.url(),
    });
  } catch (err) {
    // Still try to capture a screenshot on failure
    let screenshotBase64: string | undefined;
    try {
      const buf = await session.page.screenshot({ type: "jpeg", quality: 60 });
      screenshotBase64 = buf.toString("base64");
    } catch {
      // Ignore screenshot failure
    }

    send(ws, "step_executed", {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      screenshot: screenshotBase64,
      url: session.page.url(),
    });
  }
}

async function handleStop(
  ws: WebSocket,
  session: RecorderSession
): Promise<void> {
  const actions = await destroyRecorderSession(session.sessionId);
  send(ws, "stopped", { actions });
}

function handleConnection(ws: WebSocket, session: RecorderSession): void {
  console.log(`[recorder-ws] Client connected for session ${session.sessionId}`);

  ws.on("message", async (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      sendError(ws, "Invalid JSON");
      return;
    }

    try {
      switch (msg.type) {
        case "start":
          await handleStart(ws, session, msg);
          break;
        case "click":
          await handleClick(ws, session, msg);
          break;
        case "type":
          await handleType(ws, session, msg);
          break;
        case "scroll":
          await handleScroll(ws, session, msg);
          break;
        case "hover":
          await handleHover(ws, session, msg);
          break;
        case "navigate":
          await handleNavigate(ws, session, msg);
          break;
        case "back":
        case "forward":
        case "refresh":
          await handleBrowserAction(ws, session, msg.type);
          break;
        case "viewport": {
          const vp = msg.viewport as { width: number; height: number } | undefined;
          if (vp) {
            touchSession(session.sessionId);
            try {
              await session.page.setViewportSize(vp);
              // Restart screencast with new dimensions
              await stopScreencast(session);
              await startScreencast(session, 60, vp.width, vp.height);
            } catch (err) {
              sendError(ws, `Viewport change failed: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
          break;
        }
        case "execute_step":
          await handleExecuteStep(ws, session, msg);
          break;
        case "ack_frame":
          // Client acknowledged frame receipt (pacing handled by CDP ack)
          break;
        case "stop":
          await handleStop(ws, session);
          break;
        default:
          sendError(ws, `Unknown message type: ${msg.type}`);
      }
    } catch (err) {
      sendError(ws, `Handler error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  ws.on("close", () => {
    console.log(`[recorder-ws] Client disconnected from session ${session.sessionId}`);
    destroyRecorderSession(session.sessionId).catch((err) => {
      console.error(`[recorder-ws] Error destroying session on disconnect:`, err);
    });
  });

  ws.on("error", (err) => {
    console.error(`[recorder-ws] WebSocket error:`, err);
  });
}

export function handleRecorderUpgrade(
  request: IncomingMessage,
  socket: Duplex,
  head: Buffer
): void {
  // Extract token from query string
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const token = url.searchParams.get("token");

  if (!token) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  const userId = validateAndConsumeToken(token);
  if (!userId) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  // Create a recorder session, then upgrade
  createRecorderSession()
    .then((session) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        handleConnection(ws, session);
      });
    })
    .catch((err) => {
      console.error("[recorder-ws] Failed to create session:", err);
      socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
      socket.destroy();
    });
}
