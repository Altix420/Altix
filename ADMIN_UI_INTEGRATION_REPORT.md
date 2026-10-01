# Integración de UI administrativa

## Alcance V1

El panel Admin opera sobre Supabase local con servicios tipados y RPC transaccionales. Las operaciones de inventario y caja no editan stock ni saldos esperados directamente desde React.

## Páginas completas

- Dashboard, ventas, cotizaciones, pedidos, clientes, mayoristas, créditos.
- Caja, movimientos de caja, gastos, inventario, Kardex, defectuosos, traslados y conteo físico.
- Diseños, extras, productos de consulta, vendedores, sucursales, comisiones, aprobaciones, reportes, auditoría y configuración.
- La pestaña de Lanzamientos no se muestra porque no existe una entidad de negocio para lanzamientos.

## Acciones conectadas

| Superficie | Acción | Contrato real |
| --- | --- | --- |
| Caja | Abrir sesión | `abrir_caja` |
| Caja | Cerrar con denominaciones | `cerrar_caja` |
| Caja | Ingreso/egreso autorizado | `registrar_movimiento_caja` |
| Caja | Registrar gasto | `registrar_gasto` |
| Gastos | Aprobar/rechazar sin borrar | `resolver_gasto` |
| Inventario | Entrada | `registrar_entrada_inventario` |
| Inventario | Traslado atómico y Kardex doble | `trasladar_inventario` |
| Inventario | Defectuoso histórico sin baja | `registrar_defectuoso` |
| Inventario | Solicitar ajuste | `solicitar_ajuste_inventario` |
| Aprobaciones | Aprobar/rechazar ajuste | `aprobar_ajuste_inventario`, `rechazar_ajuste_inventario` |
| Ventas | Devolución con reposición y Kardex | `registrar_devolucion` |
| Conteo | Crear y guardar lote parcial/final | `crear_conteo`, `guardar_conteo_batch` |
| Ventas | Venta con stock/caja atómicos | `registrar_venta` |
| Reportes/Inventario | Descarga CSV administrativa | Consultas reales RLS de inventario, ventas, Kardex, traslados, ajustes y defectuosos |
| Catálogo | Diseños y extras | CRUD existente con campos reales |

## Controles sin contrato y por eso ocultos

- Lanzamientos: no existe tabla ni RPC.
- Alta administrativa de usuarios Auth, vendedores, roles y asignaciones: requiere contrato Auth administrativo.
- Edición directa de stock, caja, sesiones cerradas, créditos, comisiones y auditoría: no se muestra.
- Fotos en exportación: excluidas por especificación.

## Pruebas locales ejecutadas

- `supabase db reset`: PASS.
- `supabase db diff --local`: PASS, sin cambios pendientes.
- `supabase db lint --local`: PASS, sin errores de esquema.
- Flujo SQL transaccional: entrada, apertura, venta, traslado, devolución, solicitud/aprobación de ajuste, defectuoso sin cambio de stock, conteo parcial/final, gasto y cierre con denominaciones: PASS.
- RLS vendedor: solo devolvió inventario de la sucursal asignada; intento de entrada en otra sucursal: HTTP 400 no autorizado.
- RLS Admin: lectura consolidada de inventario en ambas sucursales: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS, 0 warnings y 0 errores.
- `npm run build`: PASS. Vite conserva únicamente la advertencia informativa del tamaño del bundle.

## ADMIN PANEL FINAL STATUS

### Pages complete

Admin está completo para el alcance operativo V1 de inventario y caja: stock por sucursal, entradas, ventas, traslados, devoluciones, ajustes aprobables, defectuosos, Kardex, conteos físicos, exportación, sesiones, movimientos, gastos, arqueo y cierre.

### Buttons connected

Todo control visible es navegación, consulta/filtro, exportación o mutación respaldada por CRUD/RPC. Las mutaciones muestran estado de carga, traducen errores a mensajes de usuario, cierran el modal solo después del éxito y refrescan la consulta afectada.

### Buttons hidden due to missing backend

Lanzamientos y administración Auth de vendedores/perfiles. No hay controles visibles simulando esas capacidades.

### Manual interactions tested

Se probaron los contratos de negocio con cuentas sembradas Admin/Vendedor y consultas REST autenticadas. La prueba de interfaz queda lista para ejecutarse en `http://localhost:5173/`.

### Remaining genuine backend gaps

Fuera de esta fase quedan la configuración empresarial editable, la aprobación externa de cotizaciones y la administración Auth completa de usuarios. No bloquean INVENTARIO ni CASH V1.

### Results

- TypeScript: PASS.
- Lint: PASS.
- Build: PASS.

## PRODUCTION CLOSING STATUS

