# ALTIX Final Clean State Report

## Estado

**Limpieza final pre-rediseño visual: COMPLETADA**

La limpieza fue ejecutada en PROD dentro de una transacción. La primera
ejecución fue abortada por una protección de auditoría y quedó revertida; la
segunda ejecución terminó correctamente y fue confirmada.

## Backup específico de esta fase

- Archivo cifrado: `altix-prod-pre-visual-cleanup-20261011T032509Z.tar.gz.enc`
- Ubicación: `/Users/chriis/Library/Application Support/ALTIX/backups/altix-prod-pre-visual-cleanup-20261011T032509Z.tar.gz.enc`
- Tamaño: 107536 bytes
- SHA-256: `c6cf465903e8d03d852a403b747b95d1797414d063db1366049e689da88e039e`
- Descifrado y listado: PASS, 6 entradas

## Backup PROD previo a la limpieza

- Entorno: Supabase PROD (`tkhwzpocbyonurxwvmcv`)
- Fecha de generación: 2026-10-10 06:05:19 UTC
- Archivo cifrado: `altix-prod-pre-final-cleanup-20261010T060519Z.tar.gz.enc`
- Ubicación: `/Users/chriis/Library/Application Support/ALTIX/backups/altix-prod-pre-final-cleanup-20261010T060519Z.tar.gz.enc`
- Tamaño: 107584 bytes
- SHA-256: `9bc155e1d0ec0f14f41d4aa636768e21ffb0bf17d344e108a2418a540e7d8be1`
- Cifrado: AES-256-CBC con PBKDF2 y salt

Validaciones realizadas:

- checksum SHA-256: PASS
- archivo no vacío: PASS
- descifrado: PASS
- listado del tar.gz: PASS, 7 entradas
- restore PROD: no ejecutado

La passphrase no se incluye en este documento ni en el repositorio.

## Precondiciones verificadas

El UUID oficial `86dea3fb-4d59-4d86-9ef6-73faaab80198` existe en PROD y
corresponde a `FFERSSI central`.

Consulta realizada contra PROD para `public.sesiones_caja` con
`estado = 'abierta'`: cero filas.

## Dry-run PROD

| Tabla | Antes | A eliminar | A preservar |
|---|---:|---:|---:|
| sucursales | 4 | 3 | 1 |
| profiles | 5 | 0 | 5 |
| usuario_sucursal | 3 | 3 | 0 |
| clientes | 4 | 0 | 4 |
| productos | 8 | 8 | 0 |
| disenos | 5 | 5 | 0 |
| extras | 4 | 4 | 0 |
| inventarios | 10 | 10 | 0 |
| movimientos_inventario | 43 | 43 | 0 |
| cotizaciones | 12 | 12 | 0 |
| pedidos | 7 | 7 | 0 |
| ventas | 34 | 34 | 0 |
| anticipos | 12 | 12 | 0 |
| pagos | 0 | 0 | 0 |
| gastos | 12 | 12 | 0 |
| comisiones | 32 | 32 | 0 |
| sesiones_caja | 11 | 11 | 0 |
| movimientos_caja | 48 | 48 | 0 |
| archivos metadata | 16 | 0 | 16 |
| bitacora_auditoria | 349 | 0 | 349 |

También se eliminarían los registros derivados de créditos, conteos,
traslados, entregas, aprobaciones, ajustes y costos asociados según el orden
FK inspeccionado. Las reglas de comisión, categorías, funciones, RPC, RLS,
triggers, cron y enums no se tocan.

## Resultado real PROD

| Tabla | Resultado final |
|---|---:|
| sucursales | 1 |
| profiles | 5 |
| usuario_sucursal | 0 |
| clientes | 4 |
| productos | 0 |
| disenos | 0 |
| extras | 0 |
| inventarios | 0 |
| movimientos_inventario | 0 |
| conteos | 0 |
| cotizaciones | 0 |
| pedidos | 0 |
| ventas | 0 |
| anticipos | 0 |
| pagos | 0 |
| gastos | 0 |
| comisiones | 0 |
| sesiones_caja | 0 |
| movimientos_caja | 0 |
| aprobaciones | 0 |
| solicitudes_ajuste_inventario | 0 |
| traslados | 0 |
| defectuosos | 0 |
| archivos metadata | 16 |
| bitacora_auditoria | 587 |

Los conteos operativos coinciden con el objetivo. La bitácora pasó de 349 a
587 porque la propia limpieza generó eventos de auditoría; los 349 registros
históricos originales fueron preservados. No se eliminó ningún objeto R2.

## R2

No se eliminaron objetos físicos de R2. La tabla `archivos` contiene 16
metadatos que quedarían potencialmente huérfanos al retirar productos y
diseños. Se preservan para una eliminación separada:

