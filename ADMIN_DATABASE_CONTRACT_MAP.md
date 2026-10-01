# Mapa de contrato de base de datos para Administración

Fuente auditada: `src/shared/types/database.types.ts` y `supabase/migrations/*.sql`. La UI debe tratar los campos UUID como referencias seleccionables, no como texto libre.

## Reglas globales

- Lectura administrativa: las tablas con políticas `SELECT` autenticadas son `profiles`, `sucursales`, `clientes`, `categorias`, `productos`, `cotizaciones`, `pedidos`, `ventas`, `inventarios` y `sesiones_caja`. Otras tablas tienen contratos de lectura en el esquema, pero sus políticas no fueron añadidas en `009_rls.sql`; deben validarse antes de exponer datos sensibles.
- Mutaciones transaccionales: usar las RPC existentes y sus argumentos tipados. No actualizar stock, saldos, caja, crédito ni estados sensibles directamente desde la UI.
- Identidad: `profiles.id` referencia `auth.users(id)`. Crear vendedores requiere un backend administrativo de Auth que no existe en este repositorio.
- Auditoría y comisiones: son de solo lectura desde Administración; las comisiones se generan mediante `generar_comision` al registrar ventas.

## Contratos por módulo

| Módulo | Tabla/vista y campos relevantes | FKs / requeridos | Insertar | Actualizar | RPCs y acciones posibles | Acciones imposibles o pendientes |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard | No tiene tabla propia. Agrega `ventas.total`, `cuentas_cobrar.saldo_pendiente`, `inventarios.stock` y conteos reales. | Relaciones de cada fuente | No aplica | No aplica | Consulta/filtrado | Utilidad, KPIs agregados persistentes y aprobaciones requieren vistas/contratos ausentes |
| Ventas | `ventas`: `id`, `pedido_id`, `sucursal_id`, `cliente_id`, `vendedor_id`, `total`, `created_at`, `operation_id`; `venta_items` para detalle. | Sucursal, cliente, vendedor, pedido opcional; totales e items requeridos por RPC | RPC | No | `registrar_venta`; consultar, filtrar y ver detalle | Editar/eliminar venta y devolución solo si se implementa formulario con `registrar_devolucion` |
| Cotizaciones | `cotizaciones`: sucursal, cliente, vendedor, total, estado, valida_hasta, observaciones; `cotizacion_items`. | FKs a sucursales/clientes/profiles/productos | Tabla permitida por RLS, pero formulario completo de items pendiente | Tabla permitida por RLS | `convertir_cotizacion_pedido`; consultar y convertir estado `enviada` | Eliminar, enviar/cancelar y constructor completo sin contrato específico |
| Pedidos | `pedidos`: cotizacion, sucursal, cliente, vendedor, total, saldo_pendiente, estado, observaciones; `pedido_items`; `anticipos`. | FKs a cotización, sucursal, cliente, vendedor, producto y diseño opcional | Tabla permitida por RLS, pero items y reglas requieren formulario completo | Tabla permitida por RLS | `registrar_anticipo`, `marcar_entrega`; consultar, anticipo, marcar entrega | Crear pedido completo, editar estado arbitrario, cancelar/eliminar |
| Caja | `sesiones_caja`: sucursal, usuario, montos, fechas, estado; `movimientos_caja`; `gastos`. | Sucursal, usuario, sesión | RPC | RPC | `abrir_caja`, `cerrar_caja`, `registrar_gasto`; consulta de sesiones | Editar sesión o insertar movimientos manuales |
| Clientes | `clientes`: nombre requerido; nit_dpi, teléfono, dirección, mayorista, activo. | Sin FK | Insert permitido por RLS | No hay política UPDATE | Crear cliente con insert validado; consulta | Editar, eliminar, activar/desactivar y cartera sin RPC/política específica |
| Mayoristas | Misma tabla `clientes`, filtrando `es_mayorista = true`. | Igual que clientes | Igual que clientes | No | Consulta y navegación a crédito | Reasignación/edición de perfil mayorista sin contrato específico |
| Crédito | `cuentas_cobrar`, `pagos_credito`, `recordatorios`, `saldos_favor`, `movimientos_saldo_favor`. | Cliente, venta, perfil, cuenta | RPC | RPC | `registrar_pago`, `aplicar_saldo_favor`; consultar saldos | Editar cuenta, cambiar límite de crédito o eliminar pagos |
| Productos | `productos`: `sku`, `nombre` requeridos; categoría opcional, descripción, precios, activo. `categorias`: nombre requerido. | `productos.categoria_id -> categorias.id` | No hay política RLS de insert | No hay política RLS de update | Consulta; select de categorías | Crear/editar/activar productos desde UI hasta definir política/backend seguro |
| Inventario | `inventarios`: sucursal, producto, stock, mínimos; `movimientos_inventario` kardex. | Sucursal y producto | RPC | RPC | `registrar_entrada_inventario`; consultar stock/kardex | Edición directa de stock y ajuste libre |
| Traslados | `traslados`: origen, destino, estado, solicitante, receptor; `traslado_items`. | Sucursales, perfiles y productos | RPC | No | `trasladar_inventario`; consultar | Flujo multi-item, cancelar o recibir separado no está cubierto por RPC actual |
| Conteo físico | `conteos`: sucursal, estado, realizado_por; `conteos_detalle`: producto, stock_sistema, stock_fisico, diferencia generada. | Sucursal, perfil y producto | RPC | RPC | `guardar_conteo_batch` para conteo existente | Crear conteo inicial, editar lote o cancelar no tiene RPC dedicado |
| Diseños | `disenos`: `cliente_id`, `nombre` requerido, `archivo_url`, `observaciones`. | Cliente opcional; no tiene SKU/categoría/descripcion | Tabla sin RLS específica | Tabla sin RLS específica | CRUD limitado a campos reales, consulta y selector de cliente | El formulario solicitado con SKU/categoría no corresponde al esquema; asociación formal a `archivos` no existe |
| Extras | `extras`: `nombre` requerido, `precio_adicional`, `activo`. | Sin FK | Tabla sin RLS específica | Tabla sin RLS específica | CRUD limitado a campos reales, activar/desactivar | Campos de descripción, SKU o categoría no existen |
| Lanzamientos | No existe tabla `lanzamientos`. `archivos` solo contiene path, nombre, mime, tamaño, bucket y creador. | No hay relación con diseños/extras | `registrar_archivo` registra metadatos | No | Subida de archivo genérica si se requiere | Nuevo lanzamiento, edición, relaciones de campaña y ver no están soportados |
| Vendedores | `profiles`: id de Auth, nombre, role, activo; `usuario_sucursal`: user/sucursal. | `profiles.id -> auth.users.id` | No | No política de perfil | Consultar y `reasignar_cartera` para cartera abierta | Crear auth user, cambiar roles, activar/desactivar y asignar sucursal sin backend Auth/políticas |
| Sucursales | `sucursales`: nombre requerido, dirección, teléfono, activa. | Sin FK | No | No | Consulta | Crear/editar/activar desde UI sin política específica |
| Comisiones | `comisiones`: vendedor, venta, montos, porcentaje, estado, periodo; `ajustes_comision`; reglas. | Perfiles y ventas | Generada por RPC | No | Consulta de resultados | Cálculo, edición, pago o ajuste manual desde UI |
| Aprobaciones | No existe tabla de solicitudes/aprobaciones. | No aplica | No | No | Ninguna; mostrar brecha | Aprobar/rechazar no debe simularse usando auditoría |
| Reportes | No hay vistas; fuentes transaccionales reales. | Relaciones de las fuentes | No aplica | No aplica | Consultas y filtros; exportación aún no implementada | KPIs persistentes, exportación y reportes agregados formales |
| Auditoría | `bitacora_auditoria`: usuario, acción, tabla, registro, JSON anterior/nuevo, fecha. | Usuario opcional | Solo funciones SECURITY DEFINER escriben eventos | No | Lectura | Editar, borrar o “aprobar” eventos |
| Configuración | No existe tabla de configuración empresarial. | No aplica | No | No | Ninguna; mostrar brecha | Parámetros, roles, permisos y configuración de negocio |

## RPC auditadas

`abrir_caja`, `cerrar_caja`, `registrar_gasto`, `convertir_cotizacion_pedido`, `registrar_anticipo`, `generar_comision`, `registrar_venta`, `registrar_pago`, `aplicar_saldo_favor`, `registrar_entrada_inventario`, `trasladar_inventario`, `registrar_devolucion`, `guardar_conteo_batch`, `marcar_entrega`, `reasignar_cartera`, `registrar_archivo` y `revisar_vencimientos_credito`.

## Nota de seguridad

Que una tabla aparezca con `Insert`/`Update` en los tipos generados no significa que la operación esté autorizada por RLS. La interfaz solo debe habilitarla cuando exista una política o una RPC `SECURITY DEFINER` que valide el flujo.
