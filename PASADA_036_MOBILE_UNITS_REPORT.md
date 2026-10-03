# ALTIX - Pasada 036

## Implementado localmente

- Se agregó `productos.unidad_venta` con valores controlados: `unidad`, `metro`, `yarda`, `docena`, `paquete` y `rollo`.
- Las cantidades operativas relevantes usan `NUMERIC(12,3)` sin cambiar la precisión monetaria.
- `cotizacion_items`, `pedido_items` y `venta_items` conservan `unidad_venta_snapshot` mediante trigger en PostgreSQL.
- `guardar_producto` recibe y valida la unidad dentro de la RPC administrativa.
- El POS y cotizaciones usan cantidades decimales únicamente para metro y yarda; las unidades discretas conservan cantidades enteras.
- Se agregó el helper central `src/shared/units.ts` para etiquetas, cantidades y precio por unidad.
- La navegación del vendedor en móvil usa barra inferior priorizada; las tablas de listados pasan a tarjetas en pantallas pequeñas y conservan tablas en escritorio.
- Los modales del vendedor se convierten en hojas de pantalla completa en móvil y mantienen acciones existentes.

## Validación local

- `supabase db reset`: OK.
- `supabase db lint --local`: OK.
- `supabase db diff --local`: sin diferencias.
- `supabase gen types --lang typescript --local --schema public`: OK.
- `npx tsc --noEmit`: OK.
- `npm run lint`: OK.
- `npm run build`: OK. Vite reporta únicamente el warning existente de tamaño del bundle.
- Prueba transaccional de venta con `1.500` yardas: stock actualizado a `998.500` y snapshot `yarda` conservado; la transacción se ejecutó con rollback.

## Estado responsive

Se inspeccionó el viewport local de 390 px. La pantalla de acceso se adapta sin scroll horizontal. Las rutas protegidas requieren credenciales de prueba para completar la inspección visual autenticada en 360, 390 y 430 px; por ello el pase móvil autenticado queda pendiente de revisión manual en Deploy Preview y no se marca como PASS.

## Promoción

Esta pasada queda únicamente en `production-v1-finalization`. No se aplicó la migración 036 a Supabase PROD y no se hizo deploy de producción.
