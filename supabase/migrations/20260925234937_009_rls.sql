-- 009_rls.sql

-- Habilitar RLS en tablas principales
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_sucursal ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_caja ENABLE ROW LEVEL SECURITY;

-- Políticas de Lectura para usuarios autenticados
CREATE POLICY "Permitir lectura a usuarios autenticados" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir lectura de sucursales" ON sucursales FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir lectura de clientes" ON clientes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir lectura de categorias" ON categorias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir lectura de productos" ON productos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir lectura de cotizaciones" ON cotizaciones FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir lectura de pedidos" ON pedidos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir lectura de ventas" ON ventas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir lectura de inventario" ON inventarios FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir lectura de sesiones de caja" ON sesiones_caja FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas de Inserción / Edición
CREATE POLICY "Permitir insercion/edicion de cotizaciones" ON cotizaciones FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir insercion/edicion de pedidos" ON pedidos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir insercion de clientes" ON clientes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
