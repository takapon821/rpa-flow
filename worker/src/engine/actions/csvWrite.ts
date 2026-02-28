import type { Page } from "playwright";
import { writeFileSync } from "fs";

interface CsvWriteConfig {
  filePath: string;
  data: Record<string, unknown>[] | string[][];
  headers?: string[];
}

export async function csvWrite(
  _page: Page,
  config: Record<string, unknown>
): Promise<{ written: number }> {
  const { filePath, data, headers } = config as unknown as CsvWriteConfig;
  if (!filePath) throw new Error("csvWrite: filePath is required");
  if (!Array.isArray(data)) throw new Error("csvWrite: data must be an array");

  const lines: string[] = [];

  if (data.length > 0 && !Array.isArray(data[0])) {
    // Object array
    const objData = data as Record<string, unknown>[];
    const keys = headers ?? Object.keys(objData[0]);
    lines.push(keys.join(","));
    objData.forEach((row) => {
      lines.push(keys.map((k) => String(row[k] ?? "")).join(","));
    });
  } else {
    // String array
    const arrData = data as string[][];
    if (headers) lines.push(headers.join(","));
    arrData.forEach((row) => lines.push(row.join(",")));
  }

  writeFileSync(filePath, lines.join("\n"), "utf-8");
  return { written: lines.length };
}
