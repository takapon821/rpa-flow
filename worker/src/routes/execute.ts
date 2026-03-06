import { Router, type Request, type Response } from "express";
import { executeFlow, type FlowStep } from "../engine/executor.js";

const router = Router();

router.post("/execute", async (req: Request, res: Response) => {
  const { executionId, steps, callbackUrl } = req.body as {
    executionId: string;
    steps: FlowStep[];
    callbackUrl?: string;
  };

  if (!executionId || !steps?.length) {
    res.status(400).json({ error: "executionId and steps are required" });
    return;
  }

  // Start execution asynchronously
  res.json({ status: "started", executionId });

  // Execute in background
  executeFlow(executionId, steps, async (stepResult) => {
    // Report step progress to callback if provided
    if (callbackUrl) {
      fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "step_complete",
          executionId,
          step: stepResult,
        }),
      }).catch((err) => {
        console.error(
          `[execute] Callback error for step (${executionId}):`,
          err instanceof Error ? err.message : String(err)
        );
      });
    }
  }).then(async (result) => {
    if (callbackUrl) {
      fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "execution_complete",
          ...result,
        }),
      }).catch((err) => {
        console.error(
          `[execute] Callback error for completion (${executionId}):`,
          err instanceof Error ? err.message : String(err)
        );
      });
    }
  }).catch((err) => {
    console.error(
      `[execute] Execution error (${executionId}):`,
      err instanceof Error ? err.message : String(err)
    );
  });
});

export default router;
