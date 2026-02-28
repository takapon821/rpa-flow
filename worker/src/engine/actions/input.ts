import type { Page } from "playwright";

export async function input(
  page: Page,
  config: { selector: string; value: string; clearFirst?: boolean }
): Promise<{ filled: boolean }> {
  const locator = page.locator(config.selector).first();
  if (config.clearFirst !== false) {
    await locator.clear();
  }
  await locator.fill(config.value, { timeout: 10000 });
  return { filled: true };
}
