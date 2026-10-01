# ALTIX FULL V1 GAP ANALYSIS

## Alcance

Esta auditoría compara la especificación empresarial de V1 contra el estado local verificable del proyecto en inventario y caja. La línea base corresponde a las migraciones existentes, los tipos generados, los RPC disponibles, las políticas RLS, los servicios y las interfaces Admin/Vendor actuales.

La auditoría inicial detectó brechas estructurales. La migración `20260929000000_015_full_v1_inventory_cash.sql` las cerró y este documento conserva la comparación para trazabilidad.

## Inventario

| Requisito empresarial | Base de datos | RPC | RLS | Servicio | UI Admin | UI Vendor | Estado de prueba |
|---|---|---|---|---|---|---|---|
| Entrada | `inventarios` y `movimientos_inventario` soportan `entrada` | `registrar_entrada_inventario` existe, pero requiere endurecer cantidad, autorización y validaciones | `inventarios` tiene lectura autenticada; movimientos no tienen aislamiento por sucursal | Servicio Admin conectado | Formulario conectado | No aplica; Vendor es lectura | No validado end-to-end en esta auditoría |
| Venta | `ventas`, `venta_items`, inventario y movimientos existen | `registrar_venta` valida y bloquea stock | Ventas/inventario tienen políticas generales, sin aislamiento completo de detalles | Servicio POS conectado | Lectura de efectos | POS conectado | Debe repetirse con usuario vendedor real |
| Traslado | `traslados` y `traslado_items` existen | `trasladar_inventario` mueve stock, pero no registra ambos movimientos y no completa autorización/idempotencia | Traslados y movimientos carecen de RLS por sucursal | Servicio conectado | Formulario conectado | No ejecuta mutaciones | Falla requisito de kardex relacionado |
| Devolución | Tablas de devoluciones y enum `devolucion` existen | `registrar_devolucion` existe; requiere validar bloqueo, autorización y efecto completo | Detalles de devolución no tienen políticas específicas | Servicio parcial | No hay flujo completo visible | No aplica | Pendiente |
| Ajuste autorizado | No existe tabla persistente de solicitud/aprobación | No existe RPC de solicitud, aprobación o rechazo | No aplica | No existe contrato | No existe flujo completo | No aplica | Bloqueado |
| Defectuoso sin afectar stock | Tabla `defectuosos` existe | No existe RPC dedicado; el enum también permite movimiento `defectuoso`, que debe quedar fuera del stock disponible | Tabla sin RLS específico | No existe servicio dedicado | No existe flujo completo | No aplica | Bloqueado |
| Kardex | Movimientos almacenan tipo, cantidades, saldos y responsable | No existe RPC de consulta consolidada | `movimientos_inventario` sin aislamiento por sucursal | Consultas parciales | Listado parcial | Vendor solo consulta inventario | Pendiente |
| Conteo físico parcial | `conteos` y `conteos_detalle` existen | `guardar_conteo_batch` existe, pero falta creación/flujo completo y sincronización verificable | Tablas sin RLS específico | Dexie local existe; sincronización por validar | No existe flujo completo | No bloquea ventas | Pendiente |
| Inventario por sucursal | `inventarios` tiene sucursal y restricción única | Lecturas directas | Política actual no prueba pertenencia de sucursal para vendedor | Consultas por sucursal | Selector/listado parcial | Consulta sucursal activa | Debe probarse con vendedor y Admin |
| Descarga administrativa | Los datos base existen, sin fotos requeridas | No existe export RPC | Requiere consultas con alcance Admin | No existe export consolidado | No existe export completo | No aplica | Bloqueado |
| Stock no negativo y atomicidad | `stock` no tiene CHECK de no negatividad | Entrada/venta/traslado usan RPC, con huecos en traslado y otros flujos | Las políticas no sustituyen validación transaccional | Parcial | Parcial | Venta usa RPC | Debe probarse con concurrencia y casos inválidos |

## Caja

