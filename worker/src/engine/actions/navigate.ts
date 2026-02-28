import type { Page } from "playwright";

export async function navigate(
  page: Page,
  config: { url: string }
): Promise<{ url: string; title: string }> {
  await page.goto(config.url, { waitUntil: "domcontentloaded", timeout: 30000 });
  return {
    url: page.url(),
    title: await page.title(),
  };
}
