# ALTIX Image Compression Report

## Flujo

`AdminDesignsPage` procesa el archivo antes de llamar a `uploadFileToR2Service`. La secuencia es: validar JPEG/PNG/WebP, leer orientación mediante `createImageBitmap`, redimensionar a un máximo de 1600 px, generar WebP con calidades descendentes, detenerse al llegar a 300 KB y solo entonces solicitar la URL PUT firmada de R2.

## Cambios

- `src/storage/r2.service.ts`: utilidad reusable con resolución máxima de 1600 px, calidades finitas, preservación de WebP pequeño, nombre UUID y metadata del nombre original.
- `src/admin/AdminCatalogForms.tsx`: estado `Optimizando imagen...`, tamaño original/optimizado y subida únicamente del resultado optimizado.
- `supabase/functions/r2-presigned-url/index.ts`: se mantiene el control de MIME, tamaño, rol Admin y secretos fuera del frontend.

## Seguridad y persistencia

No se sube el original si la optimización termina correctamente. El path usa UUID y `registrar_archivo` conserva MIME, tamaño, bucket y nombre original. La asociación con `disenos.archivo_id` ocurre en la RPC existente `guardar_diseno`.

## Limitación real

La carga final no puede declararse PASS en este entorno sin secretos/bucket R2 configurados. La compresión cliente-side queda implementada y compilada; la prueba de subida, refresh y lectura desde Admin/Vendor requiere R2 operativo.