- **Impresión:** ventas, cotizaciones y pedidos tienen impresión 58 mm y 80 mm desde datos reales; el PDF usa el fallback nativo de impresión del navegador.
- **R2:** la carga está protegida por Edge Function + RPC Admin-only, con validación de path, MIME, tamaño y bucket. La subida real queda bloqueada hasta configurar secretos/bucket externos.
- **Seguridad:** Vendor no puede modificar diseños, leer costos, registrar archivos, gestionar sucursales, operar otra sucursal ni saltar aceptación/límite de crédito; Admin conserva consolidado local.
- **Producción:** local PASS; Supabase productivo y Netlify no verificados por falta de proyectos/credenciales de despliegue en esta sesión.
- **Capacidad:** aislamiento probado con las dos sucursales y un vendedor disponibles en seed; queda pendiente la matriz 3 sucursales/7 vendedores/3 administradores.
- **Checklist:** ver [PRODUCTION_READINESS_CHECKLIST.md](/Users/chriis/ALTIX/PRODUCTION_READINESS_CHECKLIST.md).

## ADMIN PANEL FINAL STATUS: CATALOG, REPORTS AND DASHBOARD

- **Páginas completas:** diseños, extras, lanzamientos, dashboard, reportes, metas y los módulos Admin V1 existentes.
- **Botones conectados:** alta/edición/activación de diseños y extras, alta/edición de lanzamientos, filtros, refresh, navegación, exportación y configuración de metas mediante CRUD/RPC reales.
- **Datos calculados:** ventas, utilidad bruta, caja, crédito, comisiones, stock bajo, aprobaciones, pedidos, cotizaciones y reporte mensual de inventario.
- **Botones ocultos:** acciones sin contrato backend, notificaciones externas y controles de imagen que dependen de R2 configurado.
- **Pruebas contractuales:** Admin creó diseño, lanzamiento y meta; los RPC de dashboard y reportes respondieron correctamente; RLS de costos fue verificado con sesión Vendor.
- **R2:** no verificado localmente porque faltan `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` y el runtime Edge activo.
- **TypeScript:** PASS (`npx tsc --noEmit`).
- **Lint:** PASS, 0 warnings y 0 errors.
- **Build:** PASS; queda únicamente el aviso informativo de tamaño de bundle.
- **Brechas genuinas:** configuración externa de R2; no quedan brechas de datos para catálogo, reportes, dashboard o metas dentro del alcance V1.

## COMMERCIAL V1 FINAL STATUS

- **Páginas completas:** Cotizaciones, pedidos, preparación, anticipos, entrega y cierre de pedido como venta están conectados al backend Supabase real.
- **Botones conectados:** Convertir cotización, actualizar preparación, registrar anticipo, marcar entrega y cerrar pedido como venta. Cada mutación usa RPC, estado de carga, error amigable, confirmación y refresh posterior.
- **Botones ocultos por backend faltante:** Aprobación externa del cliente; no existe identidad/portal/RPC de cliente. Las cuentas de crédito ligadas a pedidos no muestran el botón genérico `registrar_pago`; se pagan desde el anticipo del pedido.
- **Interacciones probadas:** Creación/idempotencia de cotización, conversión idempotente, preparación, anticipo contado, crédito de pedido, rechazo de sobrepago, entrega, venta final, stock y comisión.
- **Brecha genuina restante:** actor externo para aprobación de cliente.
- **TypeScript:** PASS.
- **Lint:** PASS.
- **Build:** PASS.

## FINANCIAL CLOSING HARDENING 2026-09-30

- Diseños muestran SKU vendible, costo unitario y precio base; el stock permanece en Inventario por sucursal.
- Productos tienen acción real para configurar costo mediante `configurar_costo_producto`; las ventas congelan el costo en `venta_costos`.
- Dashboard y Reportes comparan ventas, costo y utilidad desde RPC.
- Crédito aprobado sincroniza `monto_autorizado` y conserva separado el monto solicitado.
- Caja no cierra con gastos pendientes y no puede recibir movimientos después de cerrada.
- El estado de cotización queda protegido por RLS, RPC y trigger de transición.

## ADMIN PANEL FINAL STATUS

- **Páginas completas:** cotizaciones, centro de aprobaciones, auditoría, inventario, caja, gastos, créditos, pedidos, reportes y configuración soportada por el esquema real.
- **Botones conectados:** registrar aceptación, convertir cuando el backend lo permite, aprobar/rechazar solicitudes, ver detalle de auditoría, filtros, refresh, exportación y acciones operativas existentes.
- **Botones ocultos por backend faltante:** notificaciones externas y operaciones sin tabla/RPC; no se agregaron controles simulados.
- **Interacciones probadas:** aceptación bloquea conversión hasta confirmarse; aprobación de descuento habilita cotización; ajuste y gasto solo producen efecto por sus RPC autorizadas; auditoría se genera por trigger y solo Admin la lee.
- **TypeScript:** PASS (`npx tsc --noEmit`).
- **Lint:** PASS, 0 warnings y 0 errors.
- **Build:** PASS; solo queda el aviso informativo del tamaño del bundle.
- **Bloqueadores exactos:** ninguno dentro del alcance V1 definido.

