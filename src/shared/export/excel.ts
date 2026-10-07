import * as XLSX from "xlsx";

export type ExcelRow = Record<string, unknown>;

export const downloadExcel = (filename: string, sheetName: string, rows: ExcelRow[]) => {
  if (rows.length === 0) throw new Error("No hay datos para descargar.");
  const worksheet = XLSX.utils.json_to_sheet(rows, { cellDates: true });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`, { bookType: "xlsx" });
};
