# ALTIX - Final Construction Report

Date: 2026-10-01  
Branch: `production-v1-finalization`  
Scope: final construction pass before manual production validation.

## Completed In Construction

- Added migration `20260930070000_033_financial_lifecycle_completion.sql` without modifying migrations 001-032.
- Hardened `saldo_favor` with actor validation, reference authorization, ledger author, operation idempotency and payload checks.
- Enabled credit payments against accounts linked to a pedido before a venta exists.
- Enabled `saldo_favor` as a real payment method with atomic balance consumption.
- Added return ledger traceability and proportional commission adjustment.
- Added operation idempotency to gastos and linked each expense to its cash movement.
- Rejected pending expenses now create an explicit reimbursement movement; the original expense remains historical.
- Connected operation IDs from Admin and Vendor UI for expenses, credit payments and returns.
- Regenerated database types from the local schema.
- Preserved active-user and branch-access RLS hardening from migrations 031-032.
- Preserved PWA shell caching with Supabase/R2 endpoints excluded from the service-worker cache.

## Local Evidence

| Check | Result |
|---|---|
| `supabase db reset` through migration 033 | PASS |
| `supabase db diff --local` | PASS, no schema changes |
| `supabase db lint --local` | PASS, no schema errors |
| Authenticated local inventory/cash/financial RPC cycle | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS, 0 warnings and 0 errors |
| `npm run build` | PASS |
| `git diff --check` | PASS |

The authenticated local cycle covered entry, transfer, defective registration without available-stock reduction, adjustment request/approval, physical count, cash opening, expense rejection with reimbursement, credit sale, return, saldo-favor payment and resulting balances.

## Not Yet Proven In This Phase

- Supabase PROD migration application and real RLS tests with one Admin and multiple Vendor accounts.
- Cloudflare R2 PROD bucket, secrets, CORS, PUT and signed GET verification.
- Netlify HTTPS deployment, environment variables and SPA refresh smoke test.
- Backup creation and a real restore rehearsal.
- Browser E2E across Admin/Vendor roles and multiple branches.
- Manual responsive validation on desktop, tablet and mobile.
- Final bundle performance review; Vite reports a 788 KB minified JS chunk.

## Promotion Status

| Block | Implemented locally | Deployed to PROD | Verified in PROD |
|---|---|---|---|
| Migration 033 | YES | YES | YES: remote history and RPC signatures confirmed |
| Financial RPC lifecycle | YES | YES | YES: remote function signatures confirmed |
| Edge Functions | YES | YES: already deployed | YES: downloaded remote source matches branch source |
| Frontend final branch | YES | NO: branch only | NO: Netlify deployment not accessible from this CLI session |
| Netlify environment variables | Config names documented | UNKNOWN | NO: CLI is not authenticated or site-linked |
| R2 production runtime | Edge source ready | UNKNOWN | NO: secrets, bucket, CORS and PUT/GET not inspected |
| Production backup | N/A | N/A | YES: encrypted dump created and checksum/decryption verified locally |

## Production Backup Reference

- Timestamp UTC: `20261001T191954Z`.
- Encrypted artifact: `~/Library/Application Support/ALTIX/backups/altix-prod-20261001T191954Z.tar.gz.enc`.
- SHA-256: `4a9ff5b5711bd203c52140150dba3792d3d62a86a0501831e078eac1e24ff576`.
- Key reference: local Keychain service `altix-prod-backup-033`.
- Restore process: retrieve the key from Keychain, decrypt with OpenSSL AES-256-CBC/PBKDF2, extract `schema.sql` and `data.sql`, restore only into an isolated Postgres/Supabase project, then validate counts and role access. A full isolated restore rehearsal remains pending.

## Construction Gate

**CONSTRUCTION = COMPLETE FOR LOCAL VALIDATION**

**PRODUCTION DATABASE MIGRATION = PROMOTED AND VERIFIED**

**PRODUCTION FRONTEND RELEASE = NOT VERIFIED**

The remaining frontend gates require Netlify site access: inspect production variable names/targets, create a Deploy Preview from `production-v1-finalization`, verify the preview, and only then merge to `main`. No merge was performed.

## R2 / DESIGN IMAGE PRODUCTION DEBUG

- **Netlify commit:** NOT VERIFIED. Netlify CLI is not authenticated or site-linked in this environment.
- **Production HTTP status and failing request:** NOT CAPTURED. The published site URL and DevTools session were not available here.
- **Configuration issue found in branch code:** the frontend selected `altix-dev` when `VITE_R2_BUCKET` was absent, while the Edge Function could sign `altix-prod`. This could make the persisted metadata disagree with the bucket that received the object.
- **Correction:** `src/storage/r2.service.ts` now uses the bucket returned by the signed-URL Edge Function and no longer requires `VITE_R2_BUCKET` in the frontend. `.env.example` no longer advertises that variable.
- **Diagnostics added:** safe stage logs for compression, signed URL, R2 PUT and `registrar_archivo`, with status and truncated response details only; no URLs, signatures or credentials are logged.
- **UI errors:** compression, signed URL, upload/CORS and metadata failures now have separate messages.
- **JPEG approximately 2 MB:** NOT VERIFIED against Netlify PROD.
- **WebP size, R2 object, Supabase metadata, Admin display and Vendor display:** NOT VERIFIED against Netlify PROD.
- **Current evidence:** TypeScript, lint, build and diff checks pass locally. This fix is implemented but R2 is not marked production-closed until the real Netlify/Preview flow completes end to end.
