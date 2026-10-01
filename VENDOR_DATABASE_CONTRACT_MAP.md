# Mapa de contrato de base de datos para Vendor

Auditoría basada en `src/shared/types/database.types.ts`, las migraciones y servicios existentes. El rol `vendedor` se reconoce en `profiles.role`, pero el RLS actual usa principalmente `auth.role() = 'authenticated'`; por ello la separación Vendor/Admin se aplica en rutas y UI, mientras el backend requiere políticas por rol adicionales para aislamiento fuerte.

| Capacidad | Tabla/campos reales | RLS / RPC | Estado Vendor | Acción segura |
| --- | --- | --- | --- | --- |
| Inicio | Conteos/consultas de `ventas`, `cotizaciones`, `pedidos`, `clientes` | Lectura autenticada | READ ONLY | Ver indicadores derivados de datos reales |
| Nueva venta / POS | `ventas`, `venta_items`; producto, cliente, sucursal, vendedor, total | `registrar_venta`; valida vendedor asignado a sucursal, caja y stock | SUPPORTED | Registrar venta con `registrarVentaService` y `operation_id` |
| Mis ventas | `ventas` y `venta_items` | SELECT autenticado; filtro por `vendedor_id` en UI | READ ONLY | Consultar ventas y ver detalle de venta |
| Cotizaciones | `cotizaciones`, `cotizacion_items` | RLS permite `FOR ALL` a autenticados, pero no existe servicio Vendor de líneas | READ ONLY | Consultar; no crear formulario incompleto |
| Pedidos | `pedidos`, `pedido_items`, `anticipos` | RPC de anticipo/entrega sin restricción explícita de rol | READ ONLY | Consultar pedidos propios; anticipos/entrega quedan ocultos por falta de contrato Vendor explícito |
| Clientes | `clientes`: nombre, nit_dpi, teléfono, dirección, es_mayorista, activo | INSERT autenticado; no UPDATE | SUPPORTED | Crear cliente; consultar |
| Mayoristas | `clientes` filtrados por `es_mayorista` | SELECT autenticado | READ ONLY | Consultar; no modificar crédito/asignación |
| Catálogo | `productos`, `categorias`, precios de venta | SELECT autenticado | READ ONLY | Ver producto, SKU, descripción, precios de venta y precargarlo en POS sin transacción |
| Diseños | `disenos`: cliente_id, nombre, archivo_url, observaciones | Sin política específica de RLS; Vendor no debe administrar | READ ONLY | Consultar diseño asociado |
| Extras | `extras`: nombre, precio_adicional, activo | Sin política específica; Vendor no debe administrar | READ ONLY | Consultar extras activos |
| Inventario | `inventarios`: sucursal_id, producto_id, stock | SELECT autenticado; mutación solo por RPC | READ ONLY | Consultar disponibilidad |
| Crédito | `cuentas_cobrar`, `saldos_favor` | Sin política Vendor específica; RPC de pago existe | READ ONLY | Consultar cartera/saldos; no modificar condiciones |
| Comisiones | `comisiones`: vendedor_id, venta_id, montos, porcentaje, periodo | Sin política Vendor específica | READ ONLY | Mostrar historial y detalle del registro; no calcular ni editar |
| Meta | No existe tabla/campo/RPC | No aplica | BACKEND CONTRACT MISSING | Omitir ruta y botón |
| Notificaciones | No existe tabla usable | No aplica | BACKEND CONTRACT MISSING | Omitir ruta y botón |
| Aprobaciones | No existe entidad/RPC | No aplica | BACKEND CONTRACT MISSING | Omitir solicitudes y controles |
| Impresión | Hay registros base, pero no servicio de impresión/PDF | No aplica | BACKEND CONTRACT MISSING | Omitir botón |

## RLS y límites

- `profiles`, `sucursales`, `clientes`, `categorias`, `productos`, `cotizaciones`, `pedidos`, `ventas`, `inventarios` y `sesiones_caja` tienen lectura autenticada.
- `clientes` solo tiene inserción autenticada; no existe actualización para Vendor.
- `registrar_venta` es el único flujo transaccional Vendor habilitado en esta UI. No se manipula stock, caja ni comisión desde React.
- El aislamiento por vendedor para lecturas no está garantizado por las políticas actuales. La UI filtra por `vendedor_id`, pero esto no sustituye una política RLS por usuario.
- Crear Auth users, editar productos, modificar crédito, inventario, diseños, extras, sucursales, perfiles o comisiones es Admin-only o no soportado.