| Requisito empresarial | Base de datos | RPC | RLS | Servicio | UI Admin | UI Vendor | Estado de prueba |
|---|---|---|---|---|---|---|---|
| Sesión independiente por sucursal | `sesiones_caja` relaciona sucursal y usuario | `abrir_caja` existe, pero debe validar alcance y reglas por sucursal | Sesiones tienen política general, no matriz completa de rol/sucursal | Servicio conectado | Apertura conectada | POS usa sesión seleccionada | Pendiente con cuentas reales |
| Apertura y saldo inicial | `monto_apertura` existe | `abrir_caja` existe; requiere validación de monto y autorización | Parcial | Conectado | Formulario conectado | No aplica | Pendiente |
| Ventas en efectivo | `movimientos_caja` soporta ingreso | `registrar_venta` registra ingreso solo para tipos monetarios soportados | Movimientos sin RLS específico | POS conectado | Lectura | POS conectado | Debe verificarse efecto en sesión |
| Ingresos/egresos autorizados | `movimientos_caja` solo distingue ingreso/egreso | No hay contrato completo de autorización | Sin RLS específico | Parcial | Parcial | No aplica | Bloqueado |
| Gastos con concepto, monto, fecha, sucursal, responsable y observación | `gastos` tiene monto, descripción, sesión, sucursal y responsable; no tiene estado/observación/flujo de aprobación completo | `registrar_gasto` inserta gasto y egreso, pero no aplica política de aprobación | Sin RLS específico | Servicio conectado | Formulario conectado | No aplica | Incompleto |
| Saldo esperado no editable | No existe columna calculada/persistida de esperado | `cerrar_caja` acepta monto manual y no calcula movimientos | Parcial | Cierre actual permite monto directo | Formulario actual solicita cierre directo | No aplica | Bloqueado |
| Conteo físico por denominaciones | No existen denominaciones Q200/Q100/Q50/Q20/Q10/Q5/monedas ni snapshot | No existe RPC que reciba denominaciones y calcule total | No aplica | No existe servicio | No existe calculadora completa | No aplica | Bloqueado |
| Diferencia | No existe campo persistente | `cerrar_caja` no calcula expected/physical/difference | No aplica | No existe | No existe | No aplica | Bloqueado |
| Cierre transaccional | Sesión tiene estado abierto/cerrado | `cerrar_caja` actualiza sesión, pero no protege todos los efectos ni valida actor/branch | Parcial | Conectado | Formulario conectado | No aplica | Pendiente de reemplazo |
| Historial y sesión cerrada inmutable | Estado cerrado existe | No hay política/RPC explícita para impedir edición de movimientos asociados | Sin RLS suficiente | Consultas parciales | Listado parcial | No aplica | Incompleto |

## RLS y autorización transversal

- Hay RLS general en varias tablas principales, pero no existe una cobertura equivalente para `movimientos_inventario`, `traslados`, `traslado_items`, `defectuosos`, `conteos`, `conteos_detalle`, `movimientos_caja` y `gastos`.
- Las políticas actuales no demuestran de forma suficiente que un vendedor solo pueda operar en su sucursal asignada.
- Las funciones SECURITY DEFINER deben validar explícitamente actor, rol y sucursal; RLS por sí solo no corrige un RPC demasiado permisivo.
- Admin requiere lectura por sucursal y consolidada, con controles consistentes y sin exponer datos fuera del alcance permitido.

## Bloqueadores actuales

1. Falta el modelo y los RPC de solicitud/aprobación/rechazo de ajustes.
2. El traslado no escribe los movimientos de salida y entrada relacionados.
3. Falta el RPC de defectuoso que registre control histórico sin modificar stock.
4. Falta el ciclo completo de conteo físico: creación, guardado parcial, sincronización y cierre.
5. Falta la descarga administrativa consolidada.
6. El cierre de caja acepta un monto manual en lugar de calcular esperado, físico y diferencia dentro de una transacción.
7. Falta soporte persistente para denominaciones y cierre inmutable.
8. El modelo de gastos no expresa completamente autorización, observación y rechazo no destructivo.
9. Faltan políticas RLS específicas para las tablas operativas de inventario y caja.
10. No existe una batería local end-to-end que pruebe los flujos exigidos con cuentas vendedor y administrador.

## Criterio de salida

El estado solo podrá marcarse como completo cuando cada fila tenga contrato real en base de datos/RPC/RLS/servicio/UI, no existan controles muertos, los efectos se verifiquen en Admin, y pasen `supabase db reset`, `supabase db diff --local`, `npx tsc --noEmit`, `npm run lint` y `npm run build`.

## Correcciones verificadas

