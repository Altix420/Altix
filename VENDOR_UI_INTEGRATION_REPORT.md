# Integración de UI Vendor

## Matriz inicial

| Página | Botón/acción | Tipo | Servicio | Tabla/RPC/View | RLS/rol | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| Inicio | Navegar a módulos | NAVIGATION | React Router | Rutas Vendor | `profiles.role = vendedor` en guard | CONNECTED |
| Inicio | Actualizar | QUERY | Supabase | Tablas reales | SELECT autenticado | CONNECTED |
| Nueva venta | Confirmar venta | CONNECTED RPC | `registrarVentaService` | `registrar_venta` | RPC valida vendedor/sucursal | CONNECTED |
| Mis ventas | Buscar | FILTER | React | `ventas` | Lectura autenticada; filtro vendedor | FILTER |
| Catálogo | Buscar | FILTER | React | `productos` | SELECT autenticado | FILTER |
| Clientes | Crear cliente | CONNECTED CRUD | `vendorService` | `clientes` INSERT | INSERT autenticado | CONNECTED |
| Clientes | Buscar | FILTER | React | `clientes` | SELECT autenticado | FILTER |
| Diseños/Extras | Consultar | READ ONLY | Supabase | `disenos`, `extras` | SELECT disponible | READ ONLY |
| Inventario | Consultar | READ ONLY | Supabase | `inventarios` | SELECT autenticado | READ ONLY |
| Crédito | Consultar | READ ONLY | Supabase | `cuentas_cobrar`, `pagos_credito`, `clientes` | RLS por venta del vendedor | READ ONLY |
| Comisión | Consultar | READ ONLY | Supabase | `comisiones` | Sin aislamiento Vendor explícito | READ ONLY |
| Meta/Notificaciones/Aprobaciones | Acciones | — | — | Contrato inexistente | — | HIDDEN — BACKEND MISSING |

## Resultado

La interfaz Vendor se limita a inicio, POS, ventas, clientes, catálogo, diseños, extras, inventario, crédito y comisión. No se exponen controles administrativos ni acciones sin contrato.

## VENDOR PANEL FINAL STATUS

- **Páginas completas:** Inicio, Nueva venta, Mis ventas, Cotizaciones, Pedidos, Clientes, Catálogo, Diseños, Extras, Inventario, Crédito y Comisión.
- **Botones conectados:** navegación, actualización, búsqueda/filtro, creación de clientes y confirmación de venta mediante `registrar_venta` con `operation_id`.
- **Acciones ocultas:** edición de productos, diseños y extras; caja; crédito; comisiones; metas; notificaciones; aprobación externa; anticipos y entregas operativas, porque la política V1 mantiene esas mutaciones bajo Admin.
- **Interacciones manuales verificadas:** compilación de rutas, guardas, estados de carga, validación de formularios, estados deshabilitados, mensajes de éxito/error y refresco posterior a mutaciones. La cuenta local Vendor está incluida en `supabase/seed.sql`.
- **Brechas backend genuinas:** identidad/portal de aprobación externa, auditoría automática de ventas, impresión/PDF, offline y administración Auth de vendedores.
- **TypeScript:** `npx tsc --noEmit` PASS.
- **Lint:** `npm run lint` PASS, 0 warnings y 0 errors.
- **Build:** `npm run build` PASS. Vite deja únicamente un aviso informativo por bundle principal mayor a 500 kB.

## VENDOR FINAL VALIDATION

