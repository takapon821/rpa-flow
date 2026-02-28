import { Router, type Request, type Response } from "express";
import { chromium } from "playwright";

const router = Router();

// Capture a page screenshot + DOM bounding boxes for element selector UI
router.post("/capture", async (req: Request, res: Response) => {
  const { url } = req.body as { url: string };
  if (!url) {
    res.status(400).json({ error: "url is required" });
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const screenshot = await page.screenshot({ type: "png" });

    // Extract interactive elements with bounding boxes
    const elements = await page.evaluate(() => {
      const interactiveSelectors = "a, button, input, select, textarea, [role='button'], [onclick]";
      const els = document.querySelectorAll(interactiveSelectors);
      return Array.from(els).slice(0, 200).map((el, i) => {
        const rect = el.getBoundingClientRect();
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : "";
        const classes = el.className
          ? `.${String(el.className).split(" ").filter(Boolean).join(".")}`
          : "";
        return {
          index: i,
          selector: id || `${tag}${classes}`,
          tag,
          text: (el.textContent || "").trim().slice(0, 80),
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          attributes: {
            type: el.getAttribute("type"),
            name: el.getAttribute("name"),
            placeholder: el.getAttribute("placeholder"),
            href: el.getAttribute("href"),
          },
        };
      });
    });

    res.json({
      screenshot: screenshot.toString("base64"),
      elements,
      url: page.url(),
      title: await page.title(),
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Capture failed",
    });
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
});

export default router;
