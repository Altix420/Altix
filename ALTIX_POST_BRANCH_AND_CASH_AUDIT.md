# ALTIX Post-Branch And Cash Audit

Fecha: 2026-10-10 UTC

## 1. Backup pre-044

- Proyecto: Supabase PROD `tkhwzpocbyonurxwvmcv`.
- Archivo cifrado: `/Users/chriis/Library/Application Support/ALTIX/backups/altix-prod-pre-044-20261010T011232Z.tar.gz.enc`.
- Tamaño cifrado: 150032 bytes.
- SHA-256: `39ab0539fd0fd16f8f069a532940eacaef8d7f6816687442a005204e71dfd28f`.
- Cifrado: AES-256-CBC, PBKDF2 y salt.
- Validación: descifrado y listado TAR correctos; fuente conservada.
- La passphrase no se guardó en archivos, logs ni Git.

## 2. Migración 044

- `supabase db push --dry-run`: únicamente 044 pendiente.
- PROD: 044 aplicada correctamente.
- `supabase migration list`: local y remoto alineados hasta 044.
- No se modificaron migraciones 001-043.
- Cleanup: no ejecutado.

## 3. Sucursal y vendedor PROD

- Sucursal: `68f1bc24-8c8b-4082-907a-9fcb7687f67a`, activa.
- Vendedor: `66c3e797-b9dc-40d2-983e-9faa35b13858`, perfil activo y rol `vendedor`.
- `usuario_sucursal`: asignación correcta a la sucursal.
- PROD contiene 3 sucursales activas y 1 sucursal Central.
- PROD contiene 2 vendedores activos.

## 4. RLS y funciones

Se verificaron políticas por sucursal para `inventarios`, `sesiones_caja`, `movimientos_caja`, `gastos` y `anticipos`. Productos y sucursales requieren usuario activo; `usuario_sucursal` restringe al usuario o administrador.

Las funciones 044 auditadas son `SECURITY DEFINER` y validan actor, sesión, sucursal imputada o administrador según el flujo: efectivo esperado, cierre, gasto, resolución, depósito, anticipo y pedido a venta.

## 5. Catálogo e inventario móvil

Corrección aplicada: la relación `disenos` se normaliza como objeto, arreglo o `null`. `ProductImage` conserva fallback producto -> archivo -> diseño y placeholder para imagen nula. Se agregó Error Boundary al layout Vendor para evitar que una excepción de una sección derribe la navegación completa.

Validación de código: TypeScript, lint y build PASS. La prueba en dispositivo físico queda pendiente; no se simuló como realizada.

## 6. Caja

Prueba local PASS:

- apertura Q1,000;
- ingreso Q1,000;
- depósito Q1,000;
- cierre con Q200=5 y los demás billetes en 0;
- físico Q1,000, esperado Q1,000, diferencia Q0.

La fórmula única server-side es `calcular_efectivo_esperado`: apertura + ingresos - egresos. Los campos vacíos se normalizan a cero; los billetes son cantidades enteras y monedas es monto.

PROD: la sesión auditada devuelve esperado Q20,500 según su ledger existente.

## 7. Gastos

Prueba local PASS: gasto administrativo originado en Central sin caja de Central, imputado a otra sucursal, quedó pendiente y al aprobarlo creó un único egreso en la caja abierta de la sucursal imputada.

La UI Admin ahora solo muestra cajas abiertas de la sucursal imputada. Sin caja abierta, la RPC bloquea con mensaje específico y no reasigna el gasto.

## 8. Depósitos

La 044 conserva el contrato 043: depósito como egreso con `subtipo = deposito`. Reduce efectivo esperado sin afectar gasto, venta, utilidad ni comisión. Idempotencia por `operation_id` permanece activa.

## 9. Anticipos y transferencias

- Anticipo efectivo: genera ingreso físico.
- Anticipo transferencia: reduce saldo sin generar movimiento de caja.
- Pago final transferencia: no genera movimiento de caja.
- `ventas.pagos_snapshot` conserva anticipos y pago final sin duplicar caja.

## 10. Venta Q39,500

- Venta: `094fa634-4574-4015-a9da-e04d2cfb3d05`.
- Pedido: `439ab8ca-3123-47e1-8c71-5cf64054b67f`.
- Total: Q39,500.
- Efectivo acumulado: Q29,500.
- Transferencia: Q10,000.
- Saldo pendiente: Q0.
- Comisión: 1.
- Movimiento adicional por Q39,500 al finalizar: no existe.
- Duplicados detectados en las claves auditadas: ninguno.

Los ítems son diseños independientes sin `producto_id`, por lo que no generaron salida de inventario; no se modificó la operación durante la auditoría.

## 11. Hardcodes

El único UUID de sucursal en código es `FFERSSI_CENTRAL_BRANCH_ID`, permitido por la configuración oficial. No se encontraron UUIDs hardcodeados del vendedor o de la sucursal de prueba.

## 12. Validaciones

- `supabase db reset`: PASS.
- `supabase db lint --local`: PASS, sin errores de schema.
- `supabase db diff --local`: PASS, sin cambios pendientes.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS; queda advertencia de bundle >500 KB.
- `npm audit --audit-level=high`: PASS, 0 vulnerabilidades.
- `git diff --check`: PASS.

## 13. Estado de deploy

- Commit publicado en `main`: `1f870167a6e6c984a948ba1074f61d7679d8a651` (`finalize post-044 branch and cash audit`).
- Cloudflare Pages: `https://altix.pages.dev/` responde HTTP 200.
- Bundle publicado: `assets/index-wdQbt7zP.js`; contiene el Error Boundary Vendor de esta tanda.
- CSS publicado: `assets/index-DsUwx72p.css`, coincidente con el build local.
- El deploy automático de `main` quedó publicado y verificado mediante HTTP y contenido del bundle.
- Netlify: no usado.

## Pendientes reales

1. Ejecutar smoke test manual en teléfono real a 360, 390 y 430 px.
2. No ejecutar cleanup hasta completar el smoke test manual.
