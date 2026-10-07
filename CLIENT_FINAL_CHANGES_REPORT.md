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
- `supabase db reset`: NO EJECUTADO; Docker no está iniciado en el entorno.
- `supabase db lint --local`: pendiente por el mismo bloqueo de Docker.
- `supabase db diff --local`: pendiente por el mismo bloqueo de Docker.

## Riesgos pendientes antes de PROD

- Ejecutar reset/lint/diff con Docker activo y corregir cualquier incompatibilidad SQL antes de aplicar migraciones.
- Regenerar `database.types.ts` después de aplicar las migraciones localmente.
- Probar con cuentas reales los casos de vara, cierre de caja, gasto rechazado y comisión mensual.
- Crear backup PROD verificable antes de `db push`.

## Estado de publicación

- No se hizo deploy Netlify.
- No se hizo merge a `main`.
- El trabajo permanece en `production-v1-finalization` hasta completar validación SQL y pruebas funcionales.
