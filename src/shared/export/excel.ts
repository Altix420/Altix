import writeExcelFile from "write-excel-file/browser";

export type ExcelRow = Record<string, unknown>;

export const downloadExcel = async (filename: string, sheetName: string, rows: ExcelRow[]) => {
  if (rows.length === 0) throw new Error("No hay datos para descargar.");
  const headers = Object.keys(rows[0]);
  const sheetData = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? null))];
  await writeExcelFile(sheetData, { sheet: sheetName.slice(0, 31) }).toFile(filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
};
