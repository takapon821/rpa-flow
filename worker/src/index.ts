import express from "express";
import executeRouter from "./routes/execute.js";
import captureRouter from "./routes/capture.js";
import healthRouter from "./routes/health.js";
import { workerAuth } from "./middleware/auth.js";
import { shutdown } from "./browser-pool.js";

// Module-level Set to track cancelled executions
export const cancelledExecutions = new Set<string>();

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: "10mb" }));
app.use(workerAuth);

app.use(executeRouter);
app.use(captureRouter);
app.use(healthRouter);

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
  console.log(`RPA Flow Worker running on port ${port}`);
});

// Graceful shutdown
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, async () => {
    console.log(`${signal} received, shutting down...`);
    await shutdown();
    server.close(() => process.exit(0));
  });
}
