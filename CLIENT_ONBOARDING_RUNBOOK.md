# ALTIX Client Onboarding Runbook

## Prerrequisitos

- Proyecto Supabase PROD creado y respaldado.
- Bucket R2 PROD, CORS y secretos Edge configurados.
- Sitio Netlify PROD con HTTPS y variables públicas correctas.
- Responsable del cliente disponible para validar catálogo, usuarios y caja inicial.

## Orden de carga

1. Sucursales reales.
2. Administradores y vendedores, con asignación de sucursal.
3. Categorías y productos: SKU, nombre, costos y precios.
4. Reglas de descuento y comisión aprobadas por el negocio.
5. Clientes finales y mayoristas.
6. Límites y días de crédito autorizados.
7. Diseños, relación a SKU, extras e imágenes.
8. Inventario inicial por sucursal.
9. Caja inicial por sucursal.

## Validaciones antes de abrir operación

- Cada usuario inicia sesión y solo ve su rol/sucursal.
- Los costos no aparecen para Vendor.
- El inventario inicial coincide con el acta del cliente.
- Una venta controlada modifica inventario y caja una sola vez.
- Un crédito muestra vencimiento y saldo.
- Una imagen persiste en R2 y vuelve a cargar después de logout/login.
- El cliente firma la aceptación del catálogo, usuarios, crédito y caja inicial.

## Regla de importación

No importar saldos, stock o caja directamente a tablas transaccionales sin un procedimiento versionado. Las aperturas y ajustes deben usar los RPC/flujo administrativo correspondiente para conservar trazabilidad.

## Resultado actual

El runbook está preparado; la importación real y la firma del cliente todavía no se han ejecutado.
