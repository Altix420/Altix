# ALTIX Local Test Users

> **LOCAL ONLY / NEVER PRODUCTION.** Estas cuentas son fixtures deterministas para `supabase db reset`. No reutilizar sus credenciales fuera del entorno local.

## Credenciales

| Tipo | Email | Password | Perfil | Sucursal asignada |
| --- | --- | --- | --- | --- |
| Admin 1 | `admin@altix.gt` | `Altix2026!` | administrador | acceso consolidado |
| Admin 2 | `admin2@altix.local` | `AltixAdmin2026!` | administrador | acceso consolidado |
| Admin 3 | `admin3@altix.local` | `AltixAdmin2026!` | administrador | acceso consolidado |
| Vendedor 1 | `vendedor1@altix.local` | `AltixVendor123!` | vendedor | Central |
| Vendedor 2 | `vendedor2@altix.local` | `AltixVendor123!` | vendedor | Central |
| Vendedor 3 | `vendedor3@altix.local` | `AltixVendor123!` | vendedor | Central |
| Vendedor 4 | `vendedor4@altix.local` | `AltixVendor123!` | vendedor | Norte |
| Vendedor 5 | `vendedor5@altix.local` | `AltixVendor123!` | vendedor | Norte |
| Vendedor 6 | `vendedor6@altix.local` | `AltixVendor123!` | vendedor | Sur |
| Vendedor 7 | `vendedor7@altix.local` | `AltixVendor123!` | vendedor | Sur |

## Sucursales deterministas

| Alias | ID | Nombre |
| --- | --- | --- |
| `b1` | `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11` | Sucursal Central - Huehuetenango |
| `b2` | `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22` | Sucursal Norte - Aguacatán |
| `b3` | `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33` | Sucursal Sur - Chiantla |

## Uso

```bash
supabase db reset
```

La semilla crea también inventario mínimo en las tres sucursales, un cliente final y un cliente mayorista. Para probar aislamiento, usar sesiones autenticadas separadas y consultas directas a Supabase; no depender solo de los filtros visuales.

