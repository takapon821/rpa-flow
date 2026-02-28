import { createContext, destroyContext } from "../browser-pool.js";
import { executeAction } from "./actions/index.js";
import { cancelledExecutions } from "../index.js";

export interface FlowStep {
  id: string;
  actionType: string;
  config: Record<string, unknown>;
  // loop/condition用のサブステップ
  children?: FlowStep[]; // loopのボディ、conditionのthen
  elseChildren?: FlowStep[]; // conditionのelse
}

export interface ExecutionContext {
  variables: Map<string, unknown>;
}

/**
 * config内の {{変数名}} を実際の値に置換するヘルパー
 */
function resolveVariables(
  config: Record<string, unknown>,
  vars: Map<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string") {
      resolved[key] = value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
        const v = vars.get(name);
        return v !== undefined ? String(v) : `{{${name}}}`;
      });
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

export interface StepResult {
  stepId: string;
  actionType: string;
  status: "completed" | "failed";
  output?: unknown;
  error?: string;
  screenshotBase64?: string;
  startedAt: string;
  completedAt: string;
}

export interface ExecutionResult {
  executionId: string;
  status: "completed" | "failed";
  steps: StepResult[];
  error?: string;
}

type StatusCallback = (stepResult: StepResult) => void;

/**
 * ステップ配列を再帰的に実行
 * loop / condition は executor側で処理（actions に委譲しない）
 */
async function executeSteps(
  steps: FlowStep[],
  page: any,
  variables: Map<string, unknown>,
  results: StepResult[],
  executionId: string,
  onStepComplete?: StatusCallback
): Promise<"completed" | "failed"> {
  for (const step of steps) {
    // Check if execution was cancelled
    if (cancelledExecutions.has(executionId)) {
      throw new Error("EXECUTION_CANCELLED");
    }

    const startedAt = new Date().toISOString();
    try {
      const resolvedConfig = resolveVariables(step.config, variables);

      // loop / condition は executor側で処理
      if (step.actionType === "loop") {
        await executeLoop(
          step,
          resolvedConfig,
          page,
          variables,
          results,
          executionId,
          onStepComplete
        );
        continue;
      }
      if (step.actionType === "condition") {
        await executeCondition(
          step,
          resolvedConfig,
          page,
          variables,
          results,
          executionId,
          onStepComplete
        );
        continue;
      }

      // 通常アクション実行
      const output = await executeAction(page, step.actionType, resolvedConfig);

      let screenshotBase64: string | undefined;
      if (step.actionType === "screenshot") {
        screenshotBase64 = (output as { screenshot: string }).screenshot;
      }

      // 変数保存処理
      if (
        typeof output === "object" &&
        output !== null &&
        "variableName" in output &&
        "value" in output
      ) {
        const varResult = output as { variableName: string; value: unknown };
        variables.set(varResult.variableName, varResult.value);
      } else if (
        typeof output === "object" &&
        output !== null &&
        "name" in output &&
        "value" in output
      ) {
        const varResult = output as { name: string; value: unknown };
        variables.set(varResult.name, varResult.value);
      }

      const result: StepResult = {
        stepId: step.id,
        actionType: step.actionType,
        status: "completed",
        output,
        screenshotBase64,
        startedAt,
        completedAt: new Date().toISOString(),
      };
      results.push(result);
      onStepComplete?.(result);
    } catch (err) {
      const result: StepResult = {
        stepId: step.id,
        actionType: step.actionType,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        startedAt,
        completedAt: new Date().toISOString(),
      };
      results.push(result);
      onStepComplete?.(result);
      return "failed";
    }
  }
  return "completed";
}

/**
 * loop実行（配列ループ + カウントループ）
 */
async function executeLoop(
  step: FlowStep,
  config: Record<string, unknown>,
  page: any,
  variables: Map<string, unknown>,
  results: StepResult[],
  executionId: string,
  onStepComplete?: StatusCallback
): Promise<void> {
  const children = step.children ?? [];

  // 配列ループ: items に配列変数名を指定
  if (config.items && typeof config.items === "string") {
    const arr = variables.get(config.items);
    if (!Array.isArray(arr)) {
      throw new Error(
        `loop: variable "${config.items}" is not an array`
      );
    }
    const itemVar = (config.itemVariable as string) ?? "item";
    for (const item of arr) {
      variables.set(itemVar, item);
      const status = await executeSteps(
        children,
        page,
        variables,
        results,
        executionId,
        onStepComplete
      );
      if (status === "failed") {
        throw new Error("loop body failed");
      }
    }
  }
  // カウントループ: count に繰り返し回数を指定
  else if (config.count !== undefined) {
    const count = Number(config.count);
    const indexVar = (config.indexVariable as string) ?? "index";
    for (let i = 0; i < count; i++) {
      variables.set(indexVar, i);
      const status = await executeSteps(
        children,
        page,
        variables,
        results,
        executionId,
        onStepComplete
      );
      if (status === "failed") {
        throw new Error("loop body failed");
      }
    }
  } else {
    throw new Error("loop: either 'items' or 'count' is required");
  }
}

/**
 * condition実行（if/else分岐）
 */
async function executeCondition(
  step: FlowStep,
  config: Record<string, unknown>,
  page: any,
  variables: Map<string, unknown>,
  results: StepResult[],
  executionId: string,
  onStepComplete?: StatusCallback
): Promise<void> {
  const variable = config.variable as string;
  const operator = config.operator as string;
  const value = config.value;

  const actual = variables.get(variable);
  let conditionResult = false;

  switch (operator) {
    case "==":
      conditionResult = actual == value;
      break;
    case "!=":
      conditionResult = actual != value;
      break;
    case ">":
      conditionResult = Number(actual) > Number(value);
      break;
    case "<":
      conditionResult = Number(actual) < Number(value);
      break;
    case ">=":
      conditionResult = Number(actual) >= Number(value);
      break;
    case "<=":
      conditionResult = Number(actual) <= Number(value);
      break;
    case "contains":
      conditionResult =
        typeof actual === "string" && actual.includes(String(value));
      break;
    default:
      throw new Error(`condition: unknown operator "${operator}"`);
  }

  const branch = conditionResult
    ? (step.children ?? [])
    : (step.elseChildren ?? []);
  const status = await executeSteps(
    branch,
    page,
    variables,
    results,
    executionId,
    onStepComplete
  );
  if (status === "failed") {
    throw new Error("condition branch failed");
  }
}

export async function executeFlow(
  executionId: string,
  steps: FlowStep[],
  onStepComplete?: StatusCallback
): Promise<ExecutionResult> {
  const results: StepResult[] = [];
  const ctx = await createContext(executionId);
  const page = await ctx.newPage();
  const variables = new Map<string, unknown>();

  try {
    const status = await executeSteps(
      steps,
      page,
      variables,
      results,
      executionId,
      onStepComplete
    );

    if (status === "failed") {
      const lastError = results[results.length - 1]?.error ?? "Unknown error";
      return {
        executionId,
        status: "failed",
        steps: results,
        error: lastError,
      };
    }

    return { executionId, status: "completed", steps: results };
  } catch (err) {
    // Handle EXECUTION_CANCELLED error
    if (err instanceof Error && err.message === "EXECUTION_CANCELLED") {
      return {
        executionId,
        status: "failed",
        steps: results,
        error: "Execution cancelled",
      };
    }
    throw err;
  } finally {
    await page.close().catch(() => {});
    await destroyContext(executionId);
    // Clean up cancelled execution flag
    cancelledExecutions.delete(executionId);
  }
}
