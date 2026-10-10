# ALTIX Cash Root Cause Report

Fecha: 2026-10-10
Entorno auditado: Supabase PROD `tkhwzpocbyonurxwvmcv`

## Causa raíz: aprobación de gastos

La función PROD `resolver_gasto(UUID, UUID, BOOLEAN, UUID)` está correctamente
implementada como `SECURITY DEFINER` y exige una sesión abierta cuando el gasto
se aprueba. El Centro de Aprobaciones (`/admin/aprobaciones`) llamaba esa RPC
con `p_gasto_id`, `p_aprobador_id` y `p_aprobar`, pero omitía
`p_sesion_caja_id`. La función rechazaba la operación con el mensaje de que no
existía una caja abierta para aplicar el gasto.

La corrección está en el frontend: antes de aprobar, se consulta la sesión
abierta de `item.sucursal_id` y se envía su id a `resolver_gasto`. El Admin no
necesita ser propietario de esa sesión.

## Causa raíz: cierre de caja

La función `cerrar_caja(UUID, JSONB)` de 044 permite cerrar al administrador o
al usuario propietario de la sesión y calcula el efectivo desde el ledger.
El bloqueo observado no era de autorización ni de firma RPC: las sesiones
afectadas tenían gastos `pendiente`, y 044 impide cerrar mientras existan.

La causa operativa compartida fue la aprobación incompleta de gastos: al no
recibir `p_sesion_caja_id`, los gastos permanecían pendientes y el cierre se
bloqueaba correctamente.

## Contrato real de caja

ALTIX modela una sesión financiera por sucursal. La base PROD mantiene el
índice único parcial `idx_sesion_caja_abierta_sucursal`, por lo que solo puede
existir una caja abierta por sucursal. La caja objetivo se resuelve por
`gastos.sucursal_imputada_id`; el actor administrativo es independiente del
usuario que abrió la caja.

Sesiones PROD observadas:

- `sucursal prueba`: sesión abierta del vendedor `vendedor`.
- `sucursal prueba2`: sesión abierta de `Vendedor 1`.
- Central: no requiere caja para originar un gasto administrativo.

## Ledger auditado

La función central `calcular_efectivo_esperado` calcula únicamente apertura más
ingresos físicos menos egresos físicos. Transferencias no generan movimientos
de caja. La auditoría PROD de la sesión `e163d166-d4fc-469d-84ac-df924f9b5ba2`
devolvió esperado Q20,500, consistente con su ledger y con el caso de venta
Q39,500: Q29,500 efectivo, Q10,000 transferencia y sin ingreso duplicado por
Q39,500.

## Implementación y alcance

- Migración 045: requerida para retirar el bloqueo incorrecto de pendientes.
- Migraciones 001-044: sin modificaciones.
- Datos financieros PROD: no alterados durante el diagnóstico.
- Sucursales y vendedores: no creados.
- Cleanup: no ejecutado.
- UUIDs de pruebas: no agregados al código. La consulta usa la sucursal de la
  solicitud y funciona igual para sucursales nuevas.

Backup pre-045 creado y validado antes de aplicar PROD:

- Archivo cifrado: `/Users/chriis/Library/Application Support/ALTIX/backups/altix-prod-pre-045-20261010T035531Z.tar.gz.enc`.
- Tamaño: 266384 bytes.
- SHA-256: `f4dbec8b762694067a0b25eb156391127caa1d76785f07cda3ee7bda4721fb86`.
- AES-256-CBC con PBKDF2 y salt.
- Verificación de checksum y descifrado/listado: PASS, 7 entradas.
- Backup fuente conservado; no se ejecutó restore ni cleanup.

Backup pre-045 creado y validado antes de aplicar PROD:

- Archivo cifrado: `/Users/chriis/Library/Application Support/ALTIX/backups/altix-prod-pre-045-20261010T035531Z.tar.gz.enc`.
- Tamaño: 266384 bytes.
- SHA-256: `f4dbec8b762694067a0b25eb156391127caa1d76785f07cda3ee7bda4721fb86`.
- AES-256-CBC con PBKDF2 y salt.
- Verificación de checksum y descifrado/listado: PASS, 7 entradas.
- Backup fuente conservado; no se ejecutó restore ni cleanup.

