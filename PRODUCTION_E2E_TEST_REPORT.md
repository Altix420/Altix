# ALTIX V1 Production E2E Test Report

Fecha: 2026-09-30

## Pruebas ejecutadas

| Prueba | Resultado | Evidencia |
| --- | --- | --- |
| Reconstrucción de base | PASS | `supabase db reset`, migraciones 001-032 |
| Diff limpio | PASS | `supabase db diff --local` sin cambios después del último reset |
| Seed operativo | PASS | 3 sucursales, 3 Admin, 7 Vendor, 20 productos, 10 mayoristas, 5 diseños, 5 extras |
| RLS Admin/Vendor por sucursal | PASS local | Sesiones autenticadas independientes |
| Perfil inactivo | PASS local | Sin sucursales, inventario ni registros propios visibles |
| Meta Admin -> Vendor | PENDIENTE | Requiere guardar una meta y abrir sesión Vendor nueva |
| Venta -> caja -> inventario | PENDIENTE | Mutación financiera controlada no ejecutada en esta auditoría |
| Cotización -> aprobación -> pedido | PENDIENTE | Requiere ciclo de datos completo |
| Crédito -> pago parcial -> pago total | PENDIENTE | Requiere operación financiera controlada |
| Entrega -> comisión | PENDIENTE | Requiere venta/pedido persistido |
| Devolución -> ajuste | PENDIENTE | Requiere venta original persistida |
| R2 PUT/GET y reload | BLOQUEADO | Secretos/bucket externos no configurados |
| Backup/restore | NO EJECUTADO | No existe dump productivo ni entorno aislado |
| Netlify/HTTPS | NO EJECUTADO | No existe deploy productivo conectado |

## Regla de interpretación

Los resultados `PASS local` no autorizan por sí solos un go-live. Las operaciones financieras deben repetirse en el entorno de aceptación con usuarios de prueba, registrar IDs, recargar la aplicación y comprobar Admin/Vendor, reportes y auditoría.

## Validación automatizada final

`supabase db reset`, `supabase db diff --local`, `supabase db lint --local`, `npx tsc --noEmit`, `npm run lint` y `npm run build` pasaron. El build deja únicamente un aviso de tamaño de bundle.
