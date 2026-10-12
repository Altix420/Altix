# ALTIX - Cierre final estricto en producción

Fecha: 2026-10-12
Proyecto Supabase PROD: `tkhwzpocbyonurxwvmcv`
Commit funcional publicado: `f03af60`
HEAD final de `main`: `9396cfe`

## Corrección visual real

**Causa raíz:** las clases Tailwind con variables como `bg-[--altix-surface]`,
`rounded-[--altix-radius-lg]` y `shadow-[--altix-shadow-lg]` no generaban los
estilos CSS esperados en producción. El modal quedaba transparente, con radio
0 y sin sombra; el contenido de la tabla se percibía a través de él.

**Corrección:** `Modal`, `TableWrapper`, `Thead`, `Tbody`, `Tr` y `Td` ahora
aplican las variables CSS mediante estilos explícitos. No se cambiaron datos,
handlers, queries, RPC, cálculos ni contratos.

**Evidencia Admin PROD:** modal `Abrir caja` verificado en sesión real.

- superficie: `rgb(255, 255, 255)` opaca;
- borde: `rgb(226, 229, 234)`;
- radio: `18px`;
- sombra visible;
- backdrop: `rgba(15, 23, 42, 0.35)`;
- tabla: superficie opaca, borde tenue y radio `14px`;
- errores de consola: ninguno observado.

## Limpieza PROD

Se clasificaron y eliminaron únicamente datos sintéticos confirmados, dentro
de una transacción. No se usó `TRUNCATE CASCADE`.

| Tabla | Antes | Después |
|---|---:|---:|
| clientes | 4 | 0 |
| sesiones_caja | 2 | 0 |
| movimientos_caja | 0 | 0 |
| ventas | 0 | 0 |
| pedidos | 0 | 0 |
| cotizaciones | 0 | 0 |
| gastos | 0 | 0 |
| comisiones | 0 | 0 |
| inventarios | 0 | 0 |
| movimientos_inventario | 0 | 0 |
| profiles | 9 | 9 |
| sucursales | 4 | 4 |
| usuario_sucursal | 7 | 7 |
| bitacora_auditoria | 604 | 610 |

Se preservaron Auth, perfiles, roles, sucursales, asignaciones, migraciones,
RLS, RPC, funciones, R2 metadata y auditoría técnica.

## Validación

- Admin PROD: **PASS**
- Vendor PROD: **INCONCLUSIVE**, sin sesión Vendor autenticada disponible.
- POS PROD: **INCONCLUSIVE**, requiere sesión Vendor.
- Caja PROD: **PASS visual/read-only**; modal y estado vacío comprobados.
- Responsive PROD: **INCONCLUSIVE**; desktop verificado, viewport móvil real pendiente.
- Cloudflare: **PASS**, producción funcional publicada en `f03af60`; el HEAD documental final queda en `9396cfe`.
- Manifest `/manifest.json`: **PASS**.
- Service worker `altix-shell-v3`: **PASS**.
- TypeScript: **PASS**.
- Lint: **PASS**.
- Build: **PASS**.
- `npm audit`: **PASS**, 0 vulnerabilidades.
- `git diff --check`: **PASS**.

## Netlify legacy

`https://altixv1.netlify.app` continúa respondiendo HTTP 200 desde Netlify.
No se eliminó porque no existe sesión administrativa/CLI autenticada de
Netlify en este entorno.

La CLI `netlify` no está instalada; la configuración local encontrada sólo
contiene telemetría y no contiene una sesión administrativa reutilizable.

No existe una sesión Vendor autenticada activa en el navegador durante este
cierre. No se crearon usuarios, no se recuperaron contraseñas y no se
intentó un login sin credenciales explícitas.

**Acción manual única pendiente:** entrar al sitio legacy en Netlify,
desconectar la integración GitHub/auto-deploy y eliminar o despublicar el
sitio `altixv1`.

## Resultado

- ALTIX PROD CLEAN: **YES** para los datos TEST identificados.
- ALTIX READY FOR REAL DATA: **NO**, hasta validar Vendor/POS en sesión real,
  completar viewport móvil y retirar Netlify legacy.

## Último cierre operativo

- Netlify: **MANUAL ACTION REQUIRED**.
- Vendor PROD: **INCONCLUSIVE**.
- POS PROD: **INCONCLUSIVE**.
- Apertura de caja Vendor: **INCONCLUSIVE**.
- Mobile físico: **PENDIENTE**.
