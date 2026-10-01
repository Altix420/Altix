# ALTIX V1 Production Completion Matrix

Fecha de auditoria: 2026-09-30  
Alcance: repositorio local `/Users/chriis/ALTIX`, Supabase local y frontend local.  
Regla: `COMPLETE` significa implementado y validado en el alcance indicado; no significa que exista infraestructura productiva configurada.

## Criterio

| Estado | Significado |
| --- | --- |
| COMPLETE | Contrato de datos, seguridad, servicio/UI y validacion disponible en el alcance declarado. |
| PARTIAL | Existe implementacion, pero falta cobertura, prueba E2E, UX o parte del contrato. |
| MISSING | No existe una implementacion suficiente. |
| BLOCKED | El codigo puede estar listo, pero una dependencia externa impide probar o entregar. |
| NOT REQUIRED | Fuera del V1 contratado o expresamente desactivado. |

## Matriz por dominio

| Feature | Tablas | RPC / Edge | RLS | Admin UI | Vendor UI | Trazabilidad | Tested E2E | Production ready | Gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auth y perfiles | `auth.users`, `profiles` | Supabase Auth | `profiles`, rutas protegidas y helpers de rol | Login, rutas Admin | Login, rutas Vendor | `profiles`, auditoria de cambios sensibles | PARTIAL: seed local | PARTIAL | Falta prueba con usuarios reales y configuracion PROD. |
| Usuarios activos/inactivos | `profiles.activo` | Validacion en rutas/RPC | Parcial por helper y politicas | Consulta de vendedores | Acceso bloqueado por ruta | Auditoria de cambios | PARTIAL | PARTIAL | Requiere prueba RLS con usuario inactivo en cada rol. |
| Sucursales y asignaciones | `sucursales`, `usuario_sucursal` | Resolucion de sucursal | Politicas por asignacion donde aplica | Filtros y metas | Contexto de sucursal | Auditoria de asignaciones | PARTIAL | PARTIAL | Falta corrida de aislamiento con 3 Admin y 7 Vendor. |
| Clientes finales | `clientes` | Insercion UI / RPC donde aplica | Lectura autenticada y filtros de vendedor | CRUD soportado | Alta y consulta permitida | `created_at`, ventas y cotizaciones | PARTIAL | PARTIAL | Falta prueba completa de reasignacion e historial. |
| Mayoristas y cartera | `clientes`, `cuentas_cobrar`, `pagos_credito` | `reasignar_cartera`, credito y pagos | Politicas por vendedor/admin | Cartera y terminos | Clientes asignados | Pagos, cuentas, auditoria | PARTIAL | PARTIAL | Falta prueba multi-sucursal y datos de onboarding reales. |
| Productos, precios y costos | `productos`, `productos_costos`, `categorias` | Servicios Admin | Costos protegidos por RLS/RPC | Catalogo y costos | Catalogo comercial | Costo/precio historico en lineas | PARTIAL | PARTIAL | Falta validar reglas de descuento completas contra especificacion final. |
| Disenos vendibles | `disenos`, `archivos`, `inventarios` | `registrar_archivo`, Edge R2 | Admin escribe; Vendor consulta permitido | CRUD, costo, precio, extras | Consulta de catalogo | Metadata y relaciones | PARTIAL | BLOCKED | R2 externo, CORS, secretos y carga binaria real. |
| Extras | `extras`, `cotizacion_item_extras` | `crear_cotizacion` | Admin mantiene catalogo | CRUD | Seleccion en cotizacion | Snapshot economico | PARTIAL | PARTIAL | Falta ciclo productivo con catalogo real. |
| Lanzamientos | `lanzamientos` | Servicios existentes | Politicas existentes | Consulta/gestion limitada | Consulta donde aplica | Fechas y archivo si aplica | NO | NOT REQUIRED | Flujo simple, no es bloqueo V1 operativo. |
| Ventas | `ventas`, `venta_items`, `movimientos_inventario`, `movimientos_caja` | `registrar_venta` | RLS y RPC | Ventas, detalle, reportes | POS | `operation_id`, movimientos y auditoria | PARTIAL | PARTIAL | Falta secuencia manual completa con datos reales y prueba de reintento. |
| Inventario por sucursal | `inventarios` | `registrar_entrada_inventario`, venta, traslado, devolucion | Branch/RPC | Inventario y filtros | Consulta/operacion permitida | Movimientos | PARTIAL | PARTIAL | Falta matriz E2E de todas las ramas y RLS real. |
| Traslados | `traslados`, `traslado_items`, movimientos | `trasladar_inventario` | RPC atomico | Formulario y filtros | No requerido como UI independiente | Origen/destino | PARTIAL | PARTIAL | Falta prueba de concurrencia y rechazo completo. |
| Devoluciones | `devoluciones`, `devolucion_items` | `registrar_devolucion` | RPC atomico | Accion desde venta | Consulta donde aplica | Referencia original y ajuste | PARTIAL | PARTIAL | Falta prueba financiera y ajuste negativo de comision en ciclo completo. |
| Defectuosos | `defectuosos` | Registro existente | Admin/RPC segun flujo | Registro y consulta | No modifica stock disponible | Historico de control | PARTIAL | PARTIAL | Falta prueba confirmatoria de que no altera stock. |
| Ajustes de inventario | `solicitudes_ajuste_inventario`, movimientos | Solicitud/aprobacion | Aprobacion Admin | Centro de aprobaciones | Solicitud si aplica | Solicitante, aprobador, razon | PARTIAL | PARTIAL | Falta prueba E2E de rechazo/aprobacion con dos actores. |
| Conteo fisico | `conteos`, `conteos_detalle` y Dexie temporal | `guardar_conteo_batch` | Admin/RPC | Conteo y sincronizacion | No bloquea ventas | Responsable, fecha, stock sistema | PARTIAL | PARTIAL | Falta conflicto/versionado y corrida con ventas concurrentes. |
| Caja por sucursal | `sesiones_caja`, `movimientos_caja`, `gastos` | `abrir_caja`, `cerrar_caja`, gastos | Sucursal/sesion | Caja, movimientos, gastos | Apertura/cierre y gasto | Sesion, usuario, movimientos, reintegro | PARTIAL | PARTIAL | Falta prueba ciega completa en PROD y restauración real. |
| Gastos | `gastos`, movimientos de caja | RPC de gasto/aprobacion/reintegro | Admin/Vendor segun politica | Gasto y aprobacion | Solicitud | Estado, aprobador, egreso, reintegro, operation_id | COMPLETE local | PARTIAL PROD | Requiere validación manual multirol en PROD. |
| Anticipos | `anticipos`, `movimientos_caja` | `registrar_anticipo_v1` | Relacion vendedor/orden/sesion | Consulta/operacion | Registro | `operation_id`, orden, caja | PARTIAL | PARTIAL | Falta prueba de reintento y cancelacion con saldo a favor. |
| Pagos | `pagos`, `pagos_credito` | `registrar_pago` y pagos de credito | Cuenta/sucursal | Pagos | Pago permitido | `operation_id`, cuenta, usuario | PARTIAL | PARTIAL | Falta cubrir todos los metodos y retry con red interrumpida. |
| Cotizaciones | `cotizaciones`, items, extras | `crear_cotizacion` | Estado protegido | Consulta y aprobacion | Constructor | Snapshot, vendedor, sucursal | PARTIAL | PARTIAL | Falta ciclo completo con logout/login y cambio de precios. |
| Aprobacion de descuento | `aprobaciones` | `solicitar_aprobacion`, `resolver_aprobacion` | Admin decide | Centro de aprobaciones | Estado readonly/solicitud | Una solicitud por version | PARTIAL | PARTIAL | Falta prueba multi-actor y condiciones stale en entorno productivo. |
| Pedidos | `pedidos`, `pedido_items` | Conversion y estados autorizados | Estado protegido | Consulta/acciones | Flujo de pedido | Cotizacion, anticipo, entrega | PARTIAL | PARTIAL | Falta secuencia completa cotizacion -> pedido -> pago -> entrega. |
| Entregas | `entregas`, ventas/pedidos | `marcar_entrega`, `marcar_pedido_entregado` | Usuario/sucursal | Accion autorizada | Accion autorizada | Timestamp, actor, referencia | PARTIAL | PARTIAL | Falta validar entrega parcial solo si el negocio la requiere. |
| Credito | `cuentas_cobrar`, clientes, pedidos | Venta crédito, `registrar_pago` | Admin/Vendor por cartera | Términos y cartera | Venta/pago permitido | Cuenta, pedido/venta, vencimiento, saldo | COMPLETE local | PARTIAL PROD | Falta ciclo multirol y multi-sucursal en PROD. |
| Recordatorios / cron | `recordatorios` | `revisar_vencimientos_credito`, pg_cron | Funcion controlada | Consulta | No aplica | Cuenta, fecha, idempotencia | PARTIAL local | BLOCKED | Falta configurar y observar cron en Supabase PROD. WhatsApp permanece OFF. |
| Saldos a favor | `saldos_favor`, movimientos | `aplicar_saldo_favor`, `registrar_pago`, devolución | RPC y referencia de cartera | Consulta/aplicacion | Aplicación en pago | Ledger, actor, operation_id | COMPLETE local | PARTIAL PROD | Falta validación manual de reversa y PROD. |
| Comisiones | `comisiones`, reglas, ajustes | `generar_comision` | Lectura controlada | Consulta | Dashboard | Venta, tasa, base, periodo | PARTIAL | PARTIAL | Falta secuencia retail/wholesale/entrega/devolucion completa. |
| Metas | `metas_sucursal`, `metas_vendedor` | `configurar_meta_sucursal`, dashboard Vendor | Admin escribe, Vendor consulta | Meta por sucursal | Meta de sucursal | Periodo y ventas | PARTIAL | PARTIAL | Falta ejecutar Admin -> nuevo login Vendor y comparar sucursal A/B. |
| Auditoria | `bitacora_auditoria` | Triggers | Admin lectura | Auditoria | No aplica | Actor, tabla, referencia, fecha | PARTIAL | PARTIAL | Falta revisión de cobertura de cada cambio sensible en PROD. |
| Reportes | Ventas, costos, caja, inventario, credito | RPCs de dashboard/reportes | Filtros/RLS | Reportes y exportes | Dashboard Vendor | Periodo/sucursal/vendedor | PARTIAL | PARTIAL | Falta conciliacion E2E contra un día simulado. |
| CSV | Datos de dominio | Export UI | Respeta filtros visibles | Inventario y reportes | No requerido | Fecha/filtros en contenido | PARTIAL | PARTIAL | Falta abrir y verificar todos los CSV en Excel/Numbers. |
| Impresion | Datos persistidos | Browser print | Datos ya autorizados | 58/80/PDF | 58/80/PDF | Folio y referencia | PARTIAL | PARTIAL | Falta prueba de impresora y formatos en dispositivo real. |
| Manejo de errores | N/A | `friendlyAdminError` y mensajes de servicio | Errores del backend | Estados loading/error | Estados loading/error | Logs/errores | PARTIAL | PARTIAL | Falta catálogo completo de códigos y desconexion. |
| Idempotencia | Columnas `operation_id` | RPCs financieras | Restricciones UNIQUE | Servicios generan IDs | Servicios generan IDs | Reintentos | PARTIAL | PARTIAL | Falta prueba sistemática de todas las operaciones. |
| PWA / offline | Dexie para conteo/drafts | Service worker de app shell | N/A | Parcial | Parcial | Estado local temporal | PARTIAL local | PARTIAL | Manifest, redirect y service worker están versionados; falta validar instalación/dispositivo y assets de producción. |
| Netlify / SPA | N/A | N/A | N/A | Rutas locales | Rutas locales | Deploy logs | PARTIAL local | PARTIAL | `netlify.toml` y redirect SPA están versionados; falta sitio, variables, HTTPS y smoke test productivo. |
| DEV/PROD | Migraciones/config | Supabase Edge | Separacion por proyecto | Env local | Env local | Version de deploy | NO | BLOCKED | Solo hay evidencia local; falta proyecto PROD y pipeline. |
| R2 productivo | `archivos` | `r2-presigned-url` | Edge secrets | Compresion y upload | Lectura | Path UUID y metadata | NO | BLOCKED | Bucket, secretos, CORS y prueba PUT/GET reales. |
| Backups/restore | N/A | Herramientas externas | N/A | N/A | N/A | Manifiesto y version | NO | MISSING | No existe evidencia de dump/restauracion probada. |
| Onboarding/import | Seed local | N/A | N/A | Configuracion parcial | N/A | Datos iniciales | NO | MISSING | Falta runbook de importacion y validacion de saldos/inventario. |

## Estado de salida

ALTIX tiene una base V1 funcional local y una arquitectura transaccional clara, pero no cumple todavía la definición de `PRODUCTION READY` del cierre solicitado. Los bloqueos críticos para entrega real son:

1. R2 productivo configurado y probado.
2. Proyecto Supabase PROD, variables, migraciones, secretos y separación DEV/PROD.
3. Netlify, SPA redirects, HTTPS y smoke test remoto.
4. Backup y restore verificados.
5. Corrida E2E real multi-rol/multi-sucursal con evidencia, incluyendo pagos, entrega, devolución, caja, crédito y comisión.
6. RLS/usuarios inactivos probados con cuentas de prueba controladas.
7. PWA/offline de entrega, si permanece dentro del contrato V1.

No se deben llamar `COMPLETE` esos puntos solo porque TypeScript, lint o build pasen.