## Validaciones locales

- `supabase db reset`: PASS, migrations 001-044.
- `supabase db lint --local`: PASS.
- `supabase db diff --local`: PASS, sin cambios pendientes.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS; permanece la advertencia informativa de bundle mayor
  a 500 kB.
- `npm audit --audit-level=high`: PASS, 0 vulnerabilidades.
- `git diff --check`: PASS.

## Estado PROD

La corrección de aprobación ya está publicada y PROD confirma el efecto
correcto para el gasto `Tijera`: estado aprobado, un único movimiento de
egreso por Q50 y asociación con la sesión de `sucursal prueba2`.

El cierre sigue bloqueado por una causa de negocio explícita, no por una
firma RPC ni por permisos: el gasto `Almuerzo personal` continúa pendiente
por Q400 en esa misma sesión. La función 044 rechaza el cierre mientras exista
cualquier gasto pendiente para evitar cerrar una caja sin resolver.

La sesión PROD tiene esta resolución:

- RPC efectiva: `cerrar_caja(uuid, jsonb)`.
- Overloads: ninguno.
- Sesión: `e163d166-d4fc-469d-84ac-df924f9b5ba2`, sucursal `sucursal prueba2`.
- Propietario: `Vendedor 1`; Admin está autorizado por rol.
- Efectivo esperado RPC: Q20,450.
- Gasto aprobado asociado: Q50, un egreso.
- Gasto pendiente que bloquea: Q400.
- El cálculo de apertura + ingresos - egresos coincide con el ledger.

La UI ya traduce este error a: `No se puede cerrar la caja mientras exista un
gasto pendiente de aprobación.` No se requiere migración 045.

## Segunda causa: pendientes bloqueaban indebidamente el cierre

La condición incorrecta estaba dentro de 044:

```sql
IF EXISTS (
  SELECT 1 FROM public.gastos
  WHERE sesion_caja_id = p_sesion_caja_id AND estado = 'pendiente'
) THEN RAISE EXCEPTION ...;
END IF;
```

Esto no era compatible con el contrato financiero: `pendiente` no crea
movimiento y no debe afectar efectivo esperado, diferencia ni cierre. La
migración 045 elimina únicamente ese bloqueo. No cambia
`calcular_efectivo_esperado`, la autorización, las denominaciones ni la
inmutabilidad de una sesión cerrada.

Después del cierre, un gasto pendiente sigue pendiente. Si se aprueba después,
`resolver_gasto` exige una nueva sesión abierta de la misma sucursal y crea el
egreso en esa sesión; nunca modifica la sesión histórica cerrada. El rechazo
no crea movimiento.

## Migración 045

- Archivo: `20261012000000_045_allow_pending_expense_cash_close.sql`.
- Alcance: reemplaza `cerrar_caja(UUID, JSONB)` sin la condición de bloqueo por
  gastos pendientes.
- No modifica migraciones 001-044.
- No altera datos ni ejecuta cleanup.
- PROD aplicada: `20261012000000`.
- `supabase migration list --linked`: local y remoto alineados hasta 045.

## Pruebas locales 045

PASS en una transacción local después de `supabase db reset`:

- A/B: gasto aprobado descuenta Q50 exactamente una vez; dos pendientes no
  impiden cerrar en Q4,950 con diferencia Q0.
- C: gasto rechazado no crea movimiento.
- D: múltiples pendientes permanecen pendientes después del cierre.
- E: aprobación posterior usa una nueva caja abierta; la caja histórica no
  recibe movimiento.
- F: segunda sucursal y vendedor siguen el mismo contrato sin UUIDs de
  aplicación.

## Prueba PROD post-045

PASS sin aprobar ni rechazar `Almuerzo personal`:

- Sesión `e163d166-d4fc-469d-84ac-df924f9b5ba2` cerrada por Admin.
- Conteo físico: Q20,450 (`q200=102`, `q50=1`, resto 0).
- Esperado RPC: Q20,450.
- Diferencia: Q0.
- Movimientos antes y después: 6; no se creó movimiento por el pendiente.
- `Almuerzo personal`: continúa `pendiente`, Q400, sin `movimiento_caja_id`.
- Intento de segundo cierre: rechazado por sesión ya cerrada; la sesión quedó
  inmutable.