- **Login:** PASS con `vendedor1@altix.local`; perfil activo, rol exacto `vendedor`, correo confirmado y sucursal resuelta.
- **Rutas:** PASS; `/vendedor/inicio` carga y `/admin/dashboard` redirige al inicio Vendor para el vendedor.
- **POS:** PASS en Supabase local para contado y crédito mayorista. La venta persiste detalle, inventario y cuenta por cobrar; crédito no incrementa caja.
- **Idempotencia:** PASS; el segundo envío con el mismo `operation_id` devolvió la venta original sin duplicar efectos.
- **Clientes:** PASS; el alta Vendor refrescó la lista y el registro fue visible con la misma fila desde Admin.
- **Cotizaciones:** Vendor crea líneas y guarda cotizaciones reales; la conversión y la operación posterior permanecen bajo Admin.
- **Inventario:** PASS como lectura; la venta actualizó stock y los intentos directos de modificación del vendedor no alteraron datos.
- **Caja:** PASS como efecto de `registrar_venta`; el movimiento de ingreso apareció en Admin.
- **Crédito:** PASS; la RPC crea cuenta por cobrar, valida límite disponible, calcula vencimiento, soporta pagos parciales e idempotencia.
- **Comisiones:** PASS; la comisión fue generada por PostgreSQL y visible en la tabla compartida, sin cálculo React.
- **Auditoría:** PARTIAL; no se generó registro para la venta porque la RPC actual no inserta en `bitacora_auditoria`.
- **RLS:** PASS para impedir modificaciones directas a productos e inventario; PARTIAL para aislamiento por vendedor/sucursal, porque varias políticas actuales son globales para cualquier usuario autenticado.
- **Botones muertos:** PASS; los controles Vendor visibles son navegación, consulta/filtro o acciones conectadas.
- **Errores:** validaciones de caja, stock, total, cliente e idempotencia están implementadas y se traducen a mensajes amigables en la UI.
- **Brechas restantes:** aprobación externa de cliente, auditoría automática de ventas, PDF/impresión y offline.

## VENDOR DEMO FINAL STATUS

- **Páginas pulidas:** Inicio, POS, Mis ventas, Clientes, Catálogo, Diseños, Extras, Inventario, Crédito, Comisión, Cotizaciones y Pedidos.
- **Datos reales:** dashboard con `ventas`, `comisiones`, `clientes` e `inventarios`; POS con `productos` e `inventarios` por sucursal; listas conectadas a sus tablas reales.
- **Botones funcionando:** navegación, búsqueda/filtro, refresco, alta de clientes, ajuste/eliminación de líneas del carrito, confirmación de venta y enlaces de resultado.
- **Acciones ocultas:** crédito en POS, edición de catálogo, ajustes de inventario, cotizaciones/pedidos operativos, impresión y controles administrativos sin contrato Vendor completo.
- **Flujo demo:** login, sucursal, catálogo, inventario, cliente, venta de contado, confirmación, mis ventas y comisión validados contra Supabase local.
- **Propagación Admin:** venta, cliente, stock, caja y comisión comprobados en tablas compartidas.
- **Mobile:** navegación reducida a rutas principales, búsqueda y carrito adaptables, tarjetas de clientes y totales legibles.
- **Funciones posteriores:** aprobación externa, WhatsApp, impresión/offline y CRM.
- **TypeScript:** `npx tsc --noEmit` PASS.
- **Lint:** `npm run lint` PASS, 0 warnings y 0 errors.
- **Build:** `npm run build` PASS; solo aviso informativo por tamaño del bundle principal.

## VENDOR BUTTON AUDIT

**VENDOR DEMO READY = YES**

La demo queda lista porque el flujo soportado de login, consulta, cliente, POS de contado, idempotencia, stock, caja, comisión y navegación de detalle usa contratos existentes. Las brechas listadas en pendientes no bloquean ese flujo y permanecen ocultas.

