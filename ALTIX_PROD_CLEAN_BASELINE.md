# ALTIX Production Clean Baseline

## Baseline funcional

- Entorno: Supabase PROD, proyecto `tkhwzpocbyonurxwvmcv`
- Migraciones: preservadas hasta 045
- Último estado funcional publicado: `6930845`
- Frontend PROD: Cloudflare Pages
- PWA shell: `altix-shell-v2`
- Sucursal preservada: `FFERSSI central`

## Estado de datos PROD

- Sucursales: 1
- Productos: 0
- Diseños: 0
- Extras: 0
- Ventas: 0
- Pedidos: 0
- Cotizaciones: 0
- Gastos: 0
- Comisiones: 0
- Inventario operativo: 0
- Sesiones de caja: 0
- Movimientos de caja: 0
- Clientes preservados: 4
- Perfiles preservados: 5
- Metadatos R2 preservados: 16
- Objetos físicos R2 eliminados: 0
- Auditoría técnica preservada

## Acceso validado

- Login Admin: PASS manual en PROD
- Vendor activo sin sucursal: estado pendiente mostrado correctamente
- Logout Vendor sin sucursal: PASS manual en PROD
- No se creó sucursal demo ni se reasignó ningún vendedor

## Alcance del congelamiento

Este documento marca la base funcional previa al rediseño visual. Desde el tag
`pre-visual-redesign` y la rama `ui/antigravity-redesign`, los cambios deben
ser exclusivamente de presentación. No se modifican Supabase, SQL,
migraciones, RPC, RLS, Auth, servicios, queries, hooks funcionales, rutas,
permisos, cálculos ni estados de negocio.

El archivo operativo `cleanup_final_prod.sql` permanece fuera del baseline y
no se incluye automáticamente en commits visuales.
