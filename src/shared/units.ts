export const SALES_UNITS = ['unidad', 'metro', 'yarda', 'docena', 'paquete', 'rollo'] as const;

export type SalesUnit = (typeof SALES_UNITS)[number];

export const unitAllowsFraction = (unit: string | null | undefined) => unit === 'metro' || unit === 'yarda';

const labels: Record<SalesUnit, { singular: string; plural: string }> = {
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
