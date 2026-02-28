import type { Page } from "playwright";
import { readFileSync } from "fs";

interface CsvReadConfig {
  filePath: string;
  hasHeader?: boolean;
}

export async function csvRead(
  _page: Page,
  config: Record<string, unknown>
): Promise<{ rows: Record<string, string>[] | string[][] }> {
  const { filePath, hasHeader = true } = config as unknown as CsvReadConfig;
  if (!filePath) throw new Error("csvRead: filePath is required");

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim() !== "");

  if (hasHeader && lines.length > 0) {
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ?? "";
      });
      return row;
    });
    return { rows };
  } else {
    const rows = lines.map((line) => line.split(",").map((v) => v.trim()));
    return { rows };
  }
}