- Entrada, venta, devolución y traslado bloquean filas, verifican cantidades y escriben Kardex dentro de RPC.
- Traslado registra salida y entrada relacionadas en una sola transacción.
- Defectuoso solo inserta control histórico; no actualiza `inventarios` ni `movimientos_inventario`.
- Ajustes persisten solicitante, stock anterior/nuevo, delta, motivo, aprobador y fecha; el stock cambia solo al aprobar.
- Conteos se crean y guardan en lotes parciales/finales; Dexie conserva el borrador antes de sincronizar.
- Exportación administrativa reúne stock, ventas, movimientos, traslados, ajustes y defectuosos sin fotos.
- Caja calcula saldo esperado desde apertura y movimientos; el cierre recibe denominaciones, calcula físico/diferencia y queda cerrado.
- Gastos guardan observación y estado; rechazo no elimina el registro.
- RLS cubre tablas de inventario/caja y detalles sensibles; vendedor quedó limitado a su sucursal y Admin conserva vista consolidada.

## Pruebas finales

- `supabase db reset`: PASS.
- `supabase db diff --local`: PASS, sin cambios.
- `supabase db lint --local`: PASS.
- Pruebas SQL reales de entrada, venta, traslado, devolución, ajuste, defectuoso, conteo, apertura, venta en efectivo, gasto y cierre: PASS.
- RLS con JWT vendedor/Admin: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS.

## FULL V1 FINAL STATUS

- INVENTORY = 100% YES
- CASH = 100% YES
- Bloqueadores exactos: ninguno dentro del alcance INVENTORY + CASH definido en esta fase.
- Brechas fuera de esta fase: configuración empresarial editable, administración Auth de usuarios y lanzamientos de catálogo.

## CREDIT / ACCOUNTS RECEIVABLE V1

| REQUIREMENT | DATABASE | RPC | RLS | SERVICE | ADMIN UI | VENDOR UI | TEST | STATUS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Crédito exclusivo para mayoristas | `clientes.es_mayorista`, `monto_solicitado`, `monto_autorizado`, `dias_credito` | `registrar_venta` rechaza cliente final | Condiciones sin UPDATE directo | POS pasa `tipo_pago=credito` | Cartera mayorista | Selector solo ofrece crédito a mayoristas | Venta mayorista PASS | COMPLETE |
| Solicitado separado de autorizado | Columnas independientes con checks monetarios | `solicitar_credito_cliente`, `configurar_credito_cliente` | Mutación solo por RPC | Servicios tipados | Solicitado solo lectura | Sin edición | Configuración Admin PASS | COMPLETE |
| Límite disponible concurrente | `cuentas_cobrar.saldo_pendiente` protegido | Bloqueo `clientes FOR UPDATE` antes del saldo | Sin escritura directa autenticada | `registrarVentaService` | Usado/disponible | Backend valida límite | Sobre-límite rechazado | COMPLETE |
| Venta de crédito atómica | Venta, items, inventario y cuenta relacionada | `registrar_venta` transaccional e idempotente | SECURITY DEFINER con actor/sucursal | Servicio conectado | Consulta de cuenta | POS conectado | Venta + cuenta + stock PASS | COMPLETE |
| Vencimiento configurable | `fecha_venta`, `fecha_vencimiento` | Fecha actual + `dias_credito` | Lectura por Admin o vendedor de sus ventas | Consultas reales | Vencimientos/overdue | Saldo/vencimiento propios | 20 días verificados | COMPLETE |
| Pagos parciales y cierre | `pagos_credito`, `saldo_pendiente`, `estado`, `operation_id` | `registrar_pago` bloquea, impide sobrepago, caja e idempotencia | Solo lectura | Servicio Admin | Pago, historial y estado | Solo lectura | Q100 + Q250 y retry PASS | COMPLETE |
| Entrega y comisión | `ventas.entregada`, `entregada_at`, `entregada_por` | `marcar_venta_entregada`, `generar_comision` condicionado | Entrega solo Admin | Servicio Admin | Marcar entrega | Comisión solo lectura | Parcial no; final + entrega = 1 | COMPLETE |
| Recordatorio un día antes | `recordatorios` unique cuenta/fecha | `revisar_vencimientos_credito` + job `pg_cron` | Lectura Admin | DB schedule | Indicadores | Sin envío externo | Doble ejecución produce 1 | COMPLETE |
| WhatsApp | Integración no activada | Sin envío en RPC | No aplica | No conectado | Sin botón | Sin botón | Interno únicamente | DISABLED |

## CREDIT FINAL STATUS

- CREDIT = 100% YES
- COMMISSION FINAL RULE VERIFIED = YES
- CREDIT CONCURRENCY VERIFIED = YES
- REMINDER 1 DAY BEFORE VERIFIED = YES
- WHATSAPP REMAINS DISABLED = YES
- Bloqueadores exactos: ninguno dentro del alcance CREDIT / ACCOUNTS RECEIVABLE V1.

