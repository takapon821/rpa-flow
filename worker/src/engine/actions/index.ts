import type { Page } from "playwright";
import { navigate } from "./navigate.js";
import { click } from "./click.js";
import { input } from "./input.js";
import { extract } from "./extract.js";
import { wait } from "./wait.js";
import { screenshot } from "./screenshot.js";
import { setVariable } from "./setVariable.js";
import { csvRead } from "./csvRead.js";
import { csvWrite } from "./csvWrite.js";
import { excelRead } from "./excelRead.js";
import { excelWrite } from "./excelWrite.js";
import { fileDownload } from "./fileDownload.js";
import { login } from "./login.js";

type ActionFn = (page: Page, config: Record<string, unknown>) => Promise<unknown>;

async function select(
  page: Page,
  config: { selector: string; value: string }
): Promise<{ selected: boolean }> {
  await page.locator(config.selector).first().selectOption(config.value, { timeout: 10000 });
  return { selected: true };
}

async function scroll(
  page: Page,
  config: { deltaX?: number; deltaY?: number; selector?: string }
): Promise<{ scrolled: boolean }> {
  const dx = config.deltaX ?? 0;
  const dy = config.deltaY ?? 500;
  if (config.selector) {
    await page.locator(config.selector).first().evaluate(
      (el, { dx, dy }) => el.scrollBy(dx, dy),
      { dx, dy }
    );
  } else {
    await page.evaluate(({ dx, dy }) => window.scrollBy(dx, dy), { dx, dy });
  }
  return { scrolled: true };
}

const actions: Record<string, ActionFn> = {
  navigate: navigate as ActionFn,
  click: click as ActionFn,
  input: input as ActionFn,
  type: input as ActionFn, // alias: VisualStep "type" → executor "input"
  select: select as ActionFn,
  scroll: scroll as ActionFn,
  extract: extract as ActionFn,
  wait: wait as ActionFn,
  screenshot: screenshot as ActionFn,
  setVariable: setVariable as ActionFn,
  csvRead: csvRead as ActionFn,
  csvWrite: csvWrite as ActionFn,
  excelRead: excelRead as ActionFn,
  excelWrite: excelWrite as ActionFn,
  fileDownload: fileDownload as ActionFn,
  login: login as ActionFn,
};

export async function executeAction(
  page: Page,
  actionType: string,
  config: Record<string, unknown>
): Promise<unknown> {
  const fn = actions[actionType];
  if (!fn) throw new Error(`Unknown action type: ${actionType}`);
  return fn(page, config);
}

export { navigate, click, input, select, scroll, extract, wait, screenshot, setVariable, csvRead, csvWrite, excelRead, excelWrite, fileDownload, login };
