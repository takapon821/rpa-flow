import type { Page } from "playwright";

interface LoginConfig {
  url: string;
  usernameSelector: string;
  passwordSelector: string;
  submitSelector: string;
  username: string;
  password: string;
  waitForSelector?: string;
}

export async function login(
  page: Page,
  config: Record<string, unknown>
): Promise<{ success: boolean; currentUrl: string }> {
  const {
    url,
    usernameSelector,
    passwordSelector,
    submitSelector,
    username,
    password,
    waitForSelector,
  } = config as unknown as LoginConfig;

  if (!url) throw new Error("login: url is required");

  await page.goto(url as string);
  await page.fill(usernameSelector as string, username as string);
  await page.fill(passwordSelector as string, password as string);
  await page.click(submitSelector as string);

  if (waitForSelector) {
    await page.waitForSelector(waitForSelector as string, { timeout: 10000 });
  } else {
    await page.waitForLoadState("networkidle");
  }

  return { success: true, currentUrl: page.url() };
}