## QUOTATIONS / ORDERS / DEPOSITS / DELIVERY V1

| Requirement | Database | RPC | RLS / actor | Service / UI | Test | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Cotización con cliente, producto, diseño, extra y solicitud de diseño nuevo | `cotizaciones`, `cotizacion_items`, snapshots económicos y observaciones | `crear_cotizacion` | Actor autenticado por sucursal | Formulario Vendor con selects legibles y cliente inline | Creación + retry idempotente PASS | COMPLETE |
| Cotización a pedido sin reservar stock | `pedidos`, `pedido_items`, `cotizacion_id` único | `convertir_cotizacion_pedido` | Vendedor responsable o Admin; bloqueo de fila | Consulta real Admin/Vendor | Conversión + retry PASS | COMPLETE |
| Preparación | `estado_pedido` | `actualizar_estado_pedido` | Solo Admin; transición ordenada | `pendiente -> en_produccion -> listo` | Flujo PASS | COMPLETE |
| Anticipos y efecto en caja | `anticipos`, responsable, sesión, operation id | `registrar_anticipo_v1` | Actor y sesión de sucursal validados | Acción de pedido en Admin | Pago completo, retry y caja PASS | COMPLETE |
| Crédito de pedido | `cuentas_cobrar.pedido_id`, enlace posterior a `venta_id` | `registrar_anticipo_v1`, `registrar_pedido_venta` | Lectura por propietario/Admin | El crédito de pedido no usa el botón genérico de pago | Cuenta, sobrepago y enlace final PASS | COMPLETE |
| Entrega trazable | `entregas`, receptor, Admin, operation id, pedido único | `marcar_pedido_entregado` | Solo Admin | Acción Admin y refresh posterior | Entrega PASS | COMPLETE |
| Venta final entregada y pagada | `ventas`, `venta_items`, movimientos de inventario | `registrar_pedido_venta` | Solo Admin; bloqueo y rollback atómico | Cierre de pedido en Admin | Stock, venta y comisión PASS | COMPLETE |
| Aprobación externa del cliente | No existe identidad, timestamp de aprobación ni RPC de cliente | No disponible sin contrato de actor externo | No disponible | No se agregó un botón interno que lo simule | Brecha genuina | BLOCKED |

### COMMERCIAL V1 FINAL STATUS

- QUOTATIONS = YES para creación, líneas, snapshots, conversión e idempotencia.
- ORDERS = YES para conversión, preparación, saldo, entrega y venta final.
- DEPOSITS = YES para historial, caja/crédito, idempotencia y protección contra sobrepago.
- DELIVERY = YES para trazabilidad administrativa y regla de comisión.
- TRACEABILITY = PASS.
- COMMISSION INTEGRATION = PASS; `generar_comision` se ejecuta después de entrega y saldo cero.
- CUSTOMER APPROVAL = NO hasta definir identidad/portal del cliente. En V1 `enviada` deja la cotización elegible para revisión Admin, pero no pretende ser prueba de aceptación externa.

### Validation Results

- `supabase db reset`: PASS.
- `supabase db diff --local`: PASS, sin cambios pendientes.
- `supabase db lint --local`: PASS.
- Flujos locales reales: cotización, conversión, preparación, anticipo contado, cuenta de pedido a crédito, rechazo de sobrepago, entrega, venta final, stock y comisión: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS; queda únicamente el aviso informativo de tamaño de bundle.

## CUSTOMER ACCEPTANCE / APPROVALS / AUDIT FINAL STATUS

