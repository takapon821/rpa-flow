import type { Page } from "playwright";

export async function extract(
  page: Page,
  config: {
    selector: string;
    attribute: string;
    multiple?: boolean;
    saveAs?: string;
  }
): Promise<
  | { data: string | string[] }
  | { data: string | string[]; variableName: string; value: string | string[] }
> {
  const attr = config.attribute || "textContent";

  if (config.multiple) {
    const elements = page.locator(config.selector);
    const count = await elements.count();
    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      const el = elements.nth(i);
      const value = await el.getAttribute(attr) ?? await el.textContent() ?? "";
      results.push(value);
    }
    if (config.saveAs) {
      return { data: results, variableName: config.saveAs, value: results };
    }
    return { data: results };
  }

  const el = page.locator(config.selector).first();
  let value: string;
  if (attr === "textContent") {
    value = (await el.textContent()) ?? "";
  } else if (attr === "innerHTML") {
    value = await el.innerHTML();
  } else {
    value = (await el.getAttribute(attr)) ?? "";
  }

  if (config.saveAs) {
    return { data: value, variableName: config.saveAs, value };
  }
  return { data: value };
}
