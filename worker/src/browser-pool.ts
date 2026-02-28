import { chromium, type Browser, type BrowserContext } from "playwright";

const MAX_CONTEXTS = 3;

let browser: Browser | null = null;
const contexts = new Map<string, BrowserContext>();

async function getBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) return browser;
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return browser;
}

export async function createContext(executionId: string): Promise<BrowserContext> {
  if (contexts.size >= MAX_CONTEXTS) {
    throw new Error(`Max concurrent contexts (${MAX_CONTEXTS}) reached`);
  }

  const b = await getBrowser();
  const ctx = await b.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  contexts.set(executionId, ctx);
  return ctx;
}

export async function getContext(
  executionId: string
): Promise<BrowserContext | undefined> {
  return contexts.get(executionId);
}

export async function destroyContext(executionId: string): Promise<void> {
  const ctx = contexts.get(executionId);
  if (ctx) {
    await ctx.close().catch(() => {});
    contexts.delete(executionId);
  }
}

export async function shutdown(): Promise<void> {
  for (const [id] of contexts) {
    await destroyContext(id);
  }
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
}

export function getPoolStatus() {
  return {
    activeContexts: contexts.size,
    maxContexts: MAX_CONTEXTS,
    browserConnected: browser?.isConnected() ?? false,
  };
}
