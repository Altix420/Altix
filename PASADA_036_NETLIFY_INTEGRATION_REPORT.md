# Pasada 036 - Integración Netlify

## Estado actual

- Rama: `production-v1-finalization`.
- Commit de la pasada: `1cb429b`.
- `main` está un commit atrás y no fue modificado.
- Supabase vinculado: proyecto `Textiles`, ref `tkhwzpocbyonurxwvmcv`.
- PROD tiene aplicadas las migraciones 001 a 035.
- `supabase db push --dry-run` reporta únicamente `20261003010000_036_sales_unit_and_mobile_support.sql` pendiente.

## Validación local

- `supabase db reset`: PASS.
- `supabase db lint --local`: PASS.
- `supabase db diff --local`: PASS, sin diferencias.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS. Vite mantiene únicamente el warning de tamaño del bundle.
- La búsqueda de truncamientos no encontró usos comerciales de `parseInt`, `Math.floor` o `Math.round`. Los únicos `Math.round` están en compresión/redimensionado de imágenes.

## Bloqueo de producción

No se ejecutó `supabase db push`. El procedimiento aprobado del repositorio exige un dump PROD cifrado, checksum, ubicación de almacenamiento y restore verificable; `BACKUP_RESTORE_TEST.md` mantiene ese proceso como no ejecutado y no existe una referencia operativa a la clave o ubicación del backup. Aplicar 036 sin esa evidencia incumpliría el control de reversibilidad.

Por la misma razón no se hizo todavía:

- aplicación de 036 en PROD;
- integración de `production-v1-finalization` en `main`;
- push de `main`;
- publicación o validación del deploy de Netlify.

## PWA y Netlify

- Netlify sigue configurado como destino oficial (`npm run build` hacia `dist`).
- `/sw.js` tiene `Cache-Control: no-cache, no-store, must-revalidate`.
- Los assets con hash usan `immutable`.
- El Service Worker usa `skipWaiting`, elimina caches anteriores y reclama clientes activos.
- No se implementó Cloudflare Pages, Workers, Pages Functions, DNS ni nueva infraestructura.

## Resultado

La integración queda **lista técnicamente y detenida antes de PROD** por falta de backup cifrado verificable. No se declaró E2E PROD PASS ni ALTIX terminado. Se requiere completar el backup/restore aprobado y proporcionar su referencia antes de continuar con `db push`, merge y Netlify.
