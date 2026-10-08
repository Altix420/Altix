# ALTIX - Operational Validation Fixes

## Scope

Post-040 operational correction pass. No functional database changes were added, migrations 001-040 were left untouched, and no migration 041 was required for the fixes completed here.

## Implemented locally

### Caja

- Kept the transactional `cerrar_caja` RPC as the only close path.
- Confirmed the frontend sends `p_sesion_caja_id` and `p_denominaciones` with the existing contract.
- Billet fields are quantities: `q200`, `q100`, `q50`, `q20`, `q10`, and `q5`.
- The current backend contract treats `monedas` as a total monetary amount in Q because it has no individual coin denomination fields. The UI now labels this explicitly as `Monedas (monto total Q)`.
- Pending-expense closure errors are mapped to a concrete message instead of the generic caja error.
- The RPC persists expected amount, physical amount, difference, denominations, closing user, timestamp, and closed state.

### Gastos

- Fixed the Admin query by disambiguating both branch relationships:
  `gastos_sucursal_id_fkey` and `gastos_sucursal_imputada_id_fkey`.
- Added `Registrar gasto` from the Gastos page header.
- Admin can choose an open cash session as origin and assign the expense to an operational branch.
- Central remains administrative context; it is not inserted as a commercial branch or sale.
- Pending, approved, and rejected history remain distinct. The existing RPC flow preserves the rule that only approval creates one cash outflow.
- The backend has `created_at` as the expense date. There is no editable operational-date column in the current schema, so no unsupported date field was added.

### Ventas and approvals

- Admin sales default to the current month and allow custom dates plus a previous-month shortcut.
- Previous sales remain queryable; no records are deleted or archived by this pass.
- Approvals default to pending requests, with resolved requests available through a history view.
- Nested client, seller, and branch data now participates in the Admin list search instead of becoming `[object Object]`.
- Vendor POS and client pages now use backend client search by name, NIT/DPI, and telephone.

### Reports

- Sales export requires a valid date range and respects date, branch, seller, and payment filters.
- Sales report relations use explicit foreign keys to avoid PostgREST relationship ambiguity.
- Export failures now identify the failed report stage without exposing raw database errors.
- Sales export columns are: date, folio, client, client type, seller, branch, sale type, total, cost snapshot, profit, commission, and status.
- Numeric values remain numbers and sale dates remain `Date` values for Excel.
- Inventory export keeps only stock-oriented fields and adds `Fecha de corte`; it does not add sale dates, prices, costs, or monetary value.

### XLSX hotfix

- Root cause: the production browser export still failed while serializing `Date` cells in the shared `write-excel-file` path, even with a valid global date format. Both sales and inventory exports used `Date` cells, so the helper failed before browser download.
- Fixed `src/shared/export/excel.ts` to normalize text, finite numbers, valid dates, nulls, and unsupported values before building the sheet. Date cells are now emitted as ISO-readable text, avoiding the browser date serializer while preserving the mandatory date column.
- Kept the shared `dateFormat` option for compatibility with any remaining typed date cell and retained descriptive development-only console diagnostics.
- Sales rejects an invalid sale date instead of silently producing an incomplete mandatory date column.
- The browser API remains `write-excel-file/browser`; no Node export API or CSV fallback was introduced.
- Minimal workbook test with text, decimal, and date generated a valid XLSX archive; `unzip -t` passed.

## Local validation

- Authenticated local Gastos relationship query: HTTP 200.
- Authenticated local cash open and close: successful; expected Q1,000.00, physical Q1,000.00, difference Q0.00.
- Local expense lifecycle previously verified: pending creates no movement, approval creates exactly one egreso, rejection preserves history without a movement.
- `supabase db reset`: PASS through migration 040.
- `supabase db lint --local`: PASS, no schema errors.
- `supabase db diff --local`: PASS, no schema changes.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- `git diff --check`: PASS.
- Minimal `write-excel-file` workbook: PASS; XLSX archive integrity verified.

## Production status

This pass has not been deployed yet. Production reproduction of the original Caja and XLSX failures remains a required post-deploy smoke test. No claim is made here that the fixes are already verified in PROD.

## Genuine remaining backend gaps

- The current cash JSON contract has one aggregate `monedas` amount rather than separate coin denominations. A future schema/RPC change is needed only if the client requires coin-by-coin counting.
- Expenses expose backend `created_at`, not a user-editable accounting date. Adding an editable date requires a future migration and an explicit business decision.
- Browser-level production tests for close, Gastos loading, and Sales XLSX must be run after the single final deployment.

## Status

IMPLEMENTED LOCALLY: YES

DEPLOYED TO PROD: NO

VERIFIED IN PROD: NO
