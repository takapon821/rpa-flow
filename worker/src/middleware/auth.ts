import type { Request, Response, NextFunction } from "express";

export function workerAuth(req: Request, res: Response, next: NextFunction) {
  // Skip auth for health check
  if (req.path === "/health") {
    next();
    return;
  }

  const secret = process.env.WORKER_SECRET;
  if (!secret) {
    console.warn("[auth] WORKER_SECRET not set - authentication disabled");
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.warn(`[auth] Missing authorization header for ${req.method} ${req.path}`);
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (authHeader !== `Bearer ${secret}`) {
    console.warn(`[auth] Invalid authorization for ${req.method} ${req.path}`);
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
