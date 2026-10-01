# ALTIX V1 Production Readiness Checklist

Fecha de revisión: 2026-09-29

## R2 y archivos

- [x] El navegador no contiene credenciales R2; solo invoca la Edge Function.
- [x] `r2-presigned-url` exige sesión autenticada.
- [x] PUT exige perfil `administrador`.
- [x] Path, prefijo, MIME, tamaño máximo de 10 MB y bucket se validan antes de firmar.
- [x] `registrar_archivo` exige Admin y solo persiste metadata: path, nombre, MIME, tamaño, bucket, relación y auditoría de creación.
- [x] Prefijos permitidos: `disenos/`, `lanzamientos/`, `exports/`, `auditoria/`, `backups/`.
- [ ] Configurar secretos reales en local/dev: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=altix-dev`.
- [ ] Configurar secretos reales en producción con `R2_BUCKET=altix-prod`.
- [ ] Probar subida binaria real, reemplazo y lectura Vendor con un bucket R2 accesible.

Configuración local recomendada, fuera del repositorio:

```bash
supabase secrets set R2_ACCOUNT_ID="..." R2_ACCESS_KEY_ID="..." R2_SECRET_ACCESS_KEY="..." R2_BUCKET="altix-dev"
supabase functions serve r2-presigned-url
```

Producción Supabase:

```bash
supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase db push
supabase secrets set R2_ACCOUNT_ID="..." R2_ACCESS_KEY_ID="..." R2_SECRET_ACCESS_KEY="..." R2_BUCKET="altix-prod"
supabase functions deploy r2-presigned-url
```

## Impresión V1

- [x] Ticket de venta con folio, fecha, vendedor, sucursal, cliente, líneas, total y saldo.
- [x] Cotización con vigencia, aceptación, líneas, diseños, extras, descuento, total y forma de pago.
- [x] Orden con cotización origen, estado, líneas, anticipos, saldo y total.
- [x] Layout dedicado para 58 mm.
- [x] Layout dedicado para 80 mm.
- [x] La impresión ocurre después de leer el documento confirmado y nunca participa en la transacción.
- [x] PDF fallback mediante `Imprimir > Guardar como PDF` del navegador.
- [ ] Impresora térmica física validada en cada modelo objetivo.

Nota: la tabla `ventas` no persiste el tipo exacto entre efectivo, tarjeta y transferencia. El ticket no inventa ese dato y muestra que no está persistido; crédito sí se identifica por la cuenta por cobrar real.

## Seguridad y RLS

- [x] Admin y Vendor autenticados probados contra Supabase local.
- [x] Vendor no modifica diseños, costos, metas, sucursales ni archivos.
- [x] Vendor no opera otra sucursal.
- [x] Vendor no salta aceptación de cliente ni límite de crédito.
- [x] Admin conserva lectura consolidada local.
- [x] RLS de costos, archivos, inventario y auditoría verificado.
- [x] Prueba local reproducible con 3 sucursales, 7 vendedores y 3 administradores mediante sesiones autenticadas independientes.
- [ ] Prueba equivalente en un tenant de producción, pendiente de configuración del proyecto productivo.

## Supabase, R2 y Netlify

- [x] Migrations reproducibles localmente hasta `025_product_cost_defaults.sql`.
- [x] Cron y Edge Runtime están declarados en `supabase/config.toml`.
- [ ] Proyecto Supabase de producción enlazado y migraciones aplicadas por CLI.
- [ ] Cron de producción verificado.
- [ ] Bucket `altix-prod`, CORS y prefijos creados.
- [ ] Variables de producción de Netlify configuradas sin credenciales DEV.
- [ ] Build y routing SPA verificados en Netlify.
- [ ] PWA/service worker verificado si se habilita posteriormente.

## Backups y restore

- [x] Migrations y seed versionados en Git.
- [x] Validación local de reconstrucción con `supabase db reset`.
- [ ] Backup Postgres programado en el proyecto de producción.
- [ ] Manifiesto R2 para objetos y metadata de `archivos`.
- [ ] Simulacro de restore en un proyecto de producción aislado.

## Estado de cierre

| Control | Estado |
| --- | --- |
| R2 IMAGE FLOW | NO, faltan secretos y bucket/runtime externo |
| PRINT 58MM | PASS por browser print |
| PRINT 80MM | PASS por browser print |
| PDF/FALLBACK | PASS por Guardar como PDF del navegador |
| RLS FINAL REVIEW | PASS en pruebas locales Admin/Vendor |
| 3-BRANCH ISOLATION | PASS local con 3 sucursales y 7 vendedores; producción pendiente |
| BACKUP/RESTORE | PASS para reconstrucción local; restore productivo pendiente |
| NETLIFY PRODUCTION READY | NO, no hay entorno/deploy productivo verificado |
| SUPABASE PRODUCTION READY | NO, solo entorno local verificado |
| ALTIX V1 | NO, bloqueado por infraestructura de producción no configurada |

## AUDIT UPDATE 2026-09-30

- Migration chain now includes `026` through `032`; the active-user and branch-access hardening is versioned.
- Local seed now contains the requested realistic minimum: 3 branches, 3 Admin, 7 Vendor, 20 products, 10 wholesale customers, 5 designs and 5 extras.
- Local RLS evidence was repeated after migration `032`: inactive Vendor returned no profiles, branches, inventory, metas, approvals or commissions; Vendor Central and Norte saw only their branch inventory; costs remained Admin-only.
- A minimal production-safe service worker is now versioned for the frontend app shell. Supabase, Auth, Storage, Edge Functions and R2 paths are excluded from browser cache.
- The checklist remains **NO for production** until Supabase PROD, R2 PROD, Netlify, backup/restore and E2E acceptance evidence exist.
