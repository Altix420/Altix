# ALTIX Final Go-Live Fixes

## Alcance

Corrección final de cotizaciones, cantidades por unidad de venta, extras, precios económicos de diseños y registro administrativo de gastos. No se modificaron las migraciones 001-040 ni se cargaron datos reales.

## Cambios implementados localmente

- Cantidad de cotización con estado de edición textual: permite borrar y volver a escribir sin insertar `1` automáticamente.
- `parseSalesQuantity` centraliza trim, coma decimal, finite checks y las reglas de unidad. `vara` usa múltiplos de 0.25; las unidades discretas requieren enteros.
- Validaciones de cantidad, precio y descuento identifican la línea exacta antes de guardar.
- Un diseño seleccionado recupera su producto vinculado y su unidad de venta. Los extras se calculan desde el campo real `extras.precio_adicional`.
- Migración 041: amplía `guardar_diseno` para guardar diseño, precio base, precio mayorista y costo del producto vinculado en una sola operación transaccional. No duplica economía en `disenos`.
- Gasto administrativo: la interfaz usa “Origen del gasto”, exige la sucursal real `FFERSSI Central` y limita la sucursal imputada a sucursales comerciales.

## Validaciones técnicas

- `supabase db reset`: PASS, incluyendo migración 041.
- `supabase db diff --local`: PASS, sin cambios de esquema pendientes.
- `supabase db lint --local`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

## Gap de entorno local

La semilla local contiene `Sucursal Central - Huehuetenango`, Norte y Sur; no contiene una sucursal llamada `FFERSSI Central`. No se creó ni se sustituyó esa entidad. Por tanto, la prueba local del gasto central queda bloqueada hasta que el entorno de validación tenga la configuración real de producción: fila `FFERSSI Central`, caja abierta asociada y las tres sucursales comerciales.

## Estado de publicación

- Código local: IMPLEMENTADO.
- Migración 041 local: APLICADA Y VALIDADA.
- Producción Supabase: PENDIENTE de aplicar 041 en el único despliegue final.
- Netlify: PENDIENTE del único despliegue final.
- Pruebas manuales móviles 360/390/430: pendientes de ejecutar en el entorno final con datos válidos.

## Criterio de cierre

No marcar go-live completo hasta validar en producción la cotización con `1`, `4`, `1.25`, `10.25`, `1,25`, extras nuevos, descuento aprobado, diseño con precio/costo y gasto cuyo origen sea `FFERSSI Central`.

## Hotfix posterior

- Causa confirmada del extra que no sumaba: el cliente enviaba `extra_ids`, mientras `crear_cotizacion` lee el arreglo contractual `extras`. La RPC interpretaba la línea como si no tuviera extra.
- Se añadió `normalizeExtra` para convertir respuestas antiguas y nuevas a `{ id, nombre, precioAdicional, activo }`, rechazando `null`, `undefined`, `NaN` y precios no numéricos.
- La cotización envía ahora `extras` con snapshot de `precio_adicional`; el backend vuelve a validar el precio contra el catálogo y persiste `cotizacion_item_extras`.
- FFERSSI Central usa la constante compartida `86dea3fb-4d59-4d86-9ef6-73faaab80198`; no se busca solo por nombre ni se repite el UUID en componentes.
- El formulario de diseño ya no muestra `Precio`; conserva únicamente Precio base, Precio mayorista y Costo. El valor interno `disenos.precio` se deriva de Precio base para mantener una sola fuente visible.
- No se creó migración 042.
