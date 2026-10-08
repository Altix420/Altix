import writeExcelFile from "write-excel-file/browser";

export type ExcelRow = Record<string, unknown>;
export type ExcelCell = string | number | boolean | Date | null;

export const toExcelText = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
};

export const toExcelNumber = (value: unknown): number | null => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

export const toExcelDate = (value: unknown): Date | null => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? null : date;
};

const toExcelCell = (value: unknown): ExcelCell => {
  if (value == null) return null;
  if (value instanceof Date) return toExcelDate(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  return toExcelText(value);
};

export const downloadExcel = async (filename: string, sheetName: string, rows: ExcelRow[]) => {
  if (rows.length === 0) throw new Error("No hay datos para descargar.");
  const headers = Object.keys(rows[0]);
  if (headers.length === 0) throw new Error("El reporte no tiene columnas exportables.");
  const sheetData = [headers, ...rows.map((row) => headers.map((header) => toExcelCell(row[header])))];
  try {
    await writeExcelFile(sheetData, {
      sheet: sheetName.slice(0, 31),
      dateFormat: "dd/mm/yyyy hh:mm",
    }).toFile(filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
  } catch (error) {
    if (import.meta.env.DEV) console.error("[ALTIX] Error técnico generando XLSX", error);
    throw new Error("No se pudo generar el archivo Excel.", { cause: error });
  }
};
