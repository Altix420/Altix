export const SALES_UNITS = ['vara', 'unidad', 'metro', 'yarda', 'docena', 'paquete', 'rollo'] as const;

export type SalesUnit = (typeof SALES_UNITS)[number];

export const unitAllowsFraction = (unit: string | null | undefined) => unit === 'vara' || unit === 'metro' || unit === 'yarda';
export const unitStep = (unit: string | null | undefined) => unit === 'vara' ? '0.25' : unitAllowsFraction(unit) ? '0.001' : '1';
export const unitMin = (unit: string | null | undefined) => unit === 'vara' ? '0.25' : unitAllowsFraction(unit) ? '0.001' : '1';
export const isValidUnitQuantity = (quantity: number, unit: string | null | undefined) => quantity > 0 && (unit === 'vara' ? Number.isInteger(quantity * 4) : unitAllowsFraction(unit) ? Number.isFinite(quantity) : Number.isInteger(quantity));

export const parseSalesQuantity = (value: string | number, unit: string | null | undefined): number | null => {
  const normalized = String(value).trim().replace(',', '.');
  if (!normalized) return null;
  const quantity = Number(normalized);
  if (!Number.isFinite(quantity) || !isValidUnitQuantity(quantity, unit)) return null;
  if (unit === 'vara' && Math.abs(quantity * 4 - Math.round(quantity * 4)) > 1e-9) return null;
  return Number(quantity.toFixed(3));
};

export const parseSalesPrice = (value: string | number): number | null => {
  const normalized = String(value).trim().replace(',', '.');
  if (!normalized) return null;
  const price = Number(normalized);
  return Number.isFinite(price) && price >= 0 ? Number(price.toFixed(2)) : null;
};

const labels: Record<SalesUnit, { singular: string; plural: string }> = {
  vara: { singular: 'vara', plural: 'varas' },
  unidad: { singular: 'unidad', plural: 'unidades' },
  metro: { singular: 'metro', plural: 'metros' },
  yarda: { singular: 'yarda', plural: 'yardas' },
  docena: { singular: 'docena', plural: 'docenas' },
  paquete: { singular: 'paquete', plural: 'paquetes' },
  rollo: { singular: 'rollo', plural: 'rollos' },
};

export const unitLabel = (unit: string | null | undefined, quantity = 1) => {
  const safeUnit = (SALES_UNITS.includes(unit as SalesUnit) ? unit : 'unidad') as SalesUnit;
  return labels[safeUnit][quantity === 1 ? 'singular' : 'plural'];
};

export const formatQuantity = (quantity: number | string, unit: string | null | undefined) =>
  `${Number(quantity).toLocaleString('es-GT', { maximumFractionDigits: 3 })} ${unitLabel(unit, Number(quantity))}`;

export const pricePerUnit = (price: number | string, unit: string | null | undefined) =>
  `Q ${Number(price).toLocaleString('es-GT', { minimumFractionDigits: 2 })} / ${unitLabel(unit)}`;
