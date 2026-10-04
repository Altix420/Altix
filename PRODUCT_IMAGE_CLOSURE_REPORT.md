# ALTIX V1 — Cierre visual de productos e imágenes

Fecha: 2026-10-03  
Rama: `production-v1-finalization`

## Relación implementada

`productos.archivo_id` → `archivos.path` → objeto R2.

La migración `20261003020000_037_product_primary_image.sql` agrega la FK sin guardar binarios ni URLs presigned en PostgreSQL. La RPC `guardar_producto` fue ampliada para recibir `p_archivo_id` y validar que la metadata exista.

Fallback visual centralizado en `src/shared/product-images.tsx`:

1. imagen principal del producto;
2. imagen del diseño relacionado;
3. placeholder ALTIX.

La lectura usa el mecanismo GET firmado existente; nunca se usa una URL PUT para mostrar imágenes.

## Flujo R2

Se reutiliza `compressImageForR2` → Edge Function `r2-presigned-url` → PUT WebP → RPC `registrar_archivo` → asociación en `productos.archivo_id`.

La política de paths y la Edge Function ahora aceptan `productos/<uuid>.webp`. Se mantienen los paths existentes de `disenos`, `lanzamientos`, exports, auditoría y backups.

Al reemplazar una imagen solo cambia la referencia del producto. El objeto anterior no se elimina automáticamente.

## Pantallas modificadas

### Admin

- Admin Productos: miniatura, preview al editar, selección opcional, compresión, estados de procesamiento y asociación al guardar.
- Admin Inventario: imagen del producto con fallback.
- Admin Ventas: imagen en el detalle de venta.

### Vendor

- Inicio: eliminados únicamente “Ventas hoy” y “Ventas del mes”. Se mantienen comisión, clientes, mayoristas, cotizaciones, pedidos, meta, alertas y navegación.
- Catálogo: imagen principal, fallback de diseño y placeholder.
- Inventario: imagen por producto.
- Nueva venta/POS: imagen en resultados, producto seleccionado y carrito.
- Cotización: preview de producto/diseño y miniatura en cada línea.
- Ventas: miniatura en el detalle.

## Migración y despliegue backend

- 037 aplicada localmente: PASS.
- `supabase db lint --local`: PASS.
- `supabase db diff --local`: PASS, sin cambios fuera de migraciones.
- Dry-run PROD previo: únicamente 037 pendiente.
- 037 aplicada en PROD: PASS.
- PROD verificado alineado hasta 037.
- Edge Function `r2-presigned-url` desplegada para el proyecto PROD.

Respaldo previo a 037:

- `/Users/chriis/Library/Application Support/ALTIX/backups/product-image-037/schema-before-037.sql`
- `/Users/chriis/Library/Application Support/ALTIX/backups/product-image-037/data-before-037.sql`

El dump de datos está vacío porque PROD estaba limpio; se conserva como evidencia del estado previo.

## Validaciones

- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- Prueba visual manual completa Admin/Vendor: pendiente en el deploy final.
- Prueba real de upload de producto en PROD: pendiente.
- Fallback con producto sin imagen y diseño con imagen: cubierto por helper, pendiente de validación visual.
- Producto sin imagen ni diseño: placeholder cubierto por helper, pendiente de validación visual.

## Estado de publicación

- Commit integrado y publicado en `main`: `4448f4e`.
- Netlify PROD responde `200` en [https://altixv1.netlify.app/](https://altixv1.netlify.app/).
- El bundle público contiene `Descargar ventas CSV` e `Imagen principal`, confirmando que la publicación incluye esta pasada.
- La validación de login y upload real de producto todavía requiere interacción manual con credenciales.

No se modificaron comisiones, crédito, caja, RLS financiera, cierre de pedidos, KPIs, reportes CSV ni unidades 036.
