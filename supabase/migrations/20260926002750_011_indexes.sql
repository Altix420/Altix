-- 011_indexes.sql

-- B-Tree exactos / prefijo
CREATE INDEX IF NOT EXISTS idx_clientes_nit ON clientes(nit_dpi);
CREATE INDEX IF NOT EXISTS idx_productos_sku ON productos(sku);
CREATE INDEX IF NOT EXISTS idx_ventas_sucursal_vendedor ON ventas(sucursal_id, vendedor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cuentas_cobrar_vencimiento ON cuentas_cobrar(fecha_vencimiento, estado);
CREATE INDEX IF NOT EXISTS idx_inventarios_sucursal_prod ON inventarios(sucursal_id, producto_id);
CREATE INDEX IF NOT EXISTS idx_mov_inv_prod ON movimientos_inventario(producto_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comisiones_vendedor_periodo ON comisiones(vendedor_id, periodo);

-- pg_trgm para búsqueda difusa en nombres
CREATE INDEX IF NOT EXISTS idx_trgm_clientes_nombre ON clientes USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_trgm_productos_nombre ON productos USING gin (nombre gin_trgm_ops);
