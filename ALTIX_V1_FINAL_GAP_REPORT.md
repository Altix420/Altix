# ALTIX V1 — Informe final de cierre y brechas

Fecha de revisión: 2026-10-03  
Rama de trabajo: `production-v1-finalization`  
Migración máxima local y PROD: `20261003020000` (`037_product_primary_image`)

## Resultado ejecutivo

- **Construcción técnica estimada: 96%**.
- **Preparación para cliente: 78%**.
- La aplicación compila y el esquema PROD está alineado hasta 036.
- Se agregó descarga CSV real para ventas e inventario en Admin > Reportes.
- Se agregó imagen principal por producto con fallback producto → diseño → placeholder.
- PROD fue limpiado de datos demostrativos identificables mediante una transacción explícita.
- No se modificaron migraciones, RPC, RLS, perfiles administrativos ni metadatos de archivos R2.

Los porcentajes no representan una aprobación de producción: todavía falta validación manual E2E con credenciales y datos reales de cliente.

## Cambios entregados

### Reportes CSV

Admin > Reportes ahora permite descargar:

- `altix-ventas-YYYY-MM-DD-YYYY-MM-DD.csv`
  - fecha, folio, cliente, vendedor, sucursal, total, costo snapshot, utilidad bruta, comisión, utilidad después de comisión y estado;
  - respeta periodo, sucursal y vendedor seleccionados;
  - calcula costos desde `venta_costos` y comisiones desde `comisiones`.
- `altix-inventario-YYYY-MM.csv`
  - SKU, producto, diseño, sucursal, stock, unidad de venta, costo y valor de inventario;
  - respeta la sucursal seleccionada y conserva cantidades decimales.

Los archivos usan UTF-8 con BOM, escape CSV para comillas y rechazan silenciosamente la descarga cuando no hay datos: se muestra un error legible al usuario.

## Estado de base de datos PROD

### Limpieza realizada

Se respaldó antes de borrar y se ejecutó una única transacción con dependencias FK ordenadas. Se eliminaron los registros operativos de prueba de ventas, cotizaciones, pedidos, clientes, sucursales, productos, inventario, caja, gastos, comisiones, crédito, movimientos, metas, diseños y solicitudes asociadas.

Estado posterior verificado:

| Recurso | Resultado |
|---|---:|
| Perfiles | 2 |
| Administrador activo | 1 |
| Vendedor de prueba activo | 0 |
| Sucursales | 0 |
| Productos | 0 |
| Clientes | 0 |
| Ventas | 0 |
| Cotizaciones | 0 |
| Pedidos | 0 |
| Inventarios | 0 |
| Movimientos de inventario | 0 |
| Movimientos de caja | 0 |
| Gastos | 0 |
| Archivos metadata | 6, preservados |

No se eliminaron objetos de R2. Los 6 registros de `public.archivos` quedan pendientes de revisión separada de lifecycle y correspondencia física en el bucket.

### Respaldo

Dump lógico generado antes de la limpieza:

- `/Users/chriis/Library/Application Support/ALTIX/backups/cleanup-audit/schema.sql` — 275 KB
- `/Users/chriis/Library/Application Support/ALTIX/backups/cleanup-audit/data.sql` — 178 KB
- `schema.sql` SHA-256: `6aa165fad2529ed31e80108bdf7830870f1935dac1f7c7933f9e27ad7700649e`
- `data.sql` SHA-256: `e8c60eded9ec21d00819b22491e6309e171294ecf33a1406b5e6e1f53bce01ac`

Limitación: el dump no está cifrado y todavía no se ha ejecutado una restauración de prueba. Por eso el respaldo queda clasificado como **creado y verificable por hash**, no como restore PASS.

## Matriz de cierre

| Área | Estado | Evidencia / siguiente acción |
|---|---|---|
| Login y roles | IMPLEMENTADO | Perfiles Admin/Vendor y RLS existentes; falta prueba con credenciales finales |
| Catálogo, diseños y extras | IMPLEMENTADO | CRUD y contratos existentes; requiere carga inicial real del cliente |
| Cotización → pedido → venta | IMPLEMENTADO | RPC y servicios existentes; falta recorrido E2E post-limpieza |
| Crédito y aprobaciones | IMPLEMENTADO | RPC/RLS existentes; falta aceptación manual con caso real |
| Inventario y unidades | IMPLEMENTADO | Migración 036 aplicada local/PROD; falta prueba manual de decimales en PROD |
| Caja y cierre financiero | IMPLEMENTADO | Contratos transaccionales existentes; falta validación manual de denominaciones y cierre |
| Comisiones | IMPLEMENTADO | Cálculo y lectura existentes; falta validar resultado con venta real |
| Reportes en pantalla | IMPLEMENTADO | Dashboard conectado a RPC reales |
| Descargas CSV | IMPLEMENTADO | Ventas e inventario con filtros y costos snapshot |
| R2 / imágenes | IMPLEMENTADO / PENDIENTE VALIDACIÓN MANUAL | 037 aplicada y Edge Function desplegada; falta confirmar upload real de producto en PROD |
| Backup / restore | PENDIENTE | Dump creado; falta restore probado y política de cifrado |
| Configuración inicial cliente | PENDIENTE | Crear sucursal, productos, costos, usuarios y reglas reales |
| Deploy del cambio CSV e imágenes | PENDIENTE | La rama tiene el cambio; falta integrar a `main` y verificar el deploy Netlify |

## Comparación con el plan operativo

No se encontró en el repositorio un archivo llamado `PLAN OPERATIVO FINAL — ALTIX`. La comparación se realizó contra la especificación de cierre recibida, los mapas `ADMIN_DATABASE_CONTRACT_MAP.md` y `VENDOR_DATABASE_CONTRACT_MAP.md`, `FULL_V1_GAP_ANALYSIS.md`, los reportes de integración y los runbooks de producción existentes.

## Brechas exactas restantes

1. Ejecutar prueba manual E2E en PROD con cuentas válidas: catálogo, cotización, aprobación, pedido, anticipo, venta, caja, inventario, comisión y reporte.
2. Integrar esta rama a `main` y verificar el deploy Netlify del CSV.
3. Cargar configuración y datos reales del primer cliente.
4. Ejecutar restore del dump en un entorno aislado y establecer cifrado/retención.
5. Verificar upload, lectura y lifecycle de los 6 objetos R2 preservados.

## Validación técnica

- `supabase migration list`: PASS, local y remoto alineados hasta 037.
- `supabase db push --dry-run`: PASS, sin migraciones pendientes.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS; Vite emitió únicamente un aviso de tamaño de chunk.

## Estado final V1

**ALTIX V1 está técnicamente construido y listo para la última validación controlada, pero no se declara cerrado para cliente hasta completar las cinco brechas exactas anteriores.**
