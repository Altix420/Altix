# Credenciales de prueba Vendor

Estas credenciales son únicamente para el entorno local de Supabase. No deben reutilizarse en producción.

- **Correo:** `vendedor1@altix.local`
- **Contraseña:** `AltixVendor123!`
- **Rol:** `vendedor`
- **Estado:** activo y correo confirmado
- **Sucursal:** Sucursal Central - Huehuetenango
- **Usuario:** `e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e22`
- **Seed:** `supabase/seed.sql`, mediante el mismo mecanismo local de inserción Auth usado por el administrador de prueba.

La cuenta se recrea al ejecutar `supabase db reset`. La asignación de sucursal se crea en `usuario_sucursal`.
