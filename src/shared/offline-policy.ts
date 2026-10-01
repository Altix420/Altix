export type DefinitiveAction = 'venta' | 'pago' | 'inventario';

export function assertOnlineForDefinitiveAction(action: DefinitiveAction) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error(`La acción definitiva '${action}' requiere conexión.`);
  }
}

export const offlineAllowed = new Set(['borrador', 'conteo', 'cache']);
