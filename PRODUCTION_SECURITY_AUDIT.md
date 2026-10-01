# ALTIX V1 Production Security Audit

Fecha: 2026-09-30

## Hallazgos corregidos

- `altix_can_access_branch` ahora exige perfil activo antes de autorizar una sucursal.
- Las políticas base de perfiles, sucursales, clientes, productos, diseños, extras, archivos y relaciones exigen usuario activo.
- Lecturas propias de metas, aprobaciones, cuentas, pagos de crédito y comisiones también exigen usuario activo.
- Admin y Vendor rechazan perfiles inactivos en las rutas frontend.
- Costos, archivos, auditoría y mutaciones sensibles permanecen detrás de Admin/RPC.
- Las funciones `SECURITY DEFINER` relevantes fijan `search_path = public, pg_temp`.
- R2 mantiene secretos únicamente en Edge; el frontend solo pide URLs firmadas.

## Evidencia local

- Admin local autenticado: 10 perfiles, 3 sucursales, 25 inventarios y 20 costos visibles.
- Vendor Central: 1 perfil, 20 inventarios y 0 costos.
- Vendor Norte: 1 perfil, 2 inventarios y 0 costos.
- Vendor inactivo: 0 perfiles, 0 sucursales, 0 inventarios, 0 metas, 0 aprobaciones y 0 comisiones.

## Riesgos abiertos

- No se ha ejecutado contra el proyecto Supabase PROD.
- No se ha completado una prueba formal con cuentas reales de onboarding, rotación de credenciales y recuperación de acceso.
- Rate limiting, MFA y monitoreo de abuso dependen de la configuración del proyecto Supabase y no están demostrados en local.
- CORS, expiración y ciclo completo de objetos R2 requieren configuración y prueba externa.

## Resultado

**SEGURIDAD LOCAL: PASS CON ALCANCE DECLARADO.**  
**SEGURIDAD DE PRODUCCIÓN: PENDIENTE, no debe marcarse PASS.**
