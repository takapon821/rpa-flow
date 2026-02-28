import type { Page } from "playwright";

export async function screenshot(
  page: Page,
  config: { fullPage?: boolean }
): Promise<{ screenshot: string }> {
  const buffer = await page.screenshot({
    fullPage: config.fullPage ?? false,
    type: "png",
  });
  return { screenshot: buffer.toString("base64") };
}
