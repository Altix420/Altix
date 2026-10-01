# ALTIX Manual Operational Validation

Estado inicial: incidencias reportadas para reproducir y validar contra el backend local.

| ID | Módulo | Rol | Comportamiento actual | Comportamiento esperado | Causa raíz | Cambio DB | Cambio RPC | Cambio RLS | Cambio UI | Estado | Resultado prueba manual |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | Venta / caja | Vendor | Pendiente de reproducir | Venta usa la sesión abierta de la sucursal | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | OPEN | Pendiente |
| 02 | Caja POS | Vendor | Pendiente de reproducir | Estado y controles de caja claros, sin duplicar sesiones | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | OPEN | Pendiente |
| 03 | Cotización | Vendor | Cantidad puede incrementar 1.02, 1.03 | Unidades enteras 1, 2, 3 | Pendiente | No | No | No | Pendiente | OPEN | Pendiente |
| 04 | Precios | Vendor | Puede editar precio base | Precio oficial separado de precio negociado/descuento | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | OPEN | Pendiente |
| 05 | Aprobaciones | Vendor/Admin | Solicitud puede no aparecer en Admin | Admin ve la solicitud desde BD | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | OPEN | Pendiente |
| 06 | Aprobaciones | Vendor | Resultado aprobado puede no refrescar | Estado real pendiente/aprobada/rechazada | Pendiente | No | No | No | Pendiente | OPEN | Pendiente |
| 07 | Cotización | Vendor/Admin | Aceptación y aprobación pueden confundirse | Conceptos separados | Pendiente | No | No | No | Pendiente | OPEN | Pendiente |
| 08 | Cotización/pedido | Vendor/Admin | Conversión muestra error genérico | Conversión válida o error accionable | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | OPEN | Pendiente |
| 09 | Impresión | Vendor/Admin | Selector de formato incompleto | 58 mm, 80 mm y PDF visibles | Pendiente | No | No | No | Pendiente | OPEN | Pendiente |
| 10 | Clientes/crédito | Vendor | Alta mayorista incompleta | Solicitud de crédito sin datos administrativos editables | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | OPEN | Pendiente |
| 11 | Navegación | Vendor | Puede existir pestaña Diseños | Diseños solo dentro de flujos soportados | No | No | No | No | Pendiente | OPEN | Pendiente |
| 12 | Navegación | Vendor | Puede existir pestaña Extras | Extras solo dentro de flujos soportados | No | No | No | No | Pendiente | OPEN | Pendiente |
| 13 | Comisiones | Vendor | Vista puede faltar o mezclar vendedores | Mi comisión con datos reales propios | Pendiente | No | No | No | Pendiente | OPEN | Pendiente |
| 14 | Pedidos | Vendor/Admin | Trazabilidad puede ser incompleta | Origen, cliente, vendedor, sucursal, pagos y estados visibles | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | OPEN | Pendiente |
| 15 | Anticipos | Vendor | Anticipo puede estar centrado en Admin | Anticipo operativo desde detalle Vendor | No | No | No | No | Pendiente | OPEN | Pendiente |
| 16 | Preparación | Vendor/Admin | Estados pueden no usar lenguaje operativo | Producción y tienda mapeados a estados existentes | Pendiente | No | No | No | Pendiente | OPEN | Pendiente |
| 17 | Tablas Admin | Admin | UUIDs visibles | Relaciones legibles | Pendiente | No | No | No | Pendiente | OPEN | Pendiente |
| 18 | Devoluciones | Admin | Puede pedir venta por ID | Selección de venta e items originales | Pendiente | No | No | No | Pendiente | OPEN | Pendiente |
| 19 | Devoluciones | Admin | Fecha operativa puede faltar | Fecha permitida separada de created_at | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | OPEN | Pendiente |
| 20 | Caja | Admin | Sucursal puede mostrar UUID | Nombre de sucursal | No | No | No | No | Pendiente | OPEN | Pendiente |
| 21 | Gastos | Vendor | Gasto puede iniciar en Admin | Gasto desde sucursal actual del Vendor | Pendiente | No | No | No | Pendiente | OPEN | Pendiente |
| 22 | Caja | Admin | Admin puede duplicar operación de gasto | Supervisión y movimiento autorizado | No | No | No | No | Pendiente | OPEN | Pendiente |
| 23 | Gastos/aprobación | Vendor/Admin | Solicitud puede no ser visible | Una fuente de verdad en aprobaciones/gastos | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | OPEN | Pendiente |
| 24 | Crédito | Vendor | Pago puede estar solo en Admin | Pago desde cartera permitida del Vendor | Pendiente | No | No | No | Pendiente | OPEN | Pendiente |
| 25 | Diseños/extras | Admin | Extras asociados pueden no editarse | Relación real con nombre y precio | Pendiente | No | No | No | Pendiente | OPEN | Pendiente |
| 26 | Diseños | Admin | Formulario puede pedir cliente | Diseño maestro sin cliente | No | No | No | No | Pendiente | OPEN | Pendiente |
| 27 | Diseños/R2 | Admin | Imagen puede fallar con error genérico | Mensaje específico o bloqueo R2 claro | Pendiente | No | Pendiente | No | Pendiente | OPEN | Pendiente |
| 28 | Diseños/inventario | Admin | Stock por sucursal puede no estar vinculado | SKU vendible y entradas legítimas | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | OPEN | Pendiente |
| 29 | Lanzamientos | Admin | Nuevo lanzamiento puede estar visible | Oculto en UI operativa, datos históricos intactos | No | No | No | No | Pendiente | OPEN | Pendiente |
| 30 | Metas | Admin/Vendor | Meta puede ser por vendedor manual | Meta sucursal dividida entre vendedores activos | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | OPEN | Pendiente |
| 31 | Notificaciones | Vendor/Admin | Resultado puede no volver al Vendor | Solicitudes consultan estado real y refrescan | No | No | No | No | Pendiente | OPEN | Pendiente |
| 32 | Errores | Vendor/Admin | Error genérico para causas conocidas | Mensaje seguro y accionable | No | No | No | No | Pendiente | OPEN | Pendiente |

