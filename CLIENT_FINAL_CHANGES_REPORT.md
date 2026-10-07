# ALTIX Client Final Operations Pass

## Alcance implementado localmente

- Se agregó `vara` como unidad prioritaria sin eliminar valores históricos.
- Vara acepta cantidades en incrementos de `0.25`; unidad mantiene cantidades enteras.
- La validación se aplica en UI y mediante triggers backend para cotización, pedido y venta.
- El modelo conserva presentaciones separadas por producto/SKU, por lo que tela y wipil mantienen stock y precio propios.
- Admin Mayoristas filtra únicamente `clientes.es_mayorista = true`.
- Ventas muestran clasificación Contado/Crédito basada en existencia real de `cuentas_cobrar`, no en tipo de cliente.
- Exportaciones de ventas, inventario, movimientos y conteos usan workbook `.xlsx` mediante un helper compartido.
- Inventario exportado contiene únicamente SKU, producto, diseño, sucursal, unidad y stock real.
- Gastos incorporan sucursal imputada separada de la sucursal/caja origen.
- Comisiones cuentan con consulta mensual acumulada y ajustes trazables sobre el ledger existente.
- Conteos muestran detalle de sistema, físico y diferencia, con semáforo y descarga Excel.

## Migraciones nuevas

- `20261007000000_039_client_operations.sql`
- `20261007010000_040_monthly_commissions_counts.sql`

No se modificaron las migraciones 001–038.

## Validaciones

- `npx tsc --noEmit`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS
- `supabase db reset`: PASS con migraciones 001–040.
- `supabase db lint --local`: PASS; sin errores de esquema.
- `supabase db diff --local`: PASS; sin cambios pendientes.
- `npm audit --audit-level=high`: PASS; 0 vulnerabilidades. La exportación usa `write-excel-file` únicamente para descarga `.xlsx`, sin importación.

## Validación operativa local

- Vara: el backend acepta múltiplos de `0.25`; las unidades enteras rechazan decimales.
- Gastos: una solicitud pendiente no crea movimiento; aprobar crea el egreso; rechazar conserva el historial sin salida aplicada. La sucursal imputada queda separada de la caja origen.
- Cierre de caja: el conteo de denominaciones calculó `Q1,000` físico, `Q1,000` esperado y diferencia `Q0`, y cerró la sesión.
- Comisiones mensuales: los casos `Q18,000`, `Q22,000`, `Q30,000` y `Q55,000` produjeron respectivamente `Q360`, `Q660`, `Q1,200` y `Q2,750`.
- Exportaciones: ventas, inventario y conteos generan workbook `.xlsx`; inventario excluye precio y costo.
- Contado/crédito: la clasificación de ventas se deriva de la relación real con `cuentas_cobrar`, no del tipo de cliente.

## Acceso remoto Supabase

- CLI: `2.118.0`.
- Proyecto vinculado localmente: `tkhwzpocbyonurxwvmcv` (`Textiles`), confirmado por `supabase status` sin mostrar secretos.
- `supabase migration list` y `supabase projects list`: BLOQUEADOS por respuesta remota 403 (`Your account does not have the necessary privileges to access this endpoint`).
- No se ejecutó `supabase db push`; por tanto, no se afirma que PROD tenga 039/040.

## Riesgos pendientes antes de PROD

- Resolver el acceso Supabase remoto 403 con una cuenta con permisos sobre el proyecto vinculado.
- Ejecutar `supabase migration list` y `supabase db push --dry-run`; solo 039/040 deben quedar pendientes frente a PROD 038.
- Crear y registrar un backup PROD verificable antes de `db push`.
- Completar una validación autenticada en la interfaz con cuentas de prueba; las pruebas SQL locales anteriores cubren los contratos backend críticos.

## Estado de publicación

- No se hizo deploy Netlify.
- No se hizo merge a `main`.
- El trabajo permanece en `production-v1-finalization` hasta completar validación SQL y pruebas funcionales.

## Estado de cierre

- IMPLEMENTADO LOCALMENTE: cambios de unidades, mayoristas, contado/crédito, exportaciones, gastos imputados, conteos y comisiones; migraciones 039/040 listas y lintadas.
- DESPLEGADO A PROD: no verificado; bloqueado por acceso Supabase 403.
- VERIFICADO EN PROD: no realizado.
- Netlify: sin deploy nuevo y sin consumo adicional de créditos.
