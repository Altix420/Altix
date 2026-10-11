# Antigravity Rules

ALTIX ya funciona. Esta rama prepara un rediseño exclusivamente visual.

## Permitido

- Apariencia, layout, responsive, tipografía, spacing, colores, bordes,
  sombras, cards, tablas, inputs, badges y estados visuales.
- Clases CSS, tokens y markup presentacional cuando no cambien el contrato del
  componente.

## Prohibido

- `supabase/`, `supabase/migrations/`, `supabase/functions/`
- `src/shared/types/database.types.ts`
- `src/shared/lib/supabase.ts`, `src/shared/supabase.ts`
- `AuthContext`, servicios, queries, RPC calls y hooks funcionales
- Validaciones, submit handlers, rutas, roles, permisos y contratos de datos
- Estado comercial/financiero, fórmulas, cálculos, caja, ventas, gastos,
  comisiones, inventario, cotizaciones y pedidos
- `public/sw.js` y `src/main.tsx`; el comportamiento PWA ya está validado

Si una mejora visual requiere lógica, no se implementa: se reporta.
