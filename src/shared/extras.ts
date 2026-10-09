export type ExtraRecord = {
  id: string;
  nombre: string;
  precioAdicional: number;
  activo: boolean;
};

export const normalizeExtra = (extra: { id?: unknown; nombre?: unknown; precio_adicional?: unknown; activo?: unknown }): ExtraRecord | null => {
  const id = String(extra.id ?? "").trim();
  const nombre = String(extra.nombre ?? "").trim();
  const precioAdicional = Number(String(extra.precio_adicional ?? "").replace(",", "."));
  if (!id || !nombre || !Number.isFinite(precioAdicional) || precioAdicional < 0) return null;
  return { id, nombre, precioAdicional: Number(precioAdicional.toFixed(2)), activo: extra.activo === true };
};

export const extraPrice = (extras: ExtraRecord[], id: string) => extras.find((extra) => extra.id === id)?.precioAdicional ?? null;
