import type { Page } from "playwright";

export async function click(
  page: Page,
  config: { selector: string }
): Promise<{ clicked: boolean }> {
  await page.locator(config.selector).first().click({ timeout: 10000 });
  return { clicked: true };
}
