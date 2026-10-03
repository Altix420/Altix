# ALTIX Backup and Restore Test

Estado: **BLOQUEADO PREVIO A EJECUCIÓN**

## Requisito

Un backup no es evidencia suficiente hasta que pueda restaurarse en un proyecto o base aislada.

## Procedimiento aprobado

1. Crear dump de la base PROD mediante la herramienta oficial del proyecto.
2. Guardar el dump cifrado fuera del repositorio y registrar checksum, fecha y versión de migración.
3. Exportar manifiesto de objetos R2 con path, bucket, MIME, tamaño y `archivo_id`; nunca guardar secretos.
4. Restaurar el dump en un proyecto aislado, aplicar únicamente las migraciones esperadas y validar conteos.
5. Comprobar login Admin/Vendor, lectura de ventas, inventario, caja, crédito, cotizaciones, archivos y auditoría.
6. Comparar conteos, sumas financieras y referencias de archivos contra el origen.
7. Registrar tiempo de recuperación, resultado, incidencias y checksum final.

## No ejecutar

- No usar `supabase db reset` contra producción.
- No incluir service role, claves R2 ni tokens en Git.
- No sobrescribir el proyecto productivo durante una prueba.

## Resultado actual

La reconstrucción local con `supabase db reset` es PASS, pero no sustituye este restore test. El procedimiento reproducible quedó documentado en `PRODUCTION_BACKUP_RUNBOOK.md`.

En la revisión del 2026-10-03 se verificó que `openssl` y `shasum` están disponibles, mientras `age` no está instalado. No se generó backup PROD porque aún faltan la conexión segura de base, la passphrase definida por el responsable y un proyecto Supabase temporal vacío para restore. PROD no fue modificado.
