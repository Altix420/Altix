# Altix: paquete de integración

Este paquete convierte la construcción descrita en una base de integración para una aplicación TypeScript + Supabase. Está preparado para conectarse a las migraciones y tipos generados del proyecto Altix; no sustituye esos artefactos.

## Incluye

- Un único cliente Supabase en `src/shared/supabase.ts`.
- Sesión, login, logout y recuperación en `src/auth/auth.service.ts`.
- Registro de venta mediante la RPC `registrar_venta`, con `operation_id` para doble clic y reintentos.
- Política explícita para impedir ventas, pagos e inventario definitivos cuando no hay conexión.
- Cliente para solicitar URLs firmadas de R2 y registrar metadata después de una carga exitosa.
- Edge Function `r2-presigned-url` como frontera de credenciales privadas.
- Matriz de integración y pendientes en `INTEGRACION.md`.

## Arranque

1. Copiar `.env.example` a `.env.local`.
2. Colocar el archivo generado por Supabase en `src/shared/types/database.types.ts`.
3. Revisar los nombres de columnas y parámetros de las RPC contra las migraciones reales.
4. Instalar dependencias y ejecutar el chequeo de tipos:

```bash
npm install
npm run typecheck
```

Las operaciones definitivas deben ejecutarse contra RPC protegidas por RLS. El cliente nunca recibe credenciales de R2.
