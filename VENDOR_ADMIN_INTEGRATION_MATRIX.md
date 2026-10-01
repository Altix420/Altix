# Matriz de integración Vendor -> Admin

| Acción Vendor | Página Vendor | Servicio | RPC/tabla | Efecto backend | Página Admin | Resultado visible Admin | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Iniciar sesión | Login | Supabase Auth | `auth.users`, `profiles`, `usuario_sucursal` | Sesión, rol y sucursal activa | — | Redirección según rol | CONNECTED |
| Registrar venta | Nueva venta | `vendorService.registrarVenta` | `registrar_venta` | Venta, detalle, stock, caja y comisión | Ventas | Venta visible | CONNECTED |
| Reintentar venta | Nueva venta | `createOperationId` + RPC | `ventas.operation_id` | Devuelve la misma venta sin duplicar efectos | Ventas | Un solo registro | CONNECTED |
| Crear cliente | Clientes | `vendorService.crearCliente` | `clientes` INSERT | Cliente persistido | Clientes | Cliente visible | CONNECTED |
| Consultar ventas | Mis ventas | Supabase SELECT | `ventas` | Lectura filtrada por `vendedor_id` en UI | Ventas, Dashboard, Reportes | Datos compartidos | READ ONLY |
| Consultar cotizaciones | Cotizaciones | Supabase SELECT | `cotizaciones` | Lectura filtrada por `vendedor_id` en UI | Cotizaciones | Registro visible si existe | READ ONLY |
| Consultar pedidos | Pedidos | Supabase SELECT | `pedidos` | Lectura filtrada por `vendedor_id` en UI | Pedidos | Registro visible si existe | READ ONLY |
| Consultar catálogo | Catálogo | Supabase SELECT | `productos` | Productos activos | Catálogo | Mismos productos | READ ONLY |
| Consultar diseños | Diseños | Supabase SELECT | `disenos` | Diseños visibles | Diseños | Mismo registro | READ ONLY |
| Consultar extras | Extras | Supabase SELECT | `extras` | Extras activos | Extras | Mismos registros | READ ONLY |
| Consultar inventario | Inventario | Supabase SELECT | `inventarios` | Stock visible; no UPDATE efectivo por RLS | Inventario | Stock actualizado tras venta | READ ONLY |
| Consultar crédito | Crédito | Supabase SELECT | `cuentas_cobrar` | Lectura de cuentas visibles | Créditos | Datos compartidos | PARTIAL |
| Consultar comisión | Comisión | Supabase SELECT | `comisiones` | Comisión generada por PostgreSQL | Comisiones | Misma comisión | CONNECTED |
| Abrir caja para prueba | POS/backend | RPC existente | `abrir_caja` | Sesión abierta | Caja | Sesión visible | NOT APPLICABLE |
| Solicitar aprobación | — | — | No existe tabla/RPC | No hay persistencia | Centro de aprobación | No aplica | MISSING |
| Anticipo/entrega | — | — | RPC existente solo para Admin actual | No hay acción Vendor | Pedidos | Vendor no expone control | MISSING |
| Impresión/PDF | — | — | No existe servicio | No hay archivo generado | — | No aplica | MISSING |

## Evidencia de prueba local

- Login real exitoso y redirección a `/vendedor/inicio`.
- Venta real de Q45.00: `ventas=1`, `venta_items=1`, `movimientos_inventario=1`, `movimientos_caja=1`, `comisiones=1`.
- Stock del Banner 13oz m²: `1000.00 -> 999.00`.
- Repetición del mismo `operation_id`: devolvió la misma venta y no creó un segundo registro.
- Cliente creado por Vendor fue visible inmediatamente por Admin en `clientes`.
- Intentos directos de UPDATE a producto e inventario no cambiaron datos por RLS.
- `bitacora_auditoria=0` después de la venta: la RPC actual no registra auditoría de ventas.

El POS de la versión demo expone únicamente **efectivo**, porque `registrar_venta` persiste los efectos de caja para ese flujo; la opción de crédito permanece oculta hasta que exista un contrato completo para `cuentas_cobrar`.

Las acciones `Ver detalle` de ventas y comisiones son consultas directas a `venta_items`/`productos` y `comisiones`, respectivamente. `Agregar a venta` desde Catálogo solo transporta el producto al POS; no crea ningún registro hasta `registrar_venta`.
