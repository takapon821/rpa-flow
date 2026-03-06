import express from "express";
import executeRouter from "./routes/execute.js";
import captureRouter from "./routes/capture.js";
import healthRouter from "./routes/health.js";
import { workerAuth } from "./middleware/auth.js";
import { shutdown } from "./browser-pool.js";
import { handleRecorderUpgrade } from "./recorder/websocket-handler.js";
import {
  generateToken,
  startCleanupTimer,
  destroyAllSessions,
} from "./recorder/session-manager.js";

// Module-level Set to track cancelled executions
export const cancelledExecutions = new Set<string>();

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: "10mb" }));
app.use(workerAuth);

app.use(executeRouter);
app.use(captureRouter);
app.use(healthRouter);

// Recorder token endpoint
app.post("/recorder/token", (req, res) => {
  const userId = (req.body as { userId?: string })?.userId || "anonymous";
  const token = generateToken(userId);
  res.json({ token });
});

// Cancel endpoint
app.post("/cancel/:executionId", (req, res) => {
  const { executionId } = req.params;
  if (!executionId) {
    res.status(400).json({ error: "executionId is required" });
    return;
  }

  cancelledExecutions.add(executionId);
  res.status(200).json({ status: "ok", executionId });
});

const server = app.listen(port, () => {
  console.log(`[server] RPA Flow Worker running on port ${port}`);
  console.log(`[server] Environment: NODE_ENV=${process.env.NODE_ENV || "development"}`);
  console.log(`[server] Auth enabled: ${process.env.WORKER_SECRET ? "yes" : "no"}`);
});

// WebSocket upgrade for recorder
server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || "/", `http://${request.headers.host}`).pathname;

  if (pathname === "/recorder") {
    handleRecorderUpgrade(request, socket, head);
  } else {
    socket.destroy();
  }
});

// Start recorder session cleanup timer
startCleanupTimer();

// Graceful shutdown
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, async () => {
    console.log(`[server] ${signal} received, shutting down...`);
    await destroyAllSessions();
    await shutdown();
    server.close(() => {
      console.log("[server] Server closed");
      process.exit(0);
    });
  });
}
