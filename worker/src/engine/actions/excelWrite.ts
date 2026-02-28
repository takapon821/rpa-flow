import type { Page } from "playwright";
import * as XLSX from "xlsx";

interface ExcelWriteConfig {
  filePath: string;
  data: Record<string, unknown>[];
  sheetName?: string;
}

export async function excelWrite(
  _page: Page,
  config: Record<string, unknown>
): Promise<{ written: number }> {
  const { filePath, data, sheetName = "Sheet1" } = config as unknown as ExcelWriteConfig;
  if (!filePath) throw new Error("excelWrite: filePath is required");
  if (!Array.isArray(data)) throw new Error("excelWrite: data must be an array");

  const sheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filePath);
  return { written: data.length };
}
