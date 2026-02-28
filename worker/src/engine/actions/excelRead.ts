import type { Page } from "playwright";
import * as XLSX from "xlsx";

interface ExcelReadConfig {
  filePath: string;
  sheetName?: string;
}

export async function excelRead(
  _page: Page,
  config: Record<string, unknown>
): Promise<{ rows: Record<string, unknown>[] }> {
  const { filePath, sheetName } = config as unknown as ExcelReadConfig;
  if (!filePath) throw new Error("excelRead: filePath is required");

  const workbook = XLSX.readFile(filePath);
  const name = sheetName ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`excelRead: sheet "${name}" not found`);

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  return { rows };
}
