# ALTIX Production Cutover Checklist

Estado: **NO AUTORIZADO PARA CIERRE**

## Antes del corte

- [ ] Backup Postgres y prueba de restore.
- [ ] Snapshot/manifiesto R2.
- [ ] `supabase db diff --local` limpio.
- [ ] Migraciones probadas en proyecto de aceptación.
- [ ] Supabase PROD enlazado y secretos Edge configurados.
- [ ] Bucket R2 PROD y CORS validados.
- [ ] Netlify PROD, HTTPS, redirects SPA y variables configurados.
- [ ] Usuarios reales creados y usuarios de prueba separados.
- [ ] Catálogo, diseños, extras, inventario y caja inicial cargados.

## Smoke test de aceptación

- [ ] Login Admin y Vendor.
- [ ] Aislamiento de sucursal y rol.
- [ ] Venta controlada.
- [ ] Caja y cierre.
- [ ] Inventario y kardex.
- [ ] Cotización, aprobación y pedido.
- [ ] Anticipo/pago y entrega.
- [ ] Crédito y pago parcial/total.
- [ ] Comisión y reporte.
- [ ] Devolución y trazabilidad.
- [ ] Imagen R2 y reload.
- [ ] Logout/login y persistencia histórica.

## Después del corte

- [ ] Eliminar únicamente datos de prueba identificados.
- [ ] Verificar que no se eliminó historial real.
- [ ] Registrar versión, migración, checksum y hora de salida.
- [ ] Obtener firma del responsable del cliente.

## Estado actual

Código local: PASS técnico.  
Producción: pendiente de infraestructura, restore y smoke test completo.
