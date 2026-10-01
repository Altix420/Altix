# ALTIX Three-Branch Validation

Fecha de ejecución local: 2026-09-29.

## Matriz ejecutada

| Área | Prueba | Resultado |
| --- | --- | --- |
| Fixture | 3 sucursales, 7 vendedores, 3 administradores y asignaciones deterministas | PASS |
| Ventas | Venta real en Central, Norte y Sur | PASS |
| Inventario | Lectura de vendedor limitada a su sucursal; consulta cruzada sin filas | PASS |
| Inventario | Entrada, venta, traslado atómico, devolución y defectuoso histórico | PASS |
| Ajustes | Solicitud no cambia stock; aprobación cambia stock y deja responsable/historial | PASS |
| Conteo | Conteo parcial por lote y finalización sin bloquear ni mutar stock | PASS |
| Caja | Una sesión independiente por sucursal; movimientos y cierre con denominaciones | PASS |
| Crédito | Dos ventas simultáneas al mismo mayorista: una acepta y una rechaza por límite | PASS |
| Cotizaciones | Aceptación obligatoria antes de conversión; pedido conserva vendedor y sucursal | PASS |
| Dashboard | Admin 1, 2 y 3 acceden a consolidado y a filtros de las tres sucursales | PASS |
| Aislamiento vendedor | Comisiones, metas y cartera de crédito filtradas por vendedor; operación comercial por sucursal | PASS |
| Concurrencia | Mismo producto/misma sucursal, distintas sucursales y `operation_id` duplicado | PASS |

## Evidencia técnica

La prueba utilizó clientes Supabase independientes con `signInWithPassword` para las 3 cuentas Admin y los 7 vendedores. Las consultas se hicieron contra RLS real, no con `service_role`.

- Mismo producto y sucursal: dos ventas concurrentes terminaron correctamente, sin stock negativo.
- Distintas sucursales: dos ventas concurrentes terminaron correctamente en sus inventarios respectivos.
- `operation_id`: dos reintentos devolvieron el mismo UUID y no duplicaron la operación.
- Crédito mayorista: el bloqueo de cliente permitió exactamente una de dos ventas de Q3,000 con límite autorizado de Q5,000.
- Traslado: la sucursal origen disminuyó 7 unidades y la destino aumentó 7 en una sola operación.
- Defectuoso: registró control histórico sin cambiar stock disponible ni kardex.
- Caja: cierre de Central calculó Q265 físico, Q265 esperado y diferencia Q0.

## Interpretación de aislamiento

Las entidades operativas de ventas, cotizaciones y pedidos son visibles por sucursal para usuarios autorizados de esa sucursal. Las entidades cuyo contrato exige propiedad del vendedor, como comisiones, metas y cartera de crédito, se validaron con RLS por `vendedor_id`. Esta distinción coincide con el contrato actual y no se reemplazó por filtros de frontend.

## Reproducción

La validación se ejecutó después de `supabase db reset` con una batería local de clientes autenticados. La base se vuelve a resetear después de las pruebas de capacidad para dejar el entorno limpio.