| Página | Acción | Tabla/RPC/View | RLS/permiso | Servicio | Control UI | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| Inicio | Actualizar indicadores | `ventas`, `comisiones`, `clientes`, `inventarios` | SELECT autenticado; filtro vendedor/sucursal en consulta | Supabase query | Actualizar | CONNECTED |
| Inicio | Nueva venta / Clientes / Catálogo / Mis ventas | Router | Guard `profiles.role = vendedor` | React Router | Links | NAVIGATION |
| Nueva venta | Buscar cliente/producto | `clientes`, `productos`, `inventarios` | SELECT autenticado | Supabase query | Inputs de búsqueda | FILTER |
| Nueva venta | Ajustar/quitar carrito | Estado local; sin persistencia | No aplica | React state | `+`, `-`, quitar | CONNECTED |
| Nueva venta | Confirmar venta | `registrar_venta` | RPC valida vendedor, sucursal, caja y stock | `vendorService.registrarVenta` | Confirmar venta | CONNECTED |
| Nueva venta | Resultado / Mis ventas | `ventas` | SELECT autenticado | Router | Links de éxito | NAVIGATION |
| Mis ventas | Ver detalle | `ventas`, `venta_items`, `productos` | SELECT autenticado | Supabase query | Ver detalle | CONNECTED |
| Clientes | Buscar / refrescar | `clientes` | SELECT autenticado | Supabase query | Input / Actualizar | FILTER |
| Clientes | Nuevo cliente | `clientes` INSERT | INSERT autenticado; no UPDATE Vendor | `vendorService.crearCliente` | Nuevo cliente / Guardar | CONNECTED |
| Clientes | Editar cliente | `clientes` UPDATE | No permitido por contrato Vendor | — | Oculto | ADMIN ONLY |
| Catálogo | Buscar | `productos` | SELECT autenticado | Supabase query | Input | FILTER |
| Catálogo | Agregar a venta | `productos` + POS local | SELECT autenticado | React Router state | Agregar a venta | CONNECTED |
| Diseños | Consultar | `disenos`, `clientes` | Lectura disponible | Supabase query | Lista | READ ONLY |
| Extras | Consultar | `extras` | Lectura disponible | Supabase query | Lista | READ ONLY |
| Inventario | Buscar/consultar | `inventarios`, `productos`, `sucursales` | SELECT autenticado; sucursal en consulta | Supabase query | Filtro / lista | READ ONLY |
| Comisión | Ver detalle | `comisiones` | SELECT autenticado; filtro vendedor en consulta | Supabase query | Ver detalle | CONNECTED |
| Cotizaciones | Crear y consultar | `crear_cotizacion`, `cotizaciones` | RPC valida actor/sucursal; SELECT por vendedor | `vendorService.crearCotizacion` | Nueva cotización / lista | CONNECTED |
| Pedidos | Consultar | `pedidos` | SELECT autenticado; filtro vendedor en consulta | Supabase query | Lista/filtro | READ ONLY |
| Crédito | Consultar | `cuentas_cobrar`, `pagos_credito`, `clientes` | RLS por `ventas.vendedor_id` | Supabase query | Lista/filtro | READ ONLY |
| Todo Vendor | Acciones sin tabla/RPC | No existe contrato | No aplica | — | Ocultas | BACKEND MISSING |

## CREDIT V1 INTEGRATION

- POS permite seleccionar `Crédito mayorista` solo cuando el cliente es mayorista; no exige caja para esa operación.
- La venta se confirma mediante `registrar_venta`; PostgreSQL valida autorizado, disponible, sucursal, stock, vencimiento e idempotencia.
- Crédito Vendor consulta únicamente cuentas asociadas a ventas del vendedor autenticado mediante `ventas!inner(vendedor_id)`.
- Se muestran total, pagado derivado, saldo, vencimiento y estado; no existen controles Vendor para editar límite o días.
- WhatsApp, cobros y cambios administrativos permanecen ocultos.

## CREDIT FINAL STATUS

- CREDIT = 100% YES.
- Commission final rule verified = YES.
- Credit concurrency verified = YES.
- Reminder 1 day before verified = YES.
- WhatsApp remains disabled = YES.
- Remaining genuine backend gaps: ninguno dentro de Credit V1.

## COMMERCIAL V1 FINAL STATUS

