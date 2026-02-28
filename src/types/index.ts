// ── Flow Definition Types ──────────────────────────
export type ActionType =
  | "navigate"
  | "click"
  | "input"
  | "extract"
  | "wait"
  | "screenshot"
  | "loop"
  | "condition"
  | "setVariable"
  | "csvRead"
  | "csvWrite"
  | "excelRead"
  | "excelWrite"
  | "fileDownload"
  | "login";

export interface FlowNode {
  id: string;
  type: ActionType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// ── Execution Types ────────────────────────────────
export type ExecutionStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type TriggerType = "manual" | "schedule" | "api" | "webhook";

export type StepStatus = "running" | "completed" | "failed" | "skipped";

// ── Robot Types ────────────────────────────────────
export type RobotStatus = "draft" | "active" | "paused" | "archived";

export type UserRole = "admin" | "member" | "viewer";
