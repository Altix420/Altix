# ALTIX Final Security Audit

Fecha: 2026-10-11  
Proyecto enlazado: `tkhwzpocbyonurxwvmcv` (`Textiles`)  
Alcance: auditoría defensiva de código y configuración disponible. No se ejecutaron ataques externos.

## Hallazgos

| Riesgo | Severidad | Evidencia | Estado |
|---|---:|---|---|
| CORS wildcard en `r2-presigned-url` | Medium | La función devuelve `Access-Control-Allow-Origin: *` | PENDING |
| GET firmado para carpetas sensibles | Medium | La función permite GET autenticado sobre `backups`, `auditoria` y `exports` sin exigir rol Admin | PENDING |
| Headers de seguridad incompletos | Low/Medium | Producción expone `X-Content-Type-Options` y `Referrer-Policy`, pero no se observaron CSP, HSTS, Permissions-Policy ni frame protection | PENDING |
| Rate limiting de negocio no demostrado | Medium | No existe implementación propia para lecturas/escrituras de negocio; solo configuración de límites Auth local | ACCEPTED |
| Dependencias vulnerables | None | `npm audit`: 0 vulnerabilidades | FIXED/NO ISSUE |
| Inyección SQL dinámica no controlada | None encontrada | El `EXECUTE format()` revisado solo crea triggers sobre nombres internos de tablas | NO APPLICABLE |
| XSS por documentos impresos | None encontrada | `document.write` usa HTML construido con `escapeHtml` para datos de usuario | FIXED/NO ISSUE |
| Secretos frontend | None encontrada | `.env.local` usa únicamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`; no contiene service role ni secretos R2 | FIXED/NO ISSUE |

## Controles revisados

- RPCs `SECURITY DEFINER`: se observó `search_path = public, pg_temp` en las funciones endurecidas y validaciones de actor/rol/sucursal en los contratos principales.
- RLS: existen políticas por usuario activo, sucursal y rol Admin para las tablas operativas revisadas. La prueba completa de IDOR contra PROD requiere dos cuentas Vendor reales y queda pendiente.
- Service worker `altix-shell-v2`: no cachea rutas `/rest/`, `/auth/`, `/functions/`, `/storage/` ni `/graphql/`; solo mantiene el shell estático.
- CORS de producción: la respuesta pública contiene `Access-Control-Allow-Origin: *`; debe restringirse al origen real antes de considerar el control cerrado.

## Bloqueadores de validación PROD

No están disponibles en la sesión actual `PROD_DB_URL` ni `BACKUP_PASSPHRASE`. Por eso no se ejecutaron backup, borrado de clientes, pruebas IDOR reales ni cambios/despliegues contra PROD. No se imprimieron secretos ni se modificaron migraciones.

## Estado

Auditoría de código: COMPLETADA.  
Auditoría PROD y endurecimiento R2/headers: PENDING por falta de backup y credenciales operativas seguras.
