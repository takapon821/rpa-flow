import type { Request, Response, NextFunction } from "express";

export function workerAuth(req: Request, res: Response, next: NextFunction) {
  // Skip auth for health check
  if (req.path === "/health") {
    next();
    return;
  }

  const secret = process.env.WORKER_SECRET;
  if (!secret) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
