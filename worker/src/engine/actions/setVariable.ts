import type { Page } from "playwright";

interface SetVariableConfig {
  name: string; // 変数名
  value: unknown; // セットする値
}

export async function setVariable(
  _page: Page,
  config: Record<string, unknown>
): Promise<{ name: string; value: unknown }> {
  const { name, value } = config as unknown as SetVariableConfig;
  if (!name) throw new Error("setVariable: name is required");
  return { name, value };
}
