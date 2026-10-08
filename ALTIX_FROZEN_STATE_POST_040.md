# ALTIX Frozen State Post-040

## Git

- Código funcional congelado en `main@398127b`.
- Commit documental local: se crea únicamente para conservar este registro.
- Rama: `main`.
- Tag: `pre-operation-post-040`.
- Fecha del backup: `2026-10-08T02:41:35Z`.

## Supabase

- Proyecto PROD: `tkhwzpocbyonurxwvmcv` (`Textiles`).
- Migración máxima local y remota verificada: `20261007010000` (040).
- Local y remoto alineados hasta 040.
- No se ejecutó `db push` durante este congelamiento.

## Producción

- Netlify Production: `https://altixv1.netlify.app/`.
- Producción publicada desde `main@398127b`.
- No se realizó deploy adicional durante este congelamiento.

## Validaciones

- `supabase db reset`: PASS.
- `supabase db lint --local`: PASS.
- `supabase db diff --local`: PASS, sin cambios pendientes.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm audit --audit-level=high`: PASS, 0 vulnerabilidades.
- `git diff --check`: PASS.
- `supabase migration list`: Local y remoto alineados hasta 040.

## Backup

- Archivo cifrado: `altix-prod-post-040-20261008T024135Z.tar.gz.enc`.
- Ubicación: `/Users/chriis/Library/Application Support/ALTIX/backups/`.
- Tamaño: `121520` bytes.
- SHA-256: `1972ec1b21ac68498187cf1bedfe9b7d6db523e10e0661de168872087803a457`.
- Contenido: roles, esquema, datos e historial de `supabase_migrations`.
- Validación: archivo no vacío; descifrado y listado del tarball confirmados localmente.
- No se realizó restore sobre PROD.

## Estado funcional

Este snapshot conserva:

- Vara y unidad con múltiplos de 0.25 para vara.
- Mayoristas filtrados desde `clientes.es_mayorista`.
- Contado/crédito derivado de la situación financiera real.
- Exportaciones XLSX solo de descarga.
- Inventario exportado sin precio ni costo.
- Gastos con sucursal imputada separada del origen administrativo.
- Comisiones mensuales con ajustes trazables.
- Cierre de caja con denominaciones, esperado, físico y diferencia.
- Gastos rechazados sin afectar caja cuando no hubo desembolso.
- Historial y diferencias de conteos físicos.

## Estado operativo

Este snapshot fue creado antes de la limpieza final de datos de prueba y antes de la carga de datos reales del primer negocio.

No se limpiaron datos, no se modificaron reglas de negocio, no se crearon migraciones nuevas y no se hicieron cambios funcionales.