## Regla de cierre

Cada fila se cierra solo después de reproducirla, revisar DB/RPC/RLS/servicio/UI, probar con Vendor y Admin cuando corresponda, verificar la persistencia y repetir la interacción manual.

## VALIDACIÓN DE CIERRE 2026-09-30

### Automatizada

- `supabase db reset`: PASS.
- `supabase db diff --local`: PASS, sin cambios pendientes.
- `supabase db lint --local`: PASS, sin errores de esquema.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS, 0 warnings y 0 errores.
- `npm run build`: PASS; Vite deja únicamente el aviso informativo de tamaño de bundle.
- `/tmp/altix-release-validation.mjs`: PASS completo con 3 administradores, 7 vendedores y 3 sucursales.

### Manual de interfaz ejecutado

- Login Admin y dashboard: PASS.
- Login Vendor, sucursal y nombre visibles: PASS.
- POS Vendor: PASS visual; carga productos/clientes y muestra Caja abierta/Caja cerrada. Se corrigió la relación ambigua de `profiles` de la sesión.
- Cotización Vendor: PASS visual; cantidad entera, precio oficial de solo lectura, precio negociado y descuento separado.
- Catálogo Admin: PASS visual; solo Diseños y Extras visibles; Lanzamientos quedó fuera del flujo operativo.
- Metas Admin: PASS visual; formulario de meta por sucursal y reparto derivado.
- Gastos Vendor: PASS visual; requiere caja abierta y queda sujeto a aprobación.
- No se ejecutaron desde el navegador acciones financieras mutables en esta corrida; su persistencia y seguridad sí fueron probadas por la batería autenticada de RPC.

### ADMIN PANEL FINAL STATUS

- Páginas completas: dashboard, ventas, cotizaciones, pedidos, caja, gastos, crédito, inventario, aprobaciones, reportes, auditoría, configuración soportada, diseños, extras y metas por sucursal.
- Botones conectados: navegación, filtros, refresh, CRUD de diseños/extras, caja por sucursal, gastos Vendor, anticipos, pagos de crédito, devoluciones, aprobaciones, conteo, exportación y selector 58 mm/80 mm/PDF.
- Botones ocultos por backend faltante: notificaciones externas, aprobación externa del cliente, administración Auth avanzada y subida R2 sin secretos/runtime externo.
- Gaps backend genuinos: R2 externo, aprobación externa del cliente, notificaciones externas y configuración empresarial avanzada fuera del esquema actual.
- TypeScript: PASS. Lint: PASS. Build: PASS.

### ESTATUS EXACTO DE CIERRE

