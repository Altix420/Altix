# ALTIX V1 Production Readiness Report

Fecha: 2026-09-30

## Veredicto

**NO LISTO PARA GO-LIVE todavía.** ALTIX tiene una base funcional local, migraciones reproducibles, contratos RPC transaccionales, RLS de sucursal y frontend compilable. La entrega real está bloqueada por infraestructura externa y por pruebas de aceptación que requieren un entorno persistente controlado.

## Lo que sí está listo en local

- Esquema reconstruible desde migraciones hasta `032_active_branch_access_and_policy_hardening.sql`.
- Seed realista local: 3 sucursales, 3 administradores, 7 vendedores, 20 productos, 20 costos, 10 mayoristas, 5 diseños y 5 extras.
- Ventas, inventario, caja, cotizaciones, aprobaciones, crédito, comisiones, metas y auditoría tienen tablas/RPC o servicios existentes.
- Vendedor inactivo pierde el acceso a sucursales, inventario, metas, aprobaciones y comisiones.
- Compilación, lint de código y lint de esquema pasan.
- Manifest, redirect SPA y service worker de app shell están versionados. Las operaciones Supabase/R2 no se cachean.
- `netlify.toml` ya define build `npm run build`, publicación `dist`, headers básicos y caché segura de assets; esto no equivale a un deploy remoto.

## Bloqueadores de entrega

1. Proyecto Supabase PROD enlazado, migraciones aplicadas y políticas verificadas.
2. R2 PROD con bucket, CORS, secretos Edge, PUT/GET firmado y lectura después de reload.
3. Netlify PROD con variables, redirects, HTTPS y smoke test.
4. Backup Postgres, manifiesto R2 y restore comprobado.
5. E2E multi-rol/multi-sucursal con evidencia persistente y datos de prueba removibles.

## Criterio de aceptación

No se debe presentar ALTIX como producción hasta que los cinco bloqueadores tengan evidencia adjunta en este repositorio o en el entorno de entrega.

## Validación técnica final

- `supabase db reset`: PASS hasta migración 032.
- `supabase db diff --local`: PASS, sin cambios.
- `supabase db lint --local`: PASS.
- `supabase gen types`: PASS; archivo formateado con `oxfmt`.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS, 0 errores y 0 warnings.
- `npm run build`: PASS; queda solo aviso informativo de bundle JavaScript mayor a 500 KB.
- Servidor local: PASS, HTTP 200 en `http://localhost:5173/`.
