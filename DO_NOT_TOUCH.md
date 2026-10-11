# Do Not Touch

Archivos funcionales críticos. No modificarlos durante el rediseño visual.

- `src/App.tsx`
- `src/auth/context/AuthContext.tsx`
- `src/auth/context/auth-context.ts`
- `src/auth/hooks/useAuth.ts`
- `src/auth/auth.service.ts`
- `src/auth/components/ProtectedRoute.tsx`
- `src/admin/AdminRoute.tsx`
- `src/admin/admin.service.ts`
- `src/admin/admin.errors.ts`
- `src/comercial/ventas.service.ts`
- `src/storage/r2.service.ts`
- `src/vendor/vendor.service.ts`
- `src/shared/lib/supabase.ts`
- `src/shared/supabase.ts`
- `src/shared/types/database.types.ts`
- `src/shared/offline/db.ts`
- `src/shared/operation-id.ts`
- `src/shared/printing/printDocuments.ts`
- `src/main.tsx`
- `public/sw.js`
- `supabase/`
- `supabase/migrations/`
- `supabase/functions/`

Los cambios visuales en `Layout.tsx`, `VendorLayout.tsx` y pantallas que
mezclan datos con markup requieren revisión manual del diff.
