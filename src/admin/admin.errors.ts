export const friendlyAdminError = (error: unknown, fallback = 'No se pudo completar la operación.') => {
  const message = error instanceof Error ? error.message : '';
  const normalized = message.toLowerCase();
  if (normalized.includes('duplicate') || normalized.includes('unique')) return 'Ya existe un registro con esos datos.';
  if (normalized.includes('permission') || normalized.includes('rls') || normalized.includes('not authorized')) return 'No tienes permisos para realizar esta operación.';
  if (normalized.includes('required') || normalized.includes('null value')) return 'Completa todos los campos obligatorios.';
  if (normalized.includes('stock')) return 'La operación no puede completarse porque el stock disponible no es suficiente.';
  if (normalized.includes('sesión') || normalized.includes('caja')) return 'La sesión de caja no está disponible para esta operación.';
  if (normalized.includes('aceptación') || normalized.includes('aceptacion')) return 'Debe registrar primero la aceptación del cliente.';
  if (normalized.includes('descuento') && normalized.includes('aprob')) return 'El descuento solicitado sigue pendiente de aprobación administrativa.';
  if (normalized.includes('r2') || normalized.includes('presigned') || normalized.includes('storage')) return 'La carga de imagen no está disponible: R2 no está configurado en este entorno.';
  if (normalized.includes('gastos pendientes') || normalized.includes('gasto pendiente')) return 'No se puede cerrar la caja mientras existan gastos pendientes de aprobación.';
  if (normalized.includes('borrador de cotizacion') || normalized.includes('borrador de cotización') || normalized.includes('esta cotizacion')) return 'La aprobación de descuento debe corresponder a esta cotización.';
  if (normalized.includes('fecha operativa')) return 'La fecha operativa debe estar dentro de la semana actual y no puede ser futura.';
  if (normalized.includes('saldo') || normalized.includes('crédito') || normalized.includes('credito')) return 'El monto supera el saldo disponible o la cuenta no está habilitada.';
  return fallback;
};
