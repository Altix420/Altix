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

- Real RLS tests with one Admin and multiple Vendor accounts.
- Cloudflare R2 PROD bucket, secrets, CORS, PUT and signed GET verification.
- Netlify HTTPS deployment, environment variables and SPA refresh smoke test.
- Full isolated restore rehearsal.
- Browser E2E across Admin/Vendor roles and multiple branches.
- Manual responsive validation on desktop, tablet and mobile.
- Final bundle performance review; Vite reports a 788 KB minified JS chunk.

## Promotion Status

| Block | Implemented locally | Deployed to PROD | Verified in PROD |
|---|---|---|---|
| Migration 033 | YES | YES | YES: remote history and RPC signatures confirmed |
| Migration 034 initialization contracts | YES | YES | YES: remote history confirmed; no business seed data inserted |
| Financial RPC lifecycle | YES | YES | YES: remote function signatures confirmed |
| Edge Functions | YES | YES: already deployed | YES: downloaded remote source matches branch source |
| Frontend final branch | YES | NO: branch only | NO: Netlify deployment not accessible from this CLI session |
| Netlify environment variables | Config names documented | UNKNOWN | NO: CLI is not authenticated or site-linked |
| R2 production runtime | Edge source ready | UNKNOWN | NO: secrets, bucket, CORS and PUT/GET not inspected |
| Production backup | N/A | N/A | YES: encrypted dump created and checksum/decryption verified locally |

## Production Backup Reference

- Timestamp UTC: `20261003T054518Z`.
- Encrypted artifact: `~/Library/Application Support/ALTIX/backups/altix-prod-20261003T054518Z.tar.gz.enc`.
- SHA-256: `8c01e927071537a7d87c9fa2b6800e20ce4b816c614174c0903ab529310924a9`.
- Captured migration level: `033`, immediately before applying migration 034.
- Key reference: local Keychain service `altix-prod-backup-033`.
- Restore process: retrieve the key from Keychain, decrypt with OpenSSL AES-256-CBC/PBKDF2, extract `schema.sql` and `data.sql`, restore only into an isolated Postgres/Supabase project, then validate counts and role access. A full isolated restore rehearsal remains pending.

## Construction Gate

**CONSTRUCTION = COMPLETE FOR LOCAL VALIDATION**

**PRODUCTION DATABASE MIGRATIONS 001-034 = PROMOTED AND VERIFIED**

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

## R2 / PRESIGNED PUT CHECKSUM-CORS FIX

- **AWS SDK resolution:** the previous unpinned `@aws-sdk/client-s3@3` import resolved to `3.1145.0`; `@aws-sdk/s3-request-presigner@3` also resolved to `3.1145.0`.
- **SDK capability check:** `@aws-sdk/client-s3@3.1145.0` exposes `requestChecksumCalculation` in its actual `S3Client` types.
- **Cause addressed:** AWS SDK for JavaScript v3.729.0 and later can add a default CRC32 request checksum when no checksum is supplied. That checksum is incompatible with a presigned browser PUT when the signed request was created before the browser sends the real body.
- **Change applied:** `supabase/functions/r2-presigned-url/index.ts` pins both AWS packages to `3.1145.0` and configures `requestChecksumCalculation: 'WHEN_REQUIRED'`. The PUT command remains limited to `Bucket`, `Key` and `ContentType`.
- **Expected signed URL:** no `x-amz-checksum-crc32` or `x-amz-sdk-checksum-algorithm` parameters. The URL must retain the normal SigV4 fields and `x-id=PutObject`.
- **Browser content type:** the client must continue sending exactly the signed type, including `Content-Type: image/webp` for compressed WebP uploads.
- **R2 bucket CORS required:**

```json
[
  {
    "AllowedOrigins": ["https://altixv1.netlify.app"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"]
  }
]
```

- **CORS application status:** NOT VERIFIED/APPLIED from this workspace. R2 credentials and Cloudflare bucket administration are not available in the shell; this JSON must be applied to the production bucket by an authorized Cloudflare operator.
- **Edge Function deployment status:** DEPLOYED to Supabase PROD as `r2-presigned-url` version 8; remote status is `ACTIVE` with JWT verification enabled. The deployed function passed the public `OPTIONS` and unauthenticated `401` smoke checks.
- **Signed URL inspection status:** NOT COMPLETED. A valid Admin JWT is required to generate a URL without exposing production credentials; the public endpoint correctly rejects requests without authorization.
- **Real PUT status:** NOT VERIFIED. No production Admin JWT and no fresh WebP test file/URL were available for a non-destructive `curl` or Netlify upload.
- **Metadata/Admin/Vendor visibility:** NOT VERIFIED for the corrected upload path.
- **Closure rule:** R2 remains open until a fresh URL is inspected, the URL has no automatic checksum parameters, a real `PUT` returns `200`/`204`, metadata registration succeeds, and the object is visible in both Admin and Vendor flows.

## PRODUCTION INITIALIZATION PASS - 2026-10-02

- **PROD audit:** 0 branches, 2 profiles (`1 administrador`, `1 vendedor`), 0 branch assignments, 0 products, 0 inventory rows, 0 extras, and 2 designs. No sensitive identifiers are recorded here.
- **Migration 034:** added backend contracts for branch save/deactivation, Auth-backed vendor assignment, and product plus cost creation. Existing migrations 001-033 were not modified.
- **Initialization bug fixed:** the first inventory entry now records `stock_anterior = 0` instead of `NULL`, creates the inventory row, and writes the Kardex movement atomically.
- **Admin UI:** branch CRUD without physical deletion, vendor assignment/configuration, and product/SKU creation are connected to the new RPCs.
- **Vendor UI:** vendors without a branch are blocked with an actionable message; final-client creation no longer sends an empty numeric credit field; negotiated prices preserve temporary input values; active designs appear in Catalog; zero-stock products remain visible in inventory while POS still blocks sale quantity above stock.
- **Local acceptance:** `supabase db reset`, `supabase db lint --local`, `supabase db diff --local`, TypeScript, lint, build, and a controlled RPC initialization test passed locally.
- **PROD deployment:** Migration 034 APPLIED and verified after a fresh encrypted backup. No temporary production business records were inserted during this pass.
- **PROD initialization data:** NOT CREATED. Real branches, Auth users, assignments, products, and opening stock must be entered by the client through the runbook.
