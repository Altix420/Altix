# Antigravity Safe Files

## SAFE

Archivos de presentación centralizada con bajo riesgo funcional:

- `src/index.css` (tokens y estilos visuales; no cambiar selectores funcionales)
- `tailwind.config.js` (solo theme visual)
- `src/shared/components/` cuando el archivo sea puramente visual
- `public/favicon.svg` (solo presentación de icono)

## SAFE WITH CAUTION

Estos archivos mezclan markup y comportamiento. Solo se pueden cambiar
`className`, estructura presentacional no interactiva y texto visual, sin mover
o editar estados, efectos, queries, handlers ni cálculos:

- `src/auth/pages/Login.tsx`
- `src/shared/components/Layout.tsx`
- `src/vendor/VendorLayout.tsx`
- `src/vendor/VendorRoute.tsx`
- `src/dashboard/pages/Dashboard.tsx`
- `src/admin/AdminPages.tsx`
- `src/admin/AdminAnalyticsPages.tsx`
- `src/admin/AdminConfigurationPage.tsx`
- `src/admin/AdminGoalsPage.tsx`
- `src/admin/AdminInitializationPages.tsx`
- `src/admin/AdminActionForms.tsx`
- `src/admin/AdminCatalogForms.tsx`
- `src/vendor/VendorPages.tsx`
- `src/vendor/VendorAnalyticsDashboard.tsx`
- `src/vendor/VendorQuotationPage.tsx`
- `src/vendor/VendorApprovalsPage.tsx`

## FORBIDDEN

Todo lo listado en `DO_NOT_TOUCH.md`, incluyendo backend, Auth, PWA,
servicios, tipos generados, rutas y contratos.
