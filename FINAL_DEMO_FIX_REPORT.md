# ALTIX - Correccion funcional final de demo

## Alcance cerrado

- Metas: selector de sucursales conectado a `sucursales.activa` y con recarga/error explícitos.
- Diseños: precio base, costo del SKU vinculado y precio final calculado con extras visibles; los extras de diseño permanecen normalizados en `diseno_extras`.
- Cotizaciones: múltiples extras por línea, snapshot económico, descuento como monto total de línea y persistencia antes de solicitar autorización.
- Aprobaciones: una aprobación de descuento por cotización, ligada al folio real; el centro Admin muestra el desglose por línea.
- Conversión/impresión: una cotización con descuento pendiente o rechazado no se convierte ni se imprime; la aprobación permite liberar el flujo.
- Caja: movimientos separados por sucursal con filtro y totales de ingreso, egreso y neto recalculados.
- Traslados: origen, destino y stock visible en el formulario; el historial usa nombres de sucursal y conserva el RPC atómico.
- R2: se mantienen la protección y los mensajes existentes; la carga real sigue dependiendo de secretos del runtime externo.

## Validación local

- `supabase db reset`: PASS.
- Prueba autenticada: cotización con dos extras, snapshot persistido, una aprobación pendiente y conversión bloqueada hasta aprobación: PASS.
- Consultas anidadas de movimientos de caja, traslados y extras: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS; queda solo el aviso informativo de bundle mayor a 500 kB.

## Gaps genuinos

- R2 productivo requiere configurar credenciales del bucket en el runtime Edge.
- La aceptación externa del cliente continúa fuera del contrato actual; la aceptación Admin/Vendor existente no se presenta como portal externo.
