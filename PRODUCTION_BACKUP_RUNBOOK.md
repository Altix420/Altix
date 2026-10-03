# ALTIX - Runbook De Backup y Restore PROD

## Alcance

Este procedimiento respalda el proyecto Supabase PROD de ALTIX antes de aplicar la migración 036. No modifica PROD y no incluye objetos de Cloudflare R2.

Origen actual: proyecto `tkhwzpocbyonurxwvmcv` (`Textiles`).

Requisitos previos:

- contraseña de base PROD introducida de forma interactiva o mediante variable temporal;
- proyecto Supabase temporal vacío para restore;
- connection string del proyecto temporal;
- permiso para almacenar el archivo cifrado fuera del repositorio.

## Herramientas verificadas

- Supabase CLI `2.118.0`.
- `openssl` disponible.
- `shasum` disponible.
- `age` no está instalado; el procedimiento usa OpenSSL AES-256.

## 1. Crear ubicación fuera del repositorio

```bash
BACKUP_ROOT="$HOME/Library/Application Support/ALTIX/backups"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$BACKUP_ROOT/altix-prod-$STAMP"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
```

Definir `PROD_DB_URL` en la sesión actual sin imprimirlo. La contraseña no debe quedar escrita en Git, Markdown ni archivos plaintext.

## 2. Crear dump oficial

Ejecutar los siguientes comandos con `supabase db dump`. Si la versión instalada exige una sintaxis distinta, detenerse y adaptar únicamente la sintaxis indicada por `supabase db dump --help`.

```bash
supabase db dump --db-url "$PROD_DB_URL" --file "$BACKUP_DIR/roles.sql" --role-only
supabase db dump --db-url "$PROD_DB_URL" --file "$BACKUP_DIR/schema.sql"
supabase db dump --db-url "$PROD_DB_URL" --file "$BACKUP_DIR/data.sql" --use-copy --data-only \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"
supabase db dump --db-url "$PROD_DB_URL" --file "$BACKUP_DIR/history_schema.sql" --schema supabase_migrations
supabase db dump --db-url "$PROD_DB_URL" --file "$BACKUP_DIR/history_data.sql" --use-copy --data-only --schema supabase_migrations
```

No ejecutar `supabase db reset`, `supabase db push` ni comandos destructivos contra PROD durante el backup.

## 3. Manifiesto y hash

```bash
for file in roles.sql schema.sql data.sql history_schema.sql history_data.sql; do
  test -s "$BACKUP_DIR/$file" || { echo "Falta o está vacío: $file"; exit 1; }
done

{
  printf 'timestamp_utc=%s\n' "$STAMP"
  printf 'project_ref=tkhwzpocbyonurxwvmcv\n'
  printf 'migration_max=035\n'
  printf 'supabase_cli=%s\n' "$(supabase --version | head -1)"
  printf '\nfiles\n'
  shasum -a 256 "$BACKUP_DIR"/*.sql
  printf '\nsizes\n'
  ls -lh "$BACKUP_DIR"/*.sql
} > "$BACKUP_DIR/MANIFEST.txt"
```

## 4. Cifrar el backup

Crear el tarball y solicitar la passphrase sin incluirla en el comando ni guardarla en disco:

```bash
tar -C "$(dirname "$BACKUP_DIR")" -czf "$BACKUP_DIR.tar.gz" "$(basename "$BACKUP_DIR")"
read -r -s -p 'Passphrase AES-256 para backup ALTIX: ' BACKUP_PASSPHRASE; printf '\n'
printf '%s' "$BACKUP_PASSPHRASE" | openssl enc -aes-256-cbc -pbkdf2 -salt \
  -in "$BACKUP_DIR.tar.gz" -out "$BACKUP_DIR.tar.gz.enc" -pass stdin
unset BACKUP_PASSPHRASE
test -s "$BACKUP_DIR.tar.gz.enc"
shasum -a 256 "$BACKUP_DIR.tar.gz.enc"
```

La passphrase debe conservarse en el gestor seguro acordado. No se registra en `MANIFEST.txt`, historial de shell ni repositorio.

## 5. Restore en proyecto temporal

El destino debe ser un proyecto Supabase temporal vacío, nunca PROD. Introducir `RESTORE_DB_URL` de forma segura y ejecutar:

```bash
read -r -s -p 'Passphrase del backup ALTIX: ' BACKUP_PASSPHRASE; printf '\n'
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in "$BACKUP_DIR.tar.gz.enc" -out "$BACKUP_DIR.tar.gz" -pass stdin <<< "$BACKUP_PASSPHRASE"
unset BACKUP_PASSPHRASE
tar -xzf "$BACKUP_DIR.tar.gz" -C "$(dirname "$BACKUP_DIR")"

psql "$RESTORE_DB_URL" --single-transaction --variable ON_ERROR_STOP=1 \
  --file "$BACKUP_DIR/roles.sql" \
  --file "$BACKUP_DIR/schema.sql" \
  --file "$BACKUP_DIR/data.sql"
```

Si el destino administrado rechaza roles, schemas gestionados o `session_replication_role`, detenerse y registrar el error; no forzar una restauración parcial. Auth y Storage gestionados requieren validación separada. R2 no se restaura con estos archivos.

## 6. Evidencia mínima

Comparar PROD y restore para las tablas existentes: `profiles`, `sucursales`, `usuario_sucursal`, `clientes`, `productos`, `disenos`, `extras`, `inventarios`, `movimientos_inventario`, `cotizaciones`, `pedidos`, `ventas`, `venta_items`, `cuentas_cobrar`, `pagos`, `sesiones_caja`, `movimientos_caja`, `comisiones` y `aprobaciones`.

Verificar también relaciones producto-diseño, producto-inventario, venta-items, pedido-items y comisión-venta, además de `supabase_migrations.schema_migrations` hasta 035.

## Criterio de salida

Solo declarar `BACKUP_RESTORE = PASS` cuando el dump, hashes, cifrado, restore, conteos, relaciones y migration history estén verificados. Hasta entonces, no aplicar 036, no hacer merge a `main` y no publicar Netlify.