| Area | Database | RPC / rule | RLS | Service / UI | Real test | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Customer quotation acceptance | `cotizaciones.cliente_acepto`, timestamp, user, method, note, operation id | `registrar_aceptacion_cotizacion`; conversion trigger rejects unaccepted quotes | Seller/Admin actor validation | Vendor modal plus Admin visibility; conversion remains backend-controlled | Reject before acceptance, accept, convert and retry PASS | COMPLETE |
| Central approvals | `aprobaciones` with requester, branch, reference, value, data, reason and resolution | `solicitar_aprobacion`, `resolver_aprobacion` | Requester/Admin SELECT; mutations through RPC/triggers | Admin center pending-first; Vendor request history | Discount approval and resolution PASS | COMPLETE |
| Discount approval | Approval linked to seller/branch and requested value | `crear_cotizacion` rejects non-approved discounts | Seller cannot mutate approval rows | Vendor requests/selects approved discount; Admin resolves | Blocked then allowed after approval PASS | COMPLETE |
| Inventory adjustment approval | Existing `solicitudes_ajuste_inventario` remains authoritative | Existing request/approve/reject RPCs sync central approval | Existing branch/admin policies | Admin center resolves through adjustment RPC | Stock changed only after approval PASS | COMPLETE |
| Expense approval | Existing `gastos` remains authoritative | Existing `registrar_gasto`/`resolver_gasto` sync central approval | Existing cash policies | Admin center resolves through expense RPC | Rejection/approval preserve record and effect only on approval PASS | COMPLETE |
| Automatic audit | `bitacora_auditoria` plus branch, old/new JSON | Security-definer triggers on critical tables | Admin SELECT only; no user mutation policies | Admin filters and immutable detail view | Admin sees entries; seller sees none PASS | COMPLETE |

### FULL V1 FINAL STATUS

- QUOTATIONS = 100% YES
- CUSTOMER ACCEPTANCE = 100% YES
- APPROVALS = 100% YES
- DISCOUNT APPROVAL = 100% YES
- INVENTORY APPROVAL INTEGRATION = 100% YES
- EXPENSE APPROVAL INTEGRATION = 100% YES
- AUDIT = 100% YES
- AUDIT IMMUTABILITY = 100% YES
- INVENTORY = 100% YES
- CASH = 100% YES
- VENDOR -> ADMIN -> VENDOR = 100% YES
- Exact remaining backend gaps: external WhatsApp/email notifications are intentionally disabled because no notification provider exists; no operation depends on them.

## FULL V1 FINAL STATUS: DESIGNS, EXTRAS, REPORTS AND DASHBOARDS

Esta evaluación usa como fuente de verdad el esquema local reproducible hasta la migración `20260929001000_025_product_cost_defaults.sql`.

| Área | Estado | Evidencia | Bloqueador exacto |
| --- | --- | --- | --- |
| Diseños | 100% YES | SKU, descripción, categoría, cliente, precio, activo, imagen, extras, RPC `guardar_diseno`, CRUD Admin y lectura Vendor | Ninguno en el contrato local |
| Extras | 100% YES | Tabla, RLS, CRUD Admin y selección en diseños/lanzamientos | Ninguno en el contrato local |
| Lanzamientos | 100% YES | Entidad, relaciones con diseños/extras, RPC `guardar_lanzamiento` y CRUD Admin | Scope opcional: no se inventó workflow Vendor |
| Reporte semanal de ventas | 100% YES | `obtener_reporte_ventas` con filtros de fecha, sucursal y vendedor, KPIs y detalle | Ninguno en el contrato local |
| Reporte mensual de inventario | 100% YES | `obtener_reporte_inventario_mensual` con teórico, físico, diferencia, pendientes y responsable | Ninguno en el contrato local |
| Dashboard Admin | 100% YES | RPC consolidada con ventas, utilidad, caja, crédito, comisiones, stock, aprobaciones, pedidos y cotizaciones | Ninguno en el contrato local |
| Dashboard Vendor | 100% YES | RPC filtrada por vendedor con ventas, comisión, clientes, cotizaciones, pedidos y meta activa | Ninguno en el contrato local |
| Metas de vendedor | 100% YES | Tabla, RLS Admin/Vendor, RPC `configurar_meta_vendedor` y progreso visible | Ninguno en el contrato local |
| Flujo de imágenes R2 | NO / BLOQUEADO | Código de compresión, URL firmada, subida y registro de metadatos implementados; función Edge local inicia | Faltan `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` y bucket real |

### Pruebas finales de estas áreas

- Reset, diff y lint de base de datos PASS.
- Admin creó un diseño, un lanzamiento con relaciones y una meta; la persistencia fue verificada contra Supabase local.
- Vendor leyó diseño y dashboard mediante sesión real; las tablas de costos devolvieron cero filas por RLS.
- La mutación directa de diseño como Vendor no cambió el registro persistido, confirmando el bloqueo RLS.
- Dashboard Admin, reporte de ventas y reporte mensual de inventario devolvieron JSON válido con la base vacía.
- La subida R2 queda pendiente únicamente de configuración externa; no se marca como PASS sin credenciales reales.

### ESTADO FINAL EXACTO