```text
disenos/b2ca2691-6c77-4a16-82d1-1f1877fbd63b.webp
disenos/9d9ef2d7-8bcc-4a61-a257-ef3f037e6218.webp
disenos/4934ff39-10b3-42f8-91e8-9324c3551cb2.webp
disenos/ad5b8abf-8b50-4e55-935f-dbbd852df5ef.webp
disenos/5a3a9add-a8ed-4548-b23f-005dea372f75.webp
disenos/03f2500d-5d79-4091-91a1-1b66158a1d96.webp
disenos/7c15d147-7f40-460b-9b73-3ccc30e3e2bc.webp
productos/eb5491fd-c603-4d80-bf4a-59990faba305.webp
productos/68205423-8ea0-4b63-89b3-cffa29231233.webp
productos/26eca651-5843-4f4f-ba51-ccf7b465e10a.webp
disenos/5a2be60a-d403-4d6a-b93e-294b4280b214.webp
productos/8f52b706-31e3-4b79-944a-bf189299012a.webp
productos/2e99f709-0593-4428-83b4-e6ef92e0389b.webp
disenos/3aa9e0c7-b11e-47dd-b5dd-74d16cf60353.webp
disenos/f67063b0-7075-4be7-8078-c7d9ae5fb69d.webp
disenos/de6629ce-6298-4102-bf9f-26fab05f6666.webp
```

## Script preparado

[cleanup_final_prod.sql](/Users/chriis/ALTIX/cleanup_final_prod.sql)

El script valida el UUID y nombre de Central, cero cajas abiertas,
preservación de perfiles/clientes/auditoría/metadatos, elimina en orden FK
explícito y aborta si las invariantes finales no se cumplen. No es una
migración y no ha sido ejecutado.

No hay sesiones abiertas actualmente.

## Validación de acceso

- Auth users preservados: 5
- Perfiles administradores preservados: 2
- Perfiles vendedores preservados: 3
- Admin real candidato: `admin@fferssi.com`, activo, sin sucursal asignada.
- Admin adicional: `cristianjos@gmail.com`, activo, sin sucursal asignada.
- Vendor real candidato: `ven1s1@fferssi.com`, activo, sin sucursal asignada.
- Otros vendors: `ven2s1@fferssi.com` y `vendedor1@altix.local`, activos, sin
  sucursal asignada.
- Login Admin: **PENDIENTE DE VALIDACIÓN MANUAL**.
- Login Vendor: **PENDIENTE POR SUCURSAL**; el usuario es válido pero quedó sin
  asignación porque las sucursales comerciales fueron eliminadas.

No se intentaron contraseñas, no se modificó Auth y no se reasignaron usuarios.

## Procedimiento manual de validación

Abrir [ALTIX PROD](https://altix.pages.dev) y usar las credenciales reales
proporcionadas por el operador, sin compartirlas en el repositorio ni en el
chat.

### Admin

Con `admin@fferssi.com`:

1. Iniciar sesión.
2. Confirmar dashboard sin errores.
3. Confirmar clientes visibles y solo `FFERSSI central` en sucursales.
4. Confirmar productos, diseños e inventario vacíos.
5. Confirmar ventas, pedidos, cotizaciones, gastos y comisiones en cero.
6. Revisar que no haya errores visibles en consola.

### Vendor

Con `ven1s1@fferssi.com`:

1. Iniciar sesión.
2. Confirmar que el resultado corresponda a usuario válido sin sucursal.
3. No crear sucursal, no reasignar usuario y no crear datos demo.

El Vendor queda pendiente de asignación cuando se cree la primera sucursal
real. No se considera un bug de la limpieza.

## Estado final de esta ejecución

- Backup específico: verificado
- Limpieza: ejecutada y confirmada
- R2: no modificado
- Base de datos: no modificada
- Migraciones: no modificadas
- Funcionalidad: no modificada
- Confirmación de limpieza: recibida
- Admin login: pendiente de validación manual
- Vendor login: pendiente por sucursal
- Apto para baseline visual: no, hasta completar la validación manual Admin

## Corrección logout Vendor sin sucursal

- Causa: `VendorRoute` renderizaba la vista pendiente antes de montar
  `VendorLayout`, por lo que no existía un control de salida.
- Corrección: se agregó `Cerrar sesión` directamente en la vista pendiente.
- Auth utilizado: `signOut` existente de `AuthContext`.
- Navegación posterior: `/login` con `replace: true`.
- Backend/Auth/Supabase/RLS/migraciones: sin cambios.
- Validación local TypeScript: PASS.
- Validación local lint: PASS.
- Validación local build: PASS.
- `npm audit --audit-level=high`: PASS, 0 vulnerabilidades.
- `git diff --check`: PASS.
- Prueba manual PROD del botón: pendiente de credenciales reales.

## Diagnóstico posterior en PROD

- El bundle público de `https://altix.pages.dev` contiene el botón `Cerrar
  sesión` y la vista pendiente de sucursal.
- El bundle público también contiene `signOut` seguido de navegación a
  `/login` con `replace`.
- No se detectó ausencia del deploy funcional en el asset publicado.
- La PWA utilizaba `altix-shell-v1`; el service worker cacheaba recursos del
  app shell con una versión fija.
- Corrección aplicada: caché `altix-shell-v2` y registro con
  `updateViaCache: 'none'`, conservando `skipWaiting` y `clients.claim`.
- Auth backend, Supabase, RLS, migraciones y datos PROD: sin cambios.
- La prueba manual con Vendor real continúa pendiente para confirmar la
  actualización en el dispositivo afectado.
