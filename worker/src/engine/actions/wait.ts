import type { Page } from "playwright";

export async function wait(
  page: Page,
  config: { type: string; value: string | number }
): Promise<{ waited: boolean }> {
  switch (config.type) {
    case "delay":
      await page.waitForTimeout(Number(config.value) || 1000);
      break;
    case "selector":
      await page.waitForSelector(String(config.value), { timeout: 30000 });
      break;
    case "navigation":
      await page.waitForLoadState("domcontentloaded");
      break;
    default:
      await page.waitForTimeout(1000);
  }
  return { waited: true };
}
