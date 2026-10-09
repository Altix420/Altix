# ALTIX Pre Cloudflare Migration Fixes

## Cambios

- El registro administrativo ya no exige una caja abierta de FFERSSI Central. El origen se fija por la configuración compartida `86dea3fb-4d59-4d86-9ef6-73faaab80198` y se muestra como información de solo lectura.
- La sucursal imputada continúa siendo obligatoria y solo lista las sucursales operativas; Central queda excluida.
- Migración 042: `registrar_gasto` acepta origen sin sesión de caja y crea el gasto como `pendiente`. La aprobación puede aplicar un único egreso si se proporciona una caja abierta; sin caja, el gasto queda aprobado sin inventar movimiento de caja. El rechazo no genera efecto financiero.
- Migración 042: `guardar_diseno` acepta `p_unidad_venta` y actualiza la unidad del producto vinculado dentro de la misma operación. Producto/SKU sigue siendo autoridad para venta e inventario.
- Nuevo diseño muestra Unidad de venta, Precio base, Precio mayorista y Costo. Se eliminó el campo visual duplicado Precio.

## Validación local

- `supabase db reset`: PASS con 042.
- `supabase db lint --local`: PASS.
- `supabase db diff --local`: PASS, sin cambios pendientes.
- Firmas locales verificadas para `registrar_gasto`, `resolver_gasto` y `guardar_diseno`.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- `git diff --check`: PASS.

## Producción y publicación

- Supabase PROD: 041 aplicada; dry-run muestra únicamente 042 pendiente.
- Netlify: no se ejecutó deploy manual, preview ni Agent Runner.
- GitHub `main`: pendiente del único push final de este hotfix.
- Netlify conservará la versión actualmente publicada; cualquier pausa por créditos no se reintentará.

## Nota operativa

La base local no contiene la sucursal real FFERSSI Central, por lo que el flujo local de gasto contra ese UUID requiere la configuración de producción. La RPC valida la existencia de la sucursal y no crea datos implícitos.
