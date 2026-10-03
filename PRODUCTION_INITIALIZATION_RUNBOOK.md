# ALTIX Production Initialization Runbook

This runbook initializes a new ALTIX business configuration from the Admin panel. It does not use `seed.sql`, direct writes to `auth.users`, direct stock updates, or fabricated inventory.

## Preconditions

- Supabase PROD is linked to the intended project.
- Migration `034_production_initialization.sql` is applied.
- At least one administrator can sign in.
- Cloudflare R2 and Netlify environment variables are configured separately.

## Sequence

1. **Create branches**
   - Open Admin > Sucursales.
   - Create each branch with its real name.
   - Keep a branch active only while it is operational.
   - Never delete a branch with history; deactivate it instead.

2. **Create Auth users**
   - Create the user's credentials in Supabase Auth using the approved administrative procedure.
   - Do not insert directly into `auth.users` from the frontend.
   - The Auth user must have a matching `profiles` row before operational assignment.

3. **Configure vendors**
   - Open Admin > Vendedores.
   - Select the existing Auth-backed profile.
   - Set the display name, active state, and exactly one active branch.
   - An active vendor without a branch is rejected by the backend and blocked by the Vendor route.

4. **Create products**
   - Open Admin > Productos.
   - Create each real SKU with base price, wholesale price, cost, and optional category.
   - The product RPC writes both the sellable product and its restricted cost record.

5. **Create designs and extras**
   - Open Admin > Catálogo.
   - Create a design and associate it with an existing sellable product/SKU.
   - Upload the image through the existing R2 flow.
   - Configure extras only from the real Extras form.

6. **Register initial stock**
   - Open Admin > Inventario.
   - Select the product/branch row, including rows currently at stock `0`.
   - Use **Registrar entrada** with the real quantity and mandatory reason.
   - This calls `registrar_entrada_inventario`, writes the inventory row, and creates the Kardex entry atomically.
   - Never edit `inventarios.stock` directly.

7. **Open cash**
   - Open Admin > Caja, or let the assigned vendor open the branch session from POS when that is the approved operating policy.
   - Use the real opening balance.
   - Only one open session is allowed per branch.

8. **Create clients and credit requests**
   - A vendor can create a final client with zero requested credit.
   - A wholesale client includes the requested amount and creates an Admin approval request.
   - The vendor never sets `monto_autorizado`.

9. **Verify operation**
   - Vendor login resolves the assigned branch.
   - Catalog shows active products and designs independently of stock.
   - POS shows only sellable products with available stock.
   - Admin verifies the sale, stock movement, cash movement, commission, quotation, and approval state.

## Controlled acceptance test

Use named test records only in an agreed acceptance window. Record IDs and remove or deactivate records through supported business flows after verification. Do not run the test against live customer activity or close a live cash session.

## Current PROD observation (2026-10-02)

The linked PROD database currently has no branches, no vendor assignments, no products, no extras, and no inventory rows. It has one administrator profile, one vendor profile, and two existing designs. The Admin initialization flow must be used to complete those records.