- DESIGNS = 100% YES
- EXTRAS = 100% YES
- LAUNCHES = 100% YES
- WEEKLY SALES REPORT = 100% YES
- MONTHLY INVENTORY REPORT = 100% YES
- ADMIN DASHBOARD = 100% YES
- VENDOR DASHBOARD = 100% YES
- SELLER GOALS = 100% YES
- R2 IMAGE FLOW = NO, bloqueado exclusivamente por secretos/runtime externo no disponible en local.

## FINAL PRODUCTION-CLOSING STATUS

- R2 IMAGE FLOW = **NO / BLOQUEADO**. La función Edge, la RPC y la UI están endurecidas y probadas en rechazo; falta configuración real de `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, bucket y prueba binaria externa.
- PRINT 58MM = **PASS**. Documento real en layout térmico y diálogo de impresión del navegador.
- PRINT 80MM = **PASS**. Documento real en layout térmico y diálogo de impresión del navegador.
- PDF/FALLBACK = **PASS**. El navegador permite guardar el documento como PDF sin dependencia pesada.
- RLS FINAL REVIEW = **PASS** en local con sesiones Admin/Vendor y pruebas de bypass.
- 3-BRANCH ISOLATION = **YES LOCAL**. La semilla determinista contiene 3 sucursales, 7 vendedores y 3 administradores; sesiones autenticadas separadas verificaron lectura cruzada sin filas, operaciones por sucursal y acceso consolidado Admin.
- SELLER ISOLATION = **YES**, según el contrato: comisiones, metas y cartera de crédito son propias del vendedor; ventas, cotizaciones y pedidos son operativos por sucursal.
- CONCURRENCY = **YES LOCAL**. Se verificaron ventas simultáneas por sucursal, ventas simultáneas en sucursales distintas, crédito concurrente con límite y reintento idempotente.
- BACKUP/RESTORE = **PASS LOCAL** para reconstrucción mediante migrations/seed y `supabase db reset`; restore productivo aún no ejecutado.
- NETLIFY PRODUCTION READY = **NO**. No existe un entorno Netlify productivo verificado en esta sesión.
- SUPABASE PRODUCTION READY = **NO**. No existe un proyecto Supabase productivo enlazado/verificado en esta sesión.
- ALTIX V1 = **NO** para cierre productivo, únicamente por infraestructura externa pendiente.

### Bloqueadores exactos restantes

1. Secretos, bucket `altix-prod`, CORS y prueba real del flujo R2.
2. Proyecto Supabase productivo enlazado, migraciones/RPC/cron/Edge desplegados y verificados.
3. Entorno Netlify productivo con variables y routing SPA verificados.
4. Repetir la misma matriz en el tenant productivo después de enlazar Supabase, aplicar migrations, configurar Auth, Edge Functions, cron y RLS de producción.

## FINAL ALTIX V1 RELEASE VALIDATION

### Evidencia local

- Fixture documentado en `LOCAL_TEST_USERS.md`; credenciales marcadas LOCAL ONLY / NEVER PRODUCTION.
- Matriz y evidencia de tres sucursales en `THREE_BRANCH_VALIDATION.md`.
- `supabase db reset`: PASS.
- `supabase db diff --local`: PASS, sin cambios de esquema pendientes.
- `supabase db lint --local`: PASS.
- Pruebas reales con 3 Admin y 7 Vendedores autenticados: PASS.
- Entrada, venta, traslado, devolución, ajuste solicitado/aprobado, defectuoso, conteo físico, gasto aprobado, caja y cierre: PASS.
- Admin consolidado y por sucursal: PASS.

### Estado exacto de cierre

| Control | Estado |
| --- | --- |
| 3 BRANCHES | YES LOCAL |
| 7 SELLERS | YES LOCAL |
| 3 ADMINS | YES LOCAL |
| SELLER ISOLATION | YES LOCAL |
| BRANCH ISOLATION | YES LOCAL |
| CONCURRENCY | YES LOCAL |
| DASHBOARD CONSOLIDATION | YES LOCAL |
| R2 PROD READY | NO, faltan credenciales, bucket, CORS y prueba binaria productiva |
| SUPABASE PROD READY | NO, falta proyecto productivo enlazado y despliegue verificado |
| NETLIFY PROD READY | NO, falta deploy productivo, variables y routing verificados |
| ALTIX FUNCTIONAL V1 | YES LOCAL |
| ALTIX PRODUCTION V1 | NO, bloqueado solo por infraestructura/configuración productiva externa |

### Plan de despliegue productivo

1. Crear y verificar proyecto Supabase productivo; configurar Auth, dominios, cron y secretos de Edge Functions.
2. Ejecutar `supabase link --project-ref "$SUPABASE_PROJECT_REF"` y revisar el diff antes de `supabase db push`; nunca ejecutar `supabase db reset` en producción.
3. Crear `altix-prod`, configurar CORS y secretos R2; desplegar `r2-presigned-url` y probar PUT/GET binario con Admin y Vendor.
4. Configurar Netlify con las variables públicas de producción, publicar `dist`, habilitar fallback SPA y comprobar que no existan URLs localhost ni credenciales de fixture.
5. Ejecutar smoke test de login Admin/Vendor, dashboard consolidado, venta, inventario, caja, crédito, cotización/pedido, R2, impresión y logout.
6. Confirmar backups Postgres, manifiesto de objetos R2, restore ensayado y monitoreo antes de declarar producción.

## COMMERCIAL / FINANCIAL AUDIT 2026-09-30

| Punto | Base de datos / RPC | Servicio / UI | Estado |
|---|---|---|---|
| R2 e imágenes de diseños | `r2-presigned-url`, `registrar_archivo`, rutas y MIME permitidos | Admin comprime, sube, registra metadatos y muestra URL firmada | **PARCIAL CONTROLADO**: código completo; requiere secretos R2 en Edge para carga real |
| Diseño, costo, precio e inventario | `disenos.producto_id`, `productos_costos`, `inventarios` por sucursal | Diseños muestra SKU, costo y precio; Inventario conserva el stock por sucursal | **COMPLETO** |
| Extras | `extras.precio_adicional`, `cotizacion_items.extra_id`, `snapshot_economico` | El precio oficial de línea suma producto/diseño más extra | **COMPLETO** |
| KPI ventas vs utilidad | `venta_costos` congelado por trigger; `obtener_dashboard_admin` y `obtener_reporte_ventas` | Dashboard y reportes muestran ventas, costo y utilidad bruta | **COMPLETO** |
| Panel Admin Ventas | `ventas`, items, cliente, vendedor, sucursal y RPC de entrega/devolución | Relaciones legibles, refresco después de mutaciones e impresión | **COMPLETO** |
| Crédito y aprobaciones | `resolver_aprobacion` actualiza `monto_autorizado` para crédito aprobado; términos siguen en RPC Admin | Aprobada ya no contradice crédito operativo autorizado | **COMPLETO** |
| Comisión Vendor Q0 | `generar_comision` exige entrega y saldo pagado; regla final se calcula en PostgreSQL | Q0 antes de entrega/pago es estado intencional; venta final de Q45 produjo Q0.90 | **COMPLETO** |
| Cotización base y extras | `crear_cotizacion` persiste producto, diseño, extra y snapshot económico | Constructor carga relaciones reales | **COMPLETO** |
| Descuento agregado | `precio_unitario` es oficial; `descuento` es total de línea | Se eliminó la doble resta y el descuento se multiplica por cantidad | **COMPLETO** |
| Persistencia de cotización | RPC atómico con `operation_id` e items | Refresco y confirmación después de guardar | **COMPLETO** |
| Una aprobación por cotización | Borrador UUID, índice único de solicitud pendiente y enlace final a `cotizaciones.id` | El botón se deshabilita mientras existe solicitud o aprobación para el borrador | **COMPLETO** |
| Estado de cotización protegido | RLS elimina edición autenticada general; trigger solo permite `enviada -> convertida` con aceptación | Conversión continúa exclusivamente por RPC | **COMPLETO** |
| Revisión financiera de caja | Cierre calcula esperado, físico y diferencia; no permite cerrar con gastos pendientes; sesión cerrada queda inmutable | Denominaciones y estados visibles en Admin/Vendor | **COMPLETO** |

### Validación enfocada

- `supabase db reset`: PASS.
- `supabase db diff --local`: PASS, sin cambios.
- `supabase db lint --local`: PASS, sin errores de esquema.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS, 0 warnings y 0 errores.
- `npm run build`: PASS; Vite deja únicamente un aviso informativo de tamaño de bundle.
- Prueba autenticada local: aprobación duplicada bloqueada, economía de cotización con extra/descuento consistente, estado protegido, cierre bloqueado por gasto pendiente, comisión calculada y KPI ventas/utilidad verificado.

### Estado de salida de estos 13 puntos

- **Puntos 2 al 13: COMPLETOS en el entorno local.**
- **Punto 1: código COMPLETO, operación real pendiente de configurar secretos R2 en Edge.**
- Bloqueador genuino restante: configuración externa de Cloudflare R2; no es una brecha de React, RPC o esquema local.

## FINAL DEMO FIX VALIDATION 2026-09-30

- Cotizaciones guardan primero el folio, sus líneas y todos los extras en `cotizacion_item_extras`; el snapshot conserva precio base, extras, precio oficial, negociado y descuento.
- El descuento crea una sola aprobación pendiente ligada a `cotizaciones.id`; no se usa un borrador previo ni se duplica la solicitud.
- La conversión e impresión de cotizaciones con descuento están bloqueadas hasta que la aprobación quede aprobada.
- Caja muestra movimientos agrupables por sucursal y totales de ingreso, egreso y neto; traslados muestran origen y destino legibles.
- Prueba autenticada local PASS: dos extras persistidos, una aprobación, conversión bloqueada antes de aprobación y consultas relacionadas sin errores.
- `supabase db reset`, `npx tsc --noEmit`, `npm run lint` y `npm run build`: PASS.

## FINAL AUDIT: TRACEABILITY, VENDOR GOAL AND IMAGE PIPELINE 2026-09-30

### Meta de sucursal visible en Vendor

- El RPC `obtener_dashboard_vendedor` ahora resuelve la sucursal asignada desde `usuario_sucursal` y consulta la meta activa del periodo en `metas_sucursal`.
- El progreso que recibe Vendor es el acumulado de ventas de la sucursal; el texto de la UI identifica la meta como `Meta de sucursal`.
- La relación de datos conserva la meta administrativa en `metas_sucursal` y la actividad comercial en `ventas`; no se creó una fuente paralela.
- La corrección de código está validada por reset, diff, tipos, lint y build. La verificación manual de guardar una meta, cerrar sesión y verla en Vendor queda pendiente de una ejecución con mutación confirmada.

### Trazabilidad diaria

`DAILY_OPERATION_TRACEABILITY_MATRIX.md` documenta para cada flujo la tabla/RPC, actor, sucursal, referencia, auditoría, refresco UI y estado de prueba. Los estados `PARTIAL` que permanecen son explícitos: carga R2 externa, filtros históricos no uniformes y persistencia local temporal del conteo físico.

### Imágenes de Diseños

- La UI comprime JPEG/PNG/WebP en el navegador antes de solicitar el PUT a R2.
- La salida se convierte a WebP, usa dimensiones máximas progresivas y se limita a 300 KB; la UI muestra tamaño original, optimizado y formato.
- La ruta usa UUID y el nombre original se conserva solamente en `archivos.nombre_original`; el binario se carga mediante la Edge Function.
- El flujo está implementado y tipado. La carga final no se marca como prueba PASS mientras el runtime no tenga configurados los secretos y bucket de Cloudflare R2.

### Resultado de esta auditoría

- Código y contrato local: PASS.
- Validación manual de mutaciones: PENDIENTE de confirmación y datos de prueba.
- R2 real: BLOQUEADO por configuración externa, no por esquema local.

## PRODUCTION CLOSING AUDIT 2026-09-30

- Se creó `PRODUCTION_V1_COMPLETION_MATRIX.md` con estado por feature, tablas, RPC/Edge, RLS, Admin, Vendor, trazabilidad, E2E, producción y gap.
- Se creó `PRODUCTION_READINESS_REPORT.md`, `PRODUCTION_SECURITY_AUDIT.md`, `PRODUCTION_E2E_TEST_REPORT.md`, `BACKUP_RESTORE_TEST.md`, `CLIENT_ONBOARDING_RUNBOOK.md` y `PRODUCTION_CUTOVER_CHECKLIST.md`.
- La migración `032_active_branch_access_and_policy_hardening.sql` corrige el acceso residual de perfiles inactivos a inventario y registros propios.
- El seed local ya contiene 3 sucursales, 3 Admin, 7 Vendor, 20 productos, 10 mayoristas, 5 diseños y 5 extras.
- PWA local: manifest, redirect SPA y service worker de app shell versionados; no se cachean datos autoritativos ni R2.
- Resultado honesto: **ALTIX V1 local está endurecido; producción real continúa NO LISTA** hasta cerrar Supabase PROD, R2 PROD, Netlify, restore y E2E financiero.