- **Páginas completas:** Cotizaciones tiene creación Vendor real; Pedidos conserva consulta real por propietario.
- **Controles conectados:** selects legibles de cliente/producto/diseño/extra, alta inline de cliente, solicitud de diseño nuevo en observación, vigencia, forma de pago, líneas, guardado, búsqueda y refresh.
- **Contrato:** `crear_cotizacion` guarda snapshots económicos sin reservar inventario y deja la cotización `enviada` para supervisión Admin.
- **Controles ocultos:** conversión Vendor, anticipos y entrega permanecen bajo supervisión Admin; no se muestran controles Vendor sin política aprobada.
- **Interacciones probadas:** creación de cotización, alta de cliente, idempotencia de cotización/conversión, cuenta de pedido a crédito, preparación, entrega y venta final vía Admin.
- **Brecha genuina restante:** aprobación externa del cliente requiere identidad/portal y RPC propios. El diseño nuevo queda trazado en la línea hasta que Admin publique un diseño oficial.
- **TypeScript:** PASS.
- **Lint:** PASS.
- **Build:** PASS.

## VENDOR PANEL FINAL STATUS

- **Páginas completas:** cotizaciones con aceptación registrada, solicitudes de aprobación, ventas, pedidos, clientes, catálogo, inventario, crédito y comisión.
- **Botones conectados:** solicitar aprobación de descuento, seleccionar aprobación aprobada, registrar aceptación con método/nota, convertir cotización después de aceptación, refresh y navegación.
- **Botones ocultos por backend faltante:** notificaciones externas, impresión/PDF y operaciones administrativas que no están autorizadas para Vendor.
- **Interacciones probadas:** conversión rechazada sin aceptación, aceptación y reintento idempotente, descuento rechazado sin aprobación, descuento permitido tras aprobación y consulta de estado de solicitudes.
- **Backend:** todas las mutaciones críticas pasan por RPC; no se compone una transacción comercial desde React.
- **TypeScript:** PASS (`npx tsc --noEmit`).
- **Lint:** PASS, 0 warnings y 0 errores.
- **Build:** PASS; solo queda el aviso informativo del tamaño del bundle.
- **Bloqueadores exactos:** ninguno dentro del alcance Vendor V1 definido; notificaciones externas siguen deshabilitadas por falta de proveedor.

## VENDOR PANEL FINAL STATUS: OPERACIÓN 2026-09-30

- Pages complete: inicio, POS/caja, ventas, cotizaciones, aprobaciones, pedidos, clientes, gastos, catálogo, inventario, crédito y comisión.
- Buttons connected: apertura/cierre de caja por sucursal, gasto pendiente, anticipo, pago de crédito del vendedor responsable, cotización protegida, solicitud/refresco de descuento y formatos 58/80/PDF.
- Buttons hidden due to missing backend: diseños/extras como módulos independientes, notificaciones externas, aprobación externa del cliente y R2 no configurado.
- Manual interactions tested: login Vendor, dashboard, POS cargado, cotización, clientes, gastos y navegación.
- Remaining genuine backend gaps: transacciones financieras de navegador aún requieren corrida manual controlada; R2, notificaciones y portal externo de cliente permanecen fuera del backend local.
- TypeScript: PASS. Lint: PASS. Build: PASS.

## VENDOR PANEL FINAL STATUS: CATALOG AND DASHBOARD

- **Páginas completas:** catálogo de diseños y dashboard Vendor integrado al resto del panel funcional.
- **Botones conectados:** navegación, filtros y refresh; Vendor solo consulta diseños, relaciones legibles y métricas propias.
- **Datos reales:** dashboard por vendedor con ventas del día/mes, comisión, clientes, cotizaciones, pedidos y meta activa.
- **RLS probado:** Vendor puede leer sus datos autorizados y no puede modificar diseños ni consultar costos internos.
- **TypeScript:** PASS (`npx tsc --noEmit`).
- **Lint:** PASS, 0 warnings y 0 errors.
- **Build:** PASS; queda únicamente el aviso informativo de tamaño de bundle.