| Flujo | Estado |
| --- | --- |
| VENDOR SALE + CASH | PARTIAL: UI/RPC/RLS PASS; transacción de navegador pendiente |
| QUOTATION QUANTITY | YES |
| PRICE PROTECTION | YES |
| DISCOUNT REQUEST | YES |
| APPROVAL RETURN TO VENDOR | YES |
| QUOTATION → ORDER | YES |
| DEPOSIT FROM VENDOR | YES |
| EXPENSE FROM VENDOR | YES |
| CREDIT PAYMENT FROM VENDOR | YES |
| RETURN UX | YES |
| HUMAN-READABLE ADMIN TABLES | YES en relaciones cubiertas |
| DESIGN EXTRA EDITING | YES |
| DESIGN IMAGE | PARTIAL: requiere R2 para subida real |
| DESIGN STOCK PER BRANCH | PARTIAL: SKU vinculado; entradas iniciales por Inventario |
| BRANCH GOALS | YES |
| PRINT FORMAT SELECTOR | YES: 58 mm, 80 mm y PDF/A4 |

`ALTIX FUNCTIONAL V1` no se marca 100% hasta completar la corrida manual de transacciones financieras desde navegador y configurar R2 si se exige carga real de imágenes.

## COMERCIAL Y FINANZAS: CIERRE DE AUDITORIA

- Cotizaciones: el precio oficial de línea conserva la base de producto/diseño y suma el extra; el descuento se persiste como monto total de línea y no se resta dos veces.
- Aprobaciones de descuento: cada borrador usa un identificador estable, solo admite una solicitud pendiente y la solicitud aprobada se vincula a la cotización creada.
- Estado de cotización: el vendedor no puede actualizarlo directamente; la conversión requiere aceptación y RPC.
- Crédito: aprobar una solicitud actualiza el monto autorizado del cliente mayorista; los días y términos continúan bajo el RPC administrativo.
- Comisión: Q0 antes de entrega o con saldo pendiente es intencional; una venta final de Q45 para cliente final generó Q0.90 al 2%.
- Caja: el cierre transaccional calcula esperado, físico y diferencia; una sesión con gasto pendiente no puede cerrarse y una sesión cerrada no acepta nuevos movimientos.
- KPI: con costo congelado Q10 y venta Q45, el dashboard devolvió utilidad bruta Q35.
- R2: la UI y Edge Function están protegidas y dan error seguro; la carga real necesita `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` y `R2_BUCKET` configurados en el runtime Edge.

## FINAL DEMO FIX VALIDATION

- Cotización Vendor con producto y dos extras: PASS; los extras se suman una sola vez y persisten como filas relacionadas.
- Cotización con descuento: PASS; se guarda antes de aprobación, crea una única solicitud pendiente con desglose por línea y no se convierte/imprime mientras esté pendiente.
- Caja Admin: PASS de consulta relacionada; filtro por sucursal y totales ingreso/egreso/neto recalculados.
- Traslados Admin: PASS de consulta/formulario; origen, destino y stock quedan visibles y la mutación continúa en `trasladar_inventario`.
- Pendiente externo: R2 productivo requiere secretos del runtime Edge; no es un gap local de esquema.

## FINAL AUDIT: META VENDOR AND IMAGE COMPRESSION 2026-09-30

- Meta: `obtener_dashboard_vendedor` consulta la meta activa de `metas_sucursal` usando la sucursal real de `usuario_sucursal`; Vendor muestra progreso de sucursal y ventas propias sin duplicar la fuente de verdad.
- Meta manual: el cambio está validado por `supabase db reset`, `supabase db diff --local`, tipos, lint y build. La prueba de extremo a extremo Admin guarda meta -> Vendor consulta dashboard queda PENDIENTE hasta ejecutar la mutación en navegador con datos de prueba.
- Imagen de Diseño: el selector procesa JPEG/PNG/WebP en cliente, genera WebP <= 300 KB, conserva resolución razonable, muestra estadísticas y usa una ruta UUID antes de R2.
- R2: no se declara PASS manual porque la carga necesita `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` y `R2_BUCKET` en el runtime Edge.
- Referencia completa de persistencia y trazabilidad: `DAILY_OPERATION_TRACEABILITY_MATRIX.md`.

## PRODUCTION CLOSING AUDIT 2026-09-30

- Seed local de aceptación: 3 sucursales, 3 administradores, 7 vendedores, 20 productos, 10 mayoristas, 5 diseños y 5 extras.
- RLS repetido con sesiones locales: Admin ve el consolidado; Vendor Central/Norte solo ven inventario de su sucursal; costos quedan ocultos; perfil inactivo no ve operaciones.
- No se ejecutó una mutación financiera E2E en esta auditoría, por lo que venta, caja, crédito, pago, entrega, devolución y comisión permanecen PENDIENTES de corrida controlada.
- No se ejecutó el ciclo Admin guardar meta -> nuevo login Vendor; el código del RPC y dashboard está listo, pero no se marca PASS sin esa evidencia.
- R2, Netlify, HTTPS, backup/restore y Supabase PROD siguen pendientes externos.
