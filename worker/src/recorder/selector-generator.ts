import type { Page } from "playwright";

export interface ElementInfo {
  selector: string;
  altSelectors: string[];
  tag: string;
  text: string;
  rect: { x: number; y: number; width: number; height: number };
  suggestedAction: "click" | "type" | "select";
}

export async function generateSelector(
  page: Page,
  x: number,
  y: number
): Promise<ElementInfo> {
  const info = await page.evaluate(
    ({ px, py }) => {
      const el = document.elementFromPoint(px, py) as HTMLElement | null;
      if (!el) {
        return null;
      }

      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || "").trim().slice(0, 100);
      const rect = el.getBoundingClientRect();

      // Generate selectors in priority order
      const selectors: string[] = [];

      // 1. id
      if (el.id) {
        selectors.push(`#${CSS.escape(el.id)}`);
      }

      // 2. data-testid
      const testId = el.getAttribute("data-testid");
      if (testId) {
        selectors.push(`[data-testid="${testId}"]`);
      }

      // 3. name attribute
      const name = el.getAttribute("name");
      if (name) {
        selectors.push(`${tag}[name="${name}"]`);
      }

      // 4. aria-label
      const ariaLabel = el.getAttribute("aria-label");
      if (ariaLabel) {
        selectors.push(`[aria-label="${ariaLabel}"]`);
      }

      // 5. unique class combination
      if (el.classList.length > 0) {
        const classes = Array.from(el.classList)
          .filter((c) => !c.match(/^(js-|is-|has-)/))
          .slice(0, 3);
        if (classes.length > 0) {
          const classSelector = `${tag}.${classes.map((c) => CSS.escape(c)).join(".")}`;
          selectors.push(classSelector);
        }
      }

      // 6. nth-child fallback
      const parent = el.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(el) + 1;
        const parentTag = parent.tagName.toLowerCase();
        if (parent.id) {
          selectors.push(`#${CSS.escape(parent.id)} > ${tag}:nth-child(${index})`);
        } else {
          selectors.push(`${parentTag} > ${tag}:nth-child(${index})`);
        }
      }

      // Determine suggested action
      let suggestedAction: "click" | "type" | "select" = "click";
      if (
        tag === "input" ||
        tag === "textarea" ||
        el.getAttribute("contenteditable") === "true"
      ) {
        suggestedAction = "type";
      } else if (tag === "select") {
        suggestedAction = "select";
      }

      return {
        tag,
        text,
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        selectors,
        suggestedAction,
      };
    },
    { px: x, py: y }
  );

  if (!info) {
    return {
      selector: `document.elementFromPoint(${x}, ${y})`,
      altSelectors: [],
      tag: "unknown",
      text: "",
      rect: { x, y, width: 0, height: 0 },
      suggestedAction: "click",
    };
  }

  // Validate uniqueness of selectors
  const validatedSelectors: string[] = [];
  for (const sel of info.selectors) {
    try {
      const count = await page.locator(sel).count();
      if (count === 1) {
        validatedSelectors.push(sel);
      }
    } catch {
      // Invalid selector, skip
    }
  }

  // Use first unique selector, or first generated selector as fallback
  const primary = validatedSelectors[0] || info.selectors[0] || `${info.tag}`;
  const alt = validatedSelectors.slice(1);

  return {
    selector: primary,
    altSelectors: alt,
    tag: info.tag,
    text: info.text,
    rect: info.rect,
    suggestedAction: info.suggestedAction,
  };
}

export async function getElementAtPoint(
  page: Page,
  x: number,
  y: number
): Promise<{
  rect: { x: number; y: number; width: number; height: number };
  selector: string;
  tag: string;
  text: string;
} | null> {
  const info = await page.evaluate(
    ({ px, py }) => {
      const el = document.elementFromPoint(px, py) as HTMLElement | null;
      if (!el) return null;

      const tag = el.tagName.toLowerCase();
      const rect = el.getBoundingClientRect();
      const text = (el.textContent || "").trim().slice(0, 50);

      // Quick selector: id or first class
      let selector = tag;
      if (el.id) {
        selector = `#${el.id}`;
      } else if (el.classList.length > 0) {
        selector = `${tag}.${el.classList[0]}`;
      }

      return {
        tag,
        text,
        selector,
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      };
    },
    { px: x, py: y }
  );

  return info;
}
