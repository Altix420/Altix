# Pendientes de Vendor

- Las políticas RLS de crédito ya limitan las cuentas y pagos a las ventas del vendedor autenticado. Las demás tablas comerciales conservan el alcance pendiente indicado abajo.
- Aprobación externa de cotización; requiere identidad/portal/RPC de cliente.
- Crear contratos explícitos para anticipos y entregas Vendor si el negocio debe permitirlos.
- Crear entidades/RPC para metas, notificaciones y solicitudes de aprobación.
- Crear servicio de impresión/PDF basado en registros reales.
- Definir backend Auth administrativo para creación y mantenimiento de vendedores.

La bandeja de solicitudes, el flujo de aprobación de descuentos y el registro interno de aceptación de cotizaciones ya están implementados sobre RPC/RLS reales. La comunicación externa sigue fuera de alcance porque no existe proveedor de notificaciones.

Mientras esos contratos no existan, no se muestran botones ni rutas que simulen esas capacidades.

## ESTADO FINAL

El panel Vendor quedó implementado sobre los contratos existentes y sin acciones simuladas. Los pendientes anteriores siguen siendo brechas de backend, no tareas de interfaz pendientes. La cuenta local de validación ya existe y tiene `profiles.role = 'vendedor'` con sucursal asignada.

## VALIDACIÓN FINAL

La cuenta local `vendedor1@altix.local` ya está sembrada y fue validada contra Auth, perfil y sucursal. Permanecen como brechas reales: aprobación externa de cliente, auditoría automática de ventas, impresión/PDF y offline.

## DEMO CLIENTE

El alcance de demo está cerrado sobre datos reales: login, dashboard, consulta de catálogo/diseños/extras/inventario, clientes, POS de contado, venta idempotente, stock, caja y comisión. No se muestran controles que pretendan resolver los pendientes anteriores.

**VENDOR DEMO READY = YES**

## COMMERCIAL V1 PASS

- Vendor puede crear cotizaciones reales con cliente, producto, diseño oficial, extra y solicitud de diseño nuevo; el guardado es idempotente y no reserva inventario.
- Conversión, anticipos y entrega permanecen bajo supervisión Admin; no se muestran controles Vendor sin política aprobada.
- Pendiente genuino: aprobación externa del cliente requiere identidad/portal y RPC propios.

Los pendientes restantes son funciones posteriores al demo: aprobación externa de cliente, auditoría automática de ventas, impresión y offline. Crédito V1 ya está conectado a límite, cuentas, pagos, entrega, comisión y recordatorios.

## PENDIENTES ACTUALIZADOS

Metas de vendedor, dashboard Vendor y catálogo de diseños ya están conectados a contratos reales y no son pendientes de interfaz. Las entradas antiguas sobre entidades inexistentes quedan superadas por las migraciones `021` a `025`.

Permanecen únicamente R2 externo para imágenes, aprobación externa del cliente, offline y notificaciones externas; ninguna de estas brechas se presenta como botón operativo. La impresión/PDF V1 ya está implementada con formatos 58/80 mm y fallback del navegador.

## CIERRE OPERATIVO 2026-09-30

Vendor ya tiene caja por sucursal en POS, gasto sujeto a aprobación, anticipo desde pedidos, pago de crédito propio con RLS, cotización con cantidad entera y protección de precio, solicitud/refresco de descuentos y selector 58 mm/80 mm/PDF. Diseños y extras no aparecen en la navegación Vendor porque no son módulos operativos independientes.

Pendientes genuinos: ejecución manual controlada de transacciones desde navegador, R2 externo, aprobación externa del cliente, notificaciones y configuración Auth administrativa avanzada.
