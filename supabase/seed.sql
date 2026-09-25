-- supabase/seed.sql

-- 1. Sucursales de prueba
INSERT INTO sucursales (id, nombre, direccion, telefono) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sucursal Central - Huehuetenango', 'Zona 1, Calle Real', '7764-0001'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Sucursal Norte - Aguacatán', 'Centro Comercial Los Pinos', '7764-0002');

-- 2. Categorías de prueba
INSERT INTO categorias (id, nombre, descripcion) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'Gran Formato', 'Banners, vinilos y rótulos'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'Textil y Bordados', 'Uniformes y promocionales textiles'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b33', 'Imprenta Digital', 'Tarjetas, volantes y afiches');

-- 3. Productos de prueba
INSERT INTO productos (id, categoria_id, sku, nombre, precio_base, precio_mayorista) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'GF-BAN-13', 'Banner 13oz m²', 45.00, 35.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'GF-VIN-01', 'Vinil Adhesivo BRILLO m²', 60.00, 48.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'TEX-POLO-B', 'Playera Polo con Bordado', 85.00, 70.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c44', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b33', 'IMP-TARJ-1k', '1,000 Tarjetas de Presentación', 250.00, 200.00);

-- 4. Clientes de prueba
INSERT INTO clientes (id, nombre, nit_dpi, telefono, es_mayorista) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d11', 'Cliente Final Demo', 'CF', '5555-1234', false),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d22', 'Distribuidora del Occidente', '1234567-8', '7765-4321', true);

-- 5. Inventario inicial
INSERT INTO inventarios (sucursal_id, producto_id, stock, stock_minimo) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 1000.00, 50.00),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 500.00, 30.00),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 300.00, 20.00);
