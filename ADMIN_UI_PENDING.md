# Pendientes reales de la interfaz administrativa

La fase de Inventario + Caja V1 quedó conectada a contratos reales. Esta lista conserva únicamente brechas que no pertenecen a esos flujos:

- Creación de credenciales Auth desde la interfaz: por seguridad sigue siendo un procedimiento de Supabase Auth; la configuración de perfil, estado y asignación de sucursal ya está conectada desde Admin > Vendedores.
- Configuración empresarial avanzada fuera del contrato actual; sucursales, estado activo y productos/SKU ya cuentan con flujo administrativo real.
- Lanzamientos de catálogo; falta una entidad de negocio y sus RPC.
- Aprobación externa de cotizaciones por cliente; falta identidad/portal/RPC de cliente.
- Reportes financieros avanzados fuera de la descarga operativa de inventario.

La aceptación del cliente, el centro de aprobaciones, la aprobación de descuentos y la auditoría automática ya no son pendientes: quedaron conectados en migraciones 018/019, servicios y vistas Admin/Vendor.

Crédito mayorista, cuentas por cobrar, pagos parciales, entrega, comisiones condicionadas y recordatorios internos de un día antes quedaron completados mediante RPC/RLS y no son pendientes de UI.

No están pendientes: entradas, ventas, traslados, devoluciones, ajustes aprobables, defectuosos históricos, Kardex, conteos parciales, inventario por sucursal, exportación administrativa, apertura/cierre de caja, arqueo por denominaciones, movimientos autorizados, gastos y resolución no destructiva de gastos.

## PENDIENTES ACTUALIZADOS

Diseños, extras, lanzamientos, reportes, dashboards y metas de vendedor ya están implementados sobre tablas, RLS, servicios y RPC reales. Las entradas antiguas de este documento que indicaban que faltaban esas entidades quedan superadas por las migraciones `021` a `025`.

Solo permanecen brechas genuinas: credenciales/runtime externo de R2, configuración empresarial avanzada no soportada por el contrato actual, aprobación externa del cliente y proveedores de notificaciones. No se muestran botones para esas capacidades.

La impresión V1 de ventas, cotizaciones y pedidos ya está conectada a datos reales con formatos 58/80 mm y fallback PDF del navegador; no es pendiente de UI.

## COMMERCIAL V1 PASS

- Cotizaciones y pedidos tienen conversión, preparación, anticipos, entrega y cierre como venta mediante RPC transaccionales.
- No queda botón Admin visible para aprobación externa del cliente porque falta el contrato de identidad/portal del cliente.
- Validación final: `supabase db reset`, `supabase db diff --local`, `supabase db lint --local`, TypeScript, lint y build PASS.

## ADMIN PANEL FINAL STATUS

No hay botones visibles para las brechas anteriores. Cada acción visible pertenece a navegación, consulta/filtro, descarga o a un RPC/CRUD verificable. Cotizaciones y pedidos ya cuentan con creación Vendor, conversión, preparación, anticipos, entrega y cierre Admin.

## CIERRE OPERATIVO 2026-09-30

Se corrigieron devoluciones con fecha operativa, metas por sucursal, pagos de crédito del vendedor, tablas legibles, catálogo sin lanzamientos operativos, diseños sin cliente obligatorio y mensajes específicos para R2. Las brechas restantes son externas al código local: R2, aprobación externa del cliente, notificaciones y configuración empresarial avanzada.

Automatización local: `db reset`, `db diff`, `db lint`, TypeScript, lint, build y batería autenticada V1 PASS. La validación manual confirmó login, navegación, dashboard, POS, cotización, catálogo, metas y gastos; las mutaciones financieras de navegador quedan pendientes de una ejecución manual controlada.
