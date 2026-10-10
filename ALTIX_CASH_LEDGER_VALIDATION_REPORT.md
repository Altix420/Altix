# ALTIX Cash Ledger Validation Report

Fecha: 2026-10-09

## Estado

- Frontend objetivo: `https://altix.pages.dev`.
- PROD Supabase: proyecto enlazado `tkhwzpocbyonurxwvmcv`.
- Migraciones PROD: hasta `043`.
- Migración local preparada: `044_cash_ledger_and_mobile_hardening.sql`.
- PROD: 044 todavía no aplicada. El `supabase db push --dry-run` muestra únicamente 044 pendiente.
- No se ejecutó cleanup ni se modificaron datos PROD.

## 1. Catálogo e inventario móvil

Causa identificada: la relación PostgREST `productos -> disenos` puede llegar como objeto único. `ProductImage` la trataba siempre como arreglo y ejecutaba `.map()`, provocando una excepción de render cuando el producto tenía diseño.

Corrección local:

- acepta relación de diseño como objeto, arreglo o `null`;
- conserva fallback producto -> archivo -> diseño;
- muestra placeholder cuando no hay imagen;
- no cambia la lógica de stock ni oculta componentes.

Pendiente de validación manual en 360x800, 390x844 y 430x932 después del deploy.

## 2. Cierre de caja

La función PROD bloqueaba correctamente la sesión afectada porque existe un gasto pendiente asociado a ella. Además, el formulario representaba los billetes como montos y usaba `step=0.01`.

Corrección local:

- billetes Q200, Q100, Q50, Q20, Q10 y Q5 son cantidades enteras;
- monedas es monto decimal;
- valores vacíos se normalizan a cero antes de invocar la RPC;
- la RPC 044 normaliza y persiste todas las denominaciones;
- la diferencia puede ser distinta de cero y queda registrada;
- el error de cierre registra internamente `code`, `message`, `details`, `hint` y parámetros sin mostrar datos técnicos al usuario.

## 3. Efectivo esperado

La 044 crea `calcular_efectivo_esperado(sesion)` como fuente única:

`apertura + ingresos del ledger - egresos del ledger`

Transferencias, pagos digitales y crédito no generan movimiento físico. Depósitos, gastos aprobados, devoluciones y reintegros sí afectan el ledger físico cuando corresponde.

## 4. Gastos y aprobación

Causa identificada: `resolver_gasto` aceptaba una sesión abierta de cualquier sucursal y el formulario cargaba todas las cajas abiertas. Además, el registro administrativo exigía una caja de origen aunque FFERSSI Central no necesita caja abierta.

Corrección local 044:

- un gasto administrativo sin caja de origen se guarda pendiente;
- se puede imputar a una sucursal real sin abrir caja en Central;
- la aprobación solo acepta la caja abierta de `sucursal_imputada_id`;
- si no existe, devuelve un mensaje específico para esa sucursal;
- el retry usa el mismo `operation_id` y conserva un único egreso.

## 5. Depósitos

Se conserva el contrato 043: depósito = egreso con `subtipo = deposito`. Reduce efectivo esperado y no altera ventas, utilidad ni comisión.

## 6. Anticipos

La 044 conserva idempotencia y fuerza `sesion_caja_id` únicamente para anticipos en efectivo. Un anticipo por transferencia no aumenta efectivo ni queda asociado a una caja como movimiento físico.

## 7. Pedido -> venta

La 044 ajusta `confirmar_pedido_venta` para que el pago final solo cree movimiento de caja cuando la forma de pago sea efectivo. Transferencias finalizan el saldo comercial sin aumentar efectivo.

También agrega `ventas.pagos_snapshot` para reconstruir anticipos y pago final sin volver a ingresarlos al ledger.

## 8. Auditoría Q39,500

La operación PROD localizada:

- pedido: `439ab8ca-3123-47e1-8c71-5cf64054b67f`;
- venta: `094fa634-4574-4015-a9da-e04d2cfb3d05`;
- total de venta: Q39,500;
- anticipos: Q20,000 efectivo, Q10,000 transferencia, Q9,500 efectivo;
- no existe movimiento de caja por Q39,500 adicional al finalizar;
- la transferencia no tiene movimiento de caja;
- la venta está asociada a la sucursal y vendedor afectados.

El ledger también contiene una venta de Q7,000, depósitos de Q6,500 y Q9,500, por lo que el esperado actual de esa sesión es Q20,500. La operación no se modificó durante la auditoría.

## 9. Nuevas sucursales y vendedores

No se crearon fixtures ni usuarios reales. La 044 elimina la dependencia funcional de una caja de Central para gastos imputados y usa sucursal, usuario y sesión recibidos por contrato. La validación con fixtures queda pendiente de ejecutar en un entorno autorizado.

## 10. Validaciones locales

- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS; permanece la advertencia de tamaño del bundle.
- `npm audit --audit-level=high`: PASS, 0 vulnerabilidades.
- `git diff --check`: PASS.
- `supabase db reset`: BLOQUEADO porque Docker Desktop no está ejecutándose.
- `supabase db lint --local`: pendiente por el mismo bloqueo de Docker.
- `supabase db diff --local`: pendiente por el mismo bloqueo de Docker.

## 11. Bloqueador antes de PROD

Para aplicar 044 hace falta generar el backup actual de PROD siguiendo `PRODUCTION_BACKUP_RUNBOOK.md`. En la sesión actual no están disponibles `PROD_DB_URL` ni `BACKUP_PASSPHRASE`; por seguridad no se aplica la migración ni se despliega Cloudflare hasta completar backup, checksum y verificación.

## Resultado

- MOBILE FIX = IMPLEMENTADO LOCALMENTE / PROD PENDIENTE.
- CASH LEDGER HARDENING = IMPLEMENTADO LOCALMENTE / PROD PENDIENTE.
- EXPENSE BRANCH SAFETY = IMPLEMENTADO LOCALMENTE / PROD PENDIENTE.
- MIXED PAYMENT PROTECTION = IMPLEMENTADO LOCALMENTE / PROD PENDIENTE.
