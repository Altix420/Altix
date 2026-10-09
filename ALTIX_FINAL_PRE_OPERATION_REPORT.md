# ALTIX - Informe final previo a operación

Fecha de revisión: 2026-10-08

## Estado de implementación

- Migraciones 001-042: sin modificar.
- Migración nueva preparada: `20261010000000_043_design_cash_operation_hardening.sql`.
- Diseño independiente: economía, unidad y extras propios; la relación antigua queda solo como legado de compatibilidad.
- Producto: relación opcional `productos.diseno_id`; el formulario permite seleccionar un diseño existente y editar sus valores antes de guardar.
- Cotización: seleccionar un diseño no selecciona automáticamente un producto.
- Gastos: aprobar exige una sesión abierta y crea un único egreso idempotente.
- Depósitos: operación separada, con subtipo `deposito`, banco, referencia y responsable.

## Depósitos de efectivo

- RPC: `public.registrar_deposito_efectivo`.
- Naturaleza: egreso físico de caja con `subtipo = 'deposito'`; no usa `gastos`.
- Vendor: botón `Depósito` en la caja de su sucursal, con únicamente monto y razón visibles.
- Permisos: vendedor solo puede operar su propia sesión abierta y sucursal asignada; administrador puede operar sesiones autorizadas.
- Validación server-side: monto positivo y monto no mayor al efectivo esperado bloqueado de la sesión.
- Idempotencia: `operation_id` conserva un único movimiento y rechaza payloads distintos.
- Cierre: la fórmula existente suma ingresos y resta egresos, por lo que el depósito reduce efectivo esperado sin afectar ventas, utilidad, costos o comisiones.
- Historial: Vendor y Admin muestran el depósito por separado del gasto.
- Pruebas locales: PASS para saldo 4,000 después de depósito; exceso rechazado sin movimiento; retry devuelve el mismo ID; cierre físico 4,000 produce diferencia 0.

## Validación local

- `supabase db reset`: PASS.
- `supabase db lint --local`: PASS.
- `supabase db diff --local`: sin cambios fuera de la migración aplicada localmente.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS; queda la advertencia de tamaño del bundle principal.
- `npm audit --audit-level=high`: PASS, 0 vulnerabilidades.

## PROD

- Proyecto enlazado: PROD `tkhwzpocbyonurxwvmcv`.
- Frontend local: `127.0.0.1`, no PROD.
- `supabase migration list`: PROD alineado hasta 042; 043 local pendiente.
- `supabase db push --dry-run`: únicamente 043 pendiente.
- Migración 043 en PROD: APLICADA. `supabase db push` reportó PROD actualizado y `supabase migration list` muestra 043 local/remota.
- Backup pre-limpieza post-042: staging creado fuera del repositorio en `~/Library/Application Support/ALTIX/backups/altix-prod-pre-cleanup-042-20261009T053410Z/`.
- Archivo fuente empaquetado: `altix-prod-pre-cleanup-042-20261009T053410Z.tar.gz`, SHA-256 `70a8e0af81b50707990dcfc8a02d3625422185fc7cfcba79f0cefa84bdb9cfba`.
- Archivo cifrado: `altix-prod-pre-cleanup-042-20261009T053410Z.tar.gz.enc`.
- SHA-256 del archivo cifrado: `475a46e8e3059968fd0866c79274c126c50385197beb07110a9ea687d377b7aa`.
- Cifrado AES-256 y validación: CONFIRMADOS por el procedimiento previo.
- Limpieza PROD: NO EJECUTADA.
- `cleanup_pre_operation.sql`: preparado con bloqueo explícito y `ROLLBACK`; no contiene candidatos reales.

## Análisis de cleanup_pre_operation.sql

El script no tiene `INSERT` de candidatos, no contiene `DELETE` ejecutable y termina en `ROLLBACK`. Por lo tanto, el análisis actual es:

| Tabla | Candidatos a eliminar | Registros a preservar | Dependencias/FK | Usuarios afectados |
|---|---:|---:|---|---:|
| profiles | 0 | 4 | Referenciada por usuario_sucursal, ventas, gastos y caja | 0 |
| usuario_sucursal | 0 | 2 | FK a profiles y sucursales | 0 |
| sucursales | 0 | 3 | FK de operación, inventario, ventas y caja | 0 |
| clientes | 0 | 4 | FK de cotizaciones, pedidos, ventas y crédito | 0 |
| productos | 0 | 8 | FK de inventario, ventas, costos y movimientos | 0 |
| disenos | 0 | 5 | FK de cotizaciones, pedidos y archivos | 0 |
| extras | 0 | 4 | FK de relaciones comerciales | 0 |
| inventarios | 0 | 8 | FK a sucursales y productos | 0 |
| movimientos_inventario | 0 | 30 | Historial operativo; no se elimina | 0 |
| cotizaciones | 0 | 8 | FK a clientes, productos y diseños | 0 |
| pedidos | 0 | 4 | FK a cotizaciones, clientes y ventas | 0 |
| ventas | 0 | 23 | FK a pedidos, clientes y comisiones | 0 |
| venta_items | 0 | 22 | FK a ventas y productos | 0 |
| cuentas_cobrar | 0 | 2 | FK a clientes y ventas | 0 |
| pagos | 0 | 0 | FK a ventas y clientes | 0 |
| sesiones_caja | 0 | 6 | FK a sucursales, usuarios y movimientos | 0 |
| movimientos_caja | 0 | 30 | FK a sesiones; historial financiero | 0 |
| gastos | 0 | 9 | FK a sucursales, usuarios y movimientos | 0 |
| comisiones | 0 | 22 | FK a ventas y vendedores | 0 |
| archivos | 0 | 16 | Referencias desde productos/diseños | 0 |

- Productos afectados: 0.
- Diseños afectados: 0.
- Ventas, caja, gastos y comisiones afectados: 0.
- Usuarios afectados: 0; no se toca `auth.users`.
- FFERSSI Central y las 3 sucursales PROD se preservan.
- El administrador real y perfiles existentes se preservan.
- Objetos R2: no inspeccionados para borrado y no se eliminaron.
- Estado: esperar confirmación explícita antes de completar candidatos o ejecutar limpieza.

## Bloqueadores exactos

1. Identificar y aprobar explícitamente los IDs del usuario/datos de prueba antes de cualquier limpieza.
2. Confirmar el análisis de preservación anterior.

No se modificaron datos de PROD, no se hizo restore, no se creó migración 044 y no se desplegó frontend.

## Diagnóstico POS: apertura de caja

- Usuario afectado: `66c3e797-b9dc-40d2-983e-9faa35b13858`.
- Sucursal afectada: `68f1bc24-8c8b-4082-907a-9fcb7687f67a` (`sucursal prueba2`).
- Perfil PROD: activo, rol `vendedor`.
- Asignación PROD: activa para la sucursal afectada.
- Sesión PROD: existe una sesión `abierta`, con apertura `0.00`, responsable del usuario afectado.
- RLS PROD: las tablas `productos`, `inventarios`, `clientes` y `sesiones_caja` tienen RLS activo y políticas de lectura compatibles con el acceso por sucursal.

### Causa

`VendorPosPage` incluía catálogo, inventario, clientes y caja en un único `Promise.all`. Cualquier error de la consulta de caja se presentaba como `No se pudo cargar el punto de venta.` y ocultaba toda la pantalla operativa. Además, la consulta de caja dependía de un join anidado con `profiles` que no era necesario para vender ni para abrir caja.

### Corrección

- Catálogo, inventario y clientes se cargan como un bloque independiente.
- Caja se consulta por separado con sus columnas propias, sin join anidado de perfil.
- Un fallo de caja queda limitado al bloque de caja y no oculta el POS.
- El responsable se presenta como `Tú` cuando la sesión pertenece al usuario autenticado.
- No se modificó la base de datos, no se creó migración 044 y no se tocaron datos PROD.

### Validación del hotfix

- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS; permanece únicamente la advertencia existente de tamaño del bundle.
- `npm audit --audit-level=high`: PASS, 0 vulnerabilidades.
- `git diff --check`: PASS.
- `https://altix.pages.dev/`: HTTP 200.
