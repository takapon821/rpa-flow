import { Router, type Request, type Response } from "express";
import { getPoolStatus } from "../browser-pool.js";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    pool: getPoolStatus(),
  });
});

export default router;
