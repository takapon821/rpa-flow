import { chromium, type Browser, type BrowserContext } from "playwright";

const MAX_CONTEXTS = 3;
const MAX_RECORDER_CONTEXTS = 2;

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
  const isRecorder = executionId.startsWith("recorder_");
  const recorderCount = Array.from(contexts.keys()).filter((k) =>
    k.startsWith("recorder_")
  ).length;

  if (isRecorder && recorderCount >= MAX_RECORDER_CONTEXTS) {
    throw new Error(`Max concurrent recorder sessions (${MAX_RECORDER_CONTEXTS}) reached`);
  }
  if (contexts.size >= MAX_CONTEXTS + MAX_RECORDER_CONTEXTS) {
    throw new Error(`Max concurrent contexts reached`);
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
    try {
      await ctx.close();
      contexts.delete(executionId);
      console.log(`[browser-pool] Context destroyed: ${executionId}`);
    } catch (err) {
      console.error(
        `[browser-pool] Error closing context ${executionId}:`,
        err instanceof Error ? err.message : String(err)
      );
      contexts.delete(executionId);
    }
  }
}

export async function shutdown(): Promise<void> {
  console.log("[browser-pool] Shutting down...");
  for (const [id] of contexts) {
    await destroyContext(id);
  }
  if (browser) {
    try {
      await browser.close();
      console.log("[browser-pool] Browser closed successfully");
    } catch (err) {
      console.error(
        "[browser-pool] Error closing browser:",
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      browser = null;
    }
  }
}

export function getPoolStatus() {
  return {
    activeContexts: contexts.size,
    maxContexts: MAX_CONTEXTS,
    browserConnected: browser?.isConnected() ?? false,
  };
}