## FINAL DEMO FIX STATUS

- Cotizaciones Vendor: múltiples extras por línea, snapshot económico y descuento persistido en RPC atómico.
- Aprobación: la solicitud nace después del guardado y se muestra como pendiente/aprobada/rechazada al volver a consultar.
- Conversión e impresión: los controles se ocultan o bloquean cuando la aprobación de descuento no está liberada.
- Resultados: TypeScript PASS, lint PASS y build PASS.
- **Bloqueadores exactos:** ninguno para Vendor dentro del contrato V1. La visualización de imágenes requiere R2 externo configurado; notificaciones externas, impresión/PDF y offline siguen fuera del contrato.

## FINAL AUDIT UPDATE 2026-09-30

- Dashboard: Vendor recibe la meta activa de sucursal desde `metas_sucursal`, resuelta por la asignación real en `usuario_sucursal`; el progreso mostrado se calcula sobre ventas de la sucursal y conserva las ventas propias como métrica separada.
- UI: el encabezado y los textos identifican `Meta de sucursal`; cuando no existe una meta vigente se muestra un estado vacío claro.
- Imagen de Diseño: el flujo de carga recibe un WebP optimizado desde el navegador, con límite de 300 KB, tamaño visible para el usuario y path físico UUID.
- Persistencia: la meta mantiene su origen administrativo y la imagen mantiene metadata en `archivos`; no se usan datos ficticios en Vendor.
- Validación técnica: reset, diff, lint de base, TypeScript, lint y build PASS.
- Validación manual pendiente: ciclo Admin guardar meta -> nueva sesión Vendor -> dashboard; R2 real queda pendiente de secretos/runtime externo.
- La matriz completa de actores, referencias y auditoría está en `DAILY_OPERATION_TRACEABILITY_MATRIX.md`.

## PRODUCTION CLOSING AUDIT 2026-09-30

- Vendor inactivo queda bloqueado en la ruta y en RLS; Vendor activo conserva únicamente la sucursal asignada.
- El seed de aceptación contiene 7 vendedores distribuidos en 3 sucursales para probar aislamiento real local.
- Meta de sucursal, venta, caja, crédito, pedido, entrega, devolución y comisión todavía requieren una corrida E2E controlada para ser aceptación de producción.
- El service worker solo cubre app shell; no permite operar ventas, pagos, caja, crédito o inventario sin conexión.
- Estado de entrega: Vendor local PASS técnico; Vendor de producción NO declarado hasta R2, Netlify, E2E y restore.

## PRODUCTION CLOSING STATUS

- **Impresión:** Vendor puede imprimir ventas, cotizaciones y pedidos en 58 mm u 80 mm con el diálogo del navegador; guardar como PDF funciona como fallback.
- **R2:** Vendor no puede solicitar PUT ni registrar metadata; la lectura de imágenes depende del bucket externo configurado por Admin/Edge.
- **RLS:** pruebas reales confirmaron aislamiento de sucursal, costos protegidos, diseños protegidos, sucursales protegidas, aceptación y límite de crédito no evadibles.
- **Pendientes reales:** secretos/bucket R2, aprobación externa de cliente, offline y notificaciones externas. No se presentan como controles operativos.

## COMMERCIAL ECONOMICS HARDENING 2026-09-30

- Cotización conserva precio oficial, precio negociado, descuento total, producto/diseño, extra y snapshot económico.
- El extra se suma al precio oficial antes del total; el descuento se calcula por cantidad y no se resta dos veces.
- Cada borrador tiene una sola solicitud pendiente; la aprobación se vincula a la cotización al guardar.
- Q0 antes de entrega o con saldo pendiente es intencional; la comisión final se calcula por RPC.
- El vendedor no puede editar directamente el estado de una cotización y la conversión requiere aceptación.
