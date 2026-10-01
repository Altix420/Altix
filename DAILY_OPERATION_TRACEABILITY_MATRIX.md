# ALTIX Daily Operation Traceability Matrix

Fuente: migraciones locales, RPC actuales, RLS y servicios de la aplicación. `COMPLETE` significa que la operación crítica tiene registro transaccional suficiente para reconstruirla; `PARTIAL` indica que existe persistencia pero falta auditoría adicional, filtro o una relación histórica completa.

| Módulo | Acción | Usuario/Rol | Tabla principal | Tabla detalle | Movimiento generado | Auditoría | Sucursal | Timestamp | Persistencia | Se puede reconstruir | Observación |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auth | Login | Todos | `auth.users`, `profiles` | — | — | Parcial | Por perfil/asignación | Auth/Supabase | COMPLETE | COMPLETE | La sesión se conserva en Supabase; no se crea una fila de bitácora de login. |
| Auth | Logout | Todos | Sesión Auth | — | — | No | — | Auth | COMPLETE | PARTIAL | Logout no se audita como evento de negocio. |
| Usuarios | Activar/desactivar o cambiar rol | Admin | `profiles` | — | — | Trigger de auditoría | — | `updated_at`/auditoría | COMPLETE | COMPLETE | Cambio administrativo sensible. |
| Usuarios | Asignar sucursal | Admin | `usuario_sucursal` | — | — | Parcial | La asignación | — | COMPLETE | PARTIAL | La tabla persiste la relación; no está incluida en el conjunto de triggers críticos. |
| Clientes | Crear/editar | Vendor/Admin | `clientes` | — | — | Trigger de auditoría | Derivada por solicitud | `created_at` | COMPLETE | COMPLETE | Alta Vendor y cambios administrativos quedan en la tabla. |
| Clientes | Mayorista / crédito | Vendor/Admin | `clientes`, `aprobaciones` | — | — | Aprobación auditada | En la solicitud | `created_at`, `revisado_at` | COMPLETE | COMPLETE | `monto_solicitado` y `monto_autorizado` permanecen separados. |
| Ventas | Venta | Vendor/Admin | `ventas` | `venta_items`, `venta_costos` | Inventario, caja o cuenta por cobrar, comisión | Venta auditada | `ventas.sucursal_id` | `created_at` | COMPLETE | COMPLETE | Incluye vendedor, cliente, forma de pago, total y `operation_id`. `venta_items` y costo son el snapshot transaccional. |
| Inventario | Salida por venta | Vendor/Admin | `movimientos_inventario` | — | Reduce `inventarios` | Movimiento auditado | En movimiento | `created_at` | COMPLETE | COMPLETE | RPC atómico con bloqueo de fila y validación de stock. |
| Inventario | Entrada | Admin | `movimientos_inventario` | — | Aumenta `inventarios` | Movimiento auditado | En movimiento | `created_at` | COMPLETE | COMPLETE | Motivo y responsable quedan registrados. |
| Inventario | Traslado origen/destino | Admin | `traslados` | `traslado_items`, movimientos | Reduce origen y aumenta destino | Traslado y movimientos auditados | Origen/destino | `created_at` | COMPLETE | COMPLETE | RPC atómico, sin composición independiente desde UI. |
| Inventario | Devolución | Admin | `devoluciones` | `devolucion_items`, movimientos | Aumenta inventario y saldo a favor | Devolución auditada | De venta | `created_at`, fecha operativa | COMPLETE | COMPLETE | Usa venta e items originales. |
| Inventario | Ajuste aprobado/rechazado | Admin | `solicitudes_ajuste_inventario` | `aprobaciones` | Solo aprobado modifica stock | Ajuste y aprobación auditados | En solicitud | solicitado/revisado | COMPLETE | COMPLETE | Persiste anterior, nuevo/delta, motivo y responsable. |
| Inventario | Conteo físico | Admin | `conteos` | `conteos_detalle`, Dexie temporal | No bloquea venta | Conteo auditado | En conteo | `created_at` | COMPLETE | PARTIAL | Dexie solo es cola temporal; el resultado final se sincroniza por RPC. El detalle no tiene trigger propio. |
| Caja | Apertura | Admin/Vendor autorizado | `sesiones_caja` | — | Sesión abierta | Sesión auditada | `sucursal_id` | `fecha_apertura` | COMPLETE | COMPLETE | Una sesión abierta por sucursal según RPC. |
| Caja | Venta efectivo/ingreso | Vendor/Admin | `movimientos_caja` | — | Incrementa caja | Movimiento auditado | Por sesión | `created_at` | COMPLETE | COMPLETE | Referencia la venta u operación origen. |
| Caja | Gasto | Vendor/Admin | `gastos` | `aprobaciones`, `movimientos_caja` | Egreso solo al aprobar | Gasto/aprobación auditados | `sucursal_id` | `created_at`, revisión | COMPLETE | COMPLETE | Rechazado no se elimina. |
| Caja | Reintegro/anticipo | Vendor/Admin | `anticipos` o `movimientos_caja` | — | Movimiento según RPC | Parcial | Sucursal de pedido/sesión | `created_at` | COMPLETE | PARTIAL | La reconstrucción depende de la referencia de la sesión y pedido. |
| Caja | Cierre | Admin/Vendor autorizado | `sesiones_caja` | `movimientos_caja` | Fija esperado, físico y diferencia | Sesión auditada | `sucursal_id` | `fecha_cierre` | COMPLETE | COMPLETE | Denominaciones y diferencia quedan en cierre transaccional. |
| Cotizaciones | Crear | Vendor | `cotizaciones` | `cotizacion_items`, `cotizacion_item_extras` | — | Cotización auditada | `sucursal_id` | `created_at` | COMPLETE | COMPLETE | Precio, extras, descuento y snapshot se guardan en la RPC. |
| Cotizaciones | Aprobación/rechazo | Admin | `aprobaciones` | — | Libera o bloquea conversión | Aprobación auditada | `sucursal_id` | `created_at`, `revisado_at` | COMPLETE | COMPLETE | Una solicitud por cotización. |
| Cotizaciones | Conversión a pedido | Vendor/Admin | `pedidos` | `pedido_items`, `pedido_item_extras` | — | Pedido y cotización auditados | Heredada | `created_at` | COMPLETE | COMPLETE | Copia snapshots; no recalcula catálogo. |
| Cotizaciones | Eliminación lógica rechazada | Vendor | `cotizaciones.estado=cancelada` | Aprobación/historial conservados | — | Cotización auditada | Heredada | `updated`/auditoría | COMPLETE | COMPLETE | RLS y trigger permiten solo rechazo vigente y no borran físico. |
| Pedidos | Anticipo | Vendor/Admin | `anticipos` | `movimientos_caja` | Ingreso/afectación de saldo | Anticipo auditado | Del pedido | `created_at` | COMPLETE | COMPLETE | RPC idempotente. |
| Pedidos | Entrega/cancelación/venta final | Admin | `entregas`, `pedidos`, `ventas` | `venta_items` | Inventario/caja/comisión según flujo | Registros auditados | Del pedido | `created_at` | COMPLETE | COMPLETE | Venta final conserva pedido origen. |
| Crédito | Solicitud/aprobación/rechazo | Vendor/Admin | `aprobaciones`, `clientes` | — | Cambia autorización solo al aprobar | Aprobación auditada | De solicitud | created/reviewed | COMPLETE | COMPLETE | Límite no se modifica desde React. |
| Crédito | Cuenta/pago/saldo | Vendor/Admin | `cuentas_cobrar`, `pagos_credito` | — | Caja si aplica | Pagos auditados | De venta/sesión | `created_at` | COMPLETE | COMPLETE | Saldo se actualiza por RPC con bloqueo e idempotencia. |
| Comisiones | Generación | PostgreSQL | `comisiones` | — | Relación con venta | Parcial | Heredada de venta | `created_at`, `periodo` | COMPLETE | COMPLETE | Base, porcentaje, monto y venta quedan relacionados; no requiere duplicar cada cálculo en bitácora. |
| Metas | Meta sucursal | Admin | `metas_sucursal` | `metas_vendedor` derivados | — | Parcial | `sucursal_id` | `created_at` | COMPLETE | PARTIAL | La operación queda persistida; no hay trigger de auditoría específico para metas. Vendor lee la meta de sucursal real. |
| Diseños | Crear/editar | Admin | `disenos` | `diseno_extras`, `archivos` | — | Diseño auditado | — | `created_at` | COMPLETE | PARTIAL | Relación de extras y metadata de archivo persisten; tablas de relación/archivo no tienen trigger crítico propio. |
| Diseños | Imagen | Admin | `archivos`, `disenos` | R2 | — | Metadata de archivo | — | `created_at` | PARTIAL | PARTIAL | Compresión cliente-side está completa; disponibilidad final depende de secretos, bucket y CORS R2. |
| Aprobaciones | Solicitar/decidir | Vendor/Admin | `aprobaciones` | Registro referenciado | Depende del tipo | Trigger de aprobación | Campo de sucursal | created/reviewed | COMPLETE | COMPLETE | Conserva solicitante, administrador, decisión, notas y fechas. |

## Cierre diario

Admin puede consultar ventas, caja/movimientos, gastos, inventario/kardex, comisiones, cotizaciones, pedidos, aprobaciones y crédito desde las tablas/RPC actuales. Los filtros por fecha y sucursal existen de forma desigual: reportes, caja, auditoría e inventario tienen filtros; algunas listas administrativas requieren ampliar filtros para usuario/fecha. Eso queda documentado como `PARTIAL`, no como dato perdido.

## Fuente local temporal permitida

`offlineDB.conteos` funciona únicamente como cola temporal del conteo físico y se elimina después de la sincronización exitosa mediante `guardar_conteo_batch`. No es la fuente de verdad de ventas, caja, inventario, crédito, aprobaciones, comisiones o cotizaciones enviadas.
