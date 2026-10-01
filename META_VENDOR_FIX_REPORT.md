# ALTIX Meta Vendor Fix Report

## Causa raíz

Admin guardaba la meta total en `metas_sucursal` y generaba filas derivadas en `metas_vendedor`. El RPC `obtener_dashboard_vendedor` consultaba únicamente `metas_vendedor`, por lo que el dashboard no representaba el objetivo real de la sucursal.

## Cambio real

Se reemplazó el cuerpo del RPC existente para resolver la sucursal desde `usuario_sucursal`, buscar la meta activa vigente en `metas_sucursal` usando la fecha de negocio `America/Guatemala` y conservar como progreso las ventas del vendedor autenticado. No se creó una tabla ni un módulo nuevo.

La UI ahora etiqueta el valor como `Meta de sucursal`, muestra `Mis ventas` como progreso y comunica `No hay meta asignada para este periodo` cuando la consulta no encuentra una meta.

## Archivos y migración

- `supabase/migrations/20260930040000_030_vendor_branch_goal_and_image_hardening.sql`
- `src/vendor/VendorAnalyticsDashboard.tsx`

## Validación

La migración pasó `supabase db reset`, `supabase db diff --local`, `supabase db lint --local`, TypeScript, lint y build. La prueba de navegador Admin → guardar meta → Vendor aún requiere ejecutar la mutación con una cuenta de prueba y no se marca como PASS automático.

## Estado

Código y contrato: COMPLETE. Prueba end-to-end con meta persistida y dos vendedores: PENDIENTE de ejecución manual.
