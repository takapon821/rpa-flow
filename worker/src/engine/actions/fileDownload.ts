import type { Page } from "playwright";
import { createWriteStream, statSync } from "fs";

interface FileDownloadConfig {
  url: string;
  savePath: string;
}

export async function fileDownload(
  page: Page,
  config: Record<string, unknown>
): Promise<{ savedPath: string; size: number }> {
  const { url, savePath } = config as unknown as FileDownloadConfig;
  if (!url) throw new Error("fileDownload: url is required");
  if (!savePath) throw new Error("fileDownload: savePath is required");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.goto(url as string),
  ]);

  await download.saveAs(savePath as string);
  const path = await download.path();
  const size = path ? statSync(path).size : 0;
  return { savedPath: savePath as string, size };
}