## ADMIN PANEL FINAL STATUS: OPERACIÓN 2026-09-30

- Páginas complete: Admin V1 operativo, con catálogo limitado a Diseños y Extras; lanzamientos históricos quedan fuera de la UI operativa.
- Buttons connected: metas por sucursal, devolución desde venta original con cantidades disponibles/fecha operativa, caja por sucursal, gastos/aprobaciones, pagos, tablas con relaciones legibles e impresión 58/80/PDF.
- Buttons hidden due to missing backend: R2 sin secretos, aprobación externa del cliente, notificaciones externas y administración Auth avanzada.
- Manual interactions tested: Admin login/dashboard, catálogo, metas y navegación; POS Vendor, cotización y gastos fueron inspeccionados desde la interfaz.
- Remaining genuine backend gaps: servicios externos anteriores. No hay brecha local de esquema para los flujos V1 cubiertos.
- TypeScript: PASS. Lint: PASS. Build: PASS.

## CREDIT V1 INTEGRATION

- La cartera Admin consulta mayoristas, monto solicitado, autorizado, usado, disponible, días, cuentas, vencimientos y pagos reales.
- `configurar_credito_cliente` modifica autorizado y días sin sobrescribir el monto solicitado.
- `registrar_pago` exige cuenta abierta, evita sobrepago, soporta parciales, caja en efectivo, historial e idempotencia.
- `marcar_venta_entregada` conecta la entrega con la regla final de comisión.
- Los controles visibles refrescan cartera, cuentas y pagos solo después de éxito.

## CREDIT FINAL STATUS

- CREDIT = 100% YES.
- Buttons connected: editar términos, registrar pago, marcar venta entregada, actualizar y consulta de cartera/historial.
- Buttons hidden due to missing backend: WhatsApp, deshabilitado por especificación.
- Manual interactions tested: límite excedido, venta de crédito, pago parcial, entrega, pago final, comisión única y recordatorio único.
- Remaining genuine backend gaps: ninguno dentro de Credit V1.
- TypeScript: PASS.
- Lint: PASS.
- Build: PASS.

## FINAL DEMO FIX STATUS

- Metas: sucursales activas consultadas desde la tabla real con recarga y error visibles.
- Caja: movimientos con filtro por sucursal y totales ingreso, egreso y neto recalculados.
- Aprobaciones: descuento de cotización muestra referencia al folio y desglose por línea; una sola resolución libera la conversión.
- Diseños: base, costo de SKU vinculado y precio final con extras visibles.
- Traslados: origen/destino legibles y stock de origen visible; el RPC atómico permanece como única mutación.
- Resultados: TypeScript PASS, lint PASS y build PASS.

## FINAL AUDIT UPDATE 2026-09-30

- Metas Admin sigue persistiendo en `metas_sucursal` mediante el RPC existente; la selección de sucursal usa relaciones reales y la recarga conserva el resultado.
- El dashboard Vendor ya consume esa misma meta de sucursal mediante `obtener_dashboard_vendedor`; no se agregó una tabla ni un estado paralelo.
- La compresión de imágenes de Diseños se ejecuta antes de la carga: WebP, máximo 300 KB, dimensiones progresivas, estadísticas visibles y nombre físico UUID.
- La matriz `DAILY_OPERATION_TRACEABILITY_MATRIX.md` deja identificados actor, sucursal, referencia, RPC, auditoría y estado de refresco para los flujos principales.
- Validación técnica: `supabase db reset` PASS, `supabase db diff --local` PASS, `supabase db lint --local` PASS, TypeScript PASS, lint PASS y build PASS.
- Validación manual pendiente: guardar una meta y comprobarla con una sesión Vendor nueva; validar carga real de imagen requiere secretos R2 configurados.
- No se marca como PASS una prueba de navegador que no se haya ejecutado.

## PRODUCTION CLOSING AUDIT 2026-09-30

- Admin conserva los flujos soportados por RPC; la seguridad de perfiles inactivos se reforzó en migraciones `031` y `032`.
- El seed permite una validación de aceptación con 3 sucursales, 3 Admin, 7 Vendor, 20 productos, 10 mayoristas, 5 diseños y 5 extras.
- La PWA local tiene manifest, rutas SPA y service worker de app shell; no reemplaza la validación de Netlify/HTTPS.
- Reporte de producción: `PRODUCTION_V1_COMPLETION_MATRIX.md` y `PRODUCTION_READINESS_REPORT.md`.
- Estado de entrega: Admin local PASS técnico; Admin de producción NO declarado hasta ejecutar E2E, backup/restore y configuración remota.
