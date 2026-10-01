# Integración de Altix

## Diagnóstico

El documento funcional establece correctamente que Supabase es la fuente de verdad, que el frontend no debe recalcular reglas de crédito, inventario o comisiones, y que el flujo comercial es `cotización -> pedido -> venta`. Sin embargo, en el workspace revisado no están disponibles las 13 migraciones, `database.types.ts`, el proyecto frontend ni la Edge Function de R2. Por eso esta entrega integra los contratos esperados, pero no inventa una conexión falsa a una base que no está disponible.

## Arquitectura integrada

```text
UI por módulo
  -> servicios de dominio
    -> cliente Supabase único
      -> RLS + RPC transaccionales + auditoría
        -> PostgreSQL / inventario / caja / crédito / comisión

UI de diseños
  -> Edge Function r2-presigned-url
    -> URL temporal PUT/GET
      -> Cloudflare R2
  -> tabla archivos: solo metadata
```

## Contratos asumidos

| Área | Contrato usado por esta entrega | Fuente de autoridad |
|---|---|---|
| Sesión | `supabase.auth` | Supabase Auth |
| Venta | RPC `registrar_venta` con `operation_id` | PostgreSQL |
| Crédito, stock, caja y comisión | RPC/RLS del backend | PostgreSQL |
| Archivos | Edge Function `r2-presigned-url` | Supabase Edge + R2 |
| Offline | Solo borradores, conteos y cache | IndexedDB del cliente |

## Flujo mínimo integrado

1. El usuario inicia sesión y se valida su perfil/rol mediante RLS.
2. La UI conserva el orden `cotización -> pedido -> venta`.
3. El servicio de venta genera un `operation_id` estable para el intento.
4. La RPC valida stock, crédito, caja, pagos y registra auditoría dentro de una transacción.
5. Un reintento con el mismo `operation_id` devuelve el resultado idempotente en lugar de duplicar la venta.
6. Las imágenes se comprimen en el cliente, se suben a R2 con una URL firmada y después se registra su metadata.

## Pendientes para declarar producción

- Incorporar las migraciones 001-013 y regenerar `database.types.ts`.
- Confirmar firmas reales de `registrar_venta` y de la RPC de metadata de archivos.
- Verificar políticas RLS con un usuario admin y uno vendedor.
- Configurar secretos R2 solo en Supabase Edge Functions.
- Ejecutar pruebas de concurrencia, doble clic, sesión expirada, pérdida de red, devolución, cierre de caja y R2 caído.
- Ejecutar el flujo de aceptación con `supabase db reset` y datos ficticios.

## Criterio de aceptación

El producto puede considerarse integrado cuando el flujo `login -> mayorista -> cotización -> pedido -> anticipo -> venta -> pago -> entrega -> inventario -> caja -> comisión -> devolución -> reporte` completa sus transacciones usando la base local y vuelve a ejecutarse desde cero con `supabase db reset`.
