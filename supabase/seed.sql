-- supabase/seed.sql

-- 1. Sucursales de prueba
INSERT INTO sucursales (id, nombre, direccion, telefono) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sucursal Central - Huehuetenango', 'Zona 1, Calle Real', '7764-0001'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Sucursal Norte - Aguacatán', 'Centro Comercial Los Pinos', '7764-0002'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Sucursal Sur - Chiantla', 'Barrio El Calvario', '7764-0003');

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
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c44', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b33', 'IMP-TARJ-1k', '1,000 Tarjetas de Presentación', 250.00, 200.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c51', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'GF-BAN-18', 'Banner 18oz m²', 55.00, 43.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c52', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'GF-VIN-MAT', 'Vinil Adhesivo Mate m²', 68.00, 54.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c53', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'GF-LONA', 'Lona Frontlight m²', 72.00, 58.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c54', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'GF-ROTULO', 'Rótulo PVC expandido', 180.00, 145.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c55', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'TEX-PLAYERA', 'Playera promocional', 65.00, 52.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c56', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'TEX-SUDADERA', 'Sudadera bordada', 145.00, 118.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c57', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'TEX-GORRA', 'Gorra personalizada', 55.00, 42.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c58', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'TEX-TOTE', 'Bolsa de tela', 48.00, 37.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c59', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b33', 'IMP-FLYER-500', '500 Volantes', 180.00, 145.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c60', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b33', 'IMP-AFICHE', 'Afiche tabloide', 22.00, 17.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c61', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b33', 'IMP-MENU', 'Menú plastificado', 35.00, 27.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c62', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b33', 'IMP-STICKER', 'Stickers troquelados', 95.00, 75.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c63', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b33', 'IMP-SELLO', 'Sello automático', 125.00, 98.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c64', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b33', 'IMP-ROLLUP', 'Roll-up 85x200', 650.00, 520.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c65', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'GF-CORRUGADO', 'Coroplast impreso', 210.00, 168.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c66', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'TEX-DELANTAL', 'Delantal bordado', 95.00, 76.00);

INSERT INTO productos_costos (producto_id, costo_unitario) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 20.00), ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 27.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 42.00), ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c44', 120.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c51', 25.00), ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c52', 31.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c53', 36.00), ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c54', 90.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c55', 32.00), ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c56', 75.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c57', 26.00), ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c58', 22.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c59', 85.00), ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c60', 9.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c61', 14.00), ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c62', 38.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c63', 52.00), ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c64', 330.00),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c65', 105.00), ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c66', 46.00)
ON CONFLICT (producto_id) DO UPDATE SET costo_unitario = EXCLUDED.costo_unitario;

-- 4. Clientes de prueba
INSERT INTO clientes (id, nombre, nit_dpi, telefono, es_mayorista, monto_solicitado, monto_autorizado, dias_credito) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d11', 'Cliente Final Demo', 'CF', '5555-1234', false, 0, 0, 0),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d22', 'Distribuidora del Occidente', '1234567-8', '7765-4321', true, 10000.00, 5000.00, 20),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d31', 'Comercial La Sierra', '1111111-1', '7765-4301', true, 8000.00, 4000.00, 15),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d32', 'Papelería El Centro', '2222222-2', '7765-4302', true, 6000.00, 3000.00, 15),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d33', 'Constructora Norte', '3333333-3', '7765-4303', true, 15000.00, 8000.00, 30),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d34', 'Boutique Chiantla', '4444444-4', '7765-4304', true, 5000.00, 2500.00, 15),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d35', 'Restaurante La Plaza', '5555555-5', '7765-4305', true, 7000.00, 3500.00, 20),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d36', 'Hotel Los Pinos', '6666666-6', '7765-4306', true, 12000.00, 6000.00, 30),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d37', 'Agencia Occidente', '7777777-7', '7765-4307', true, 9000.00, 4500.00, 20),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d38', 'Café del Parque', '8888888-8', '7765-4308', true, 4000.00, 2000.00, 15),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d39', 'Servicios del Valle', '9999999-9', '7765-4309', true, 10000.00, 5000.00, 20);

-- 5 extras y 5 diseños vinculados a productos reales. La imagen se deja vacía para probar R2 por separado.
INSERT INTO extras (id, nombre, precio_adicional, activo) VALUES
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f11', 'Diseño básico', 35.00, true),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f22', 'Instalación', 50.00, true),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f33', 'Acabado mate', 18.00, true),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f44', 'Ojales metálicos', 12.00, true),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f55', 'Entrega local', 25.00, true);

INSERT INTO disenos (id, sku, nombre, descripcion, categoria_id, producto_id, precio, activo, observaciones) VALUES
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DIS-BAN-001', 'Campaña verano', 'Diseño para banner promocional.', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 45.00, true, 'Seed local'),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'DIS-VIN-002', 'Vitrina corporativa', 'Diseño para vinil adhesivo.', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 60.00, true, 'Seed local'),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'DIS-POL-003', 'Uniforme institucional', 'Diseño para polo bordado.', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 85.00, true, 'Seed local'),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'DIS-TAR-004', 'Tarjeta ejecutiva', 'Diseño para tarjeta corporativa.', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b33', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c44', 250.00, true, 'Seed local'),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'DIS-LON-005', 'Lona apertura', 'Diseño para lona de inauguración.', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c53', 72.00, true, 'Seed local');

INSERT INTO diseno_extras (diseno_id, extra_id) VALUES
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f11'),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f44'),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f22'),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f33'),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f11'),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f55');

-- 5. Inventario inicial
INSERT INTO inventarios (sucursal_id, producto_id, stock, stock_minimo) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 1000.00, 50.00),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 500.00, 30.00),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 300.00, 20.00),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 120.00, 15.00),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 250.00, 20.00),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 150.00, 20.00),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 100.00, 15.00);

INSERT INTO inventarios (sucursal_id, producto_id, stock, stock_minimo)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID, p.id, 100.00, 10.00
FROM productos p
WHERE p.id NOT IN (
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c22'
)
ON CONFLICT (sucursal_id, producto_id) DO NOTHING;

-- Usuario Administrador de Prueba en Auth
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e11',
  '00000000-0000-0000-0000-000000000000',
  'admin@altix.gt',
  crypt('Altix2026!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"nombre_completo":"Administrador Altix"}',
  '',
  '',
  '',
  '',
  NULL,
  now(),
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Perfil de Administrador
INSERT INTO profiles (id, nombre_completo, role, activo)
VALUES ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e11', 'Administrador Altix', 'administrador', true)
ON CONFLICT (id) DO UPDATE SET role = 'administrador';

-- Asignación a Sucursal Central
INSERT INTO usuario_sucursal (user_id, sucursal_id)
VALUES ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
ON CONFLICT DO NOTHING;

-- Administradores locales adicionales. Estas credenciales son solo para desarrollo local.
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change, phone, created_at, updated_at, role, aud
) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e12', '00000000-0000-0000-0000-000000000000', 'admin2@altix.local', crypt('AltixAdmin2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre_completo":"Administradora Altix 2"}', '', '', '', '', NULL, now(), now(), 'authenticated', 'authenticated'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e13', '00000000-0000-0000-0000-000000000000', 'admin3@altix.local', crypt('AltixAdmin2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre_completo":"Administrador Altix 3"}', '', '', '', '', NULL, now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, nombre_completo, role, activo) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e12', 'Administradora Altix 2', 'administrador', true),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e13', 'Administrador Altix 3', 'administrador', true)
ON CONFLICT (id) DO UPDATE SET role = 'administrador', activo = true;

INSERT INTO usuario_sucursal (user_id, sucursal_id) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
ON CONFLICT DO NOTHING;

-- Usuario Vendedor de Prueba en Auth
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e22',
  '00000000-0000-0000-0000-000000000000',
  'vendedor1@altix.local',
  crypt('AltixVendor123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"nombre_completo":"Vendedor Demo 1"}',
  '',
  '',
  '',
  '',
  NULL,
  now(),
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Perfil de Vendedor de Prueba
INSERT INTO profiles (id, nombre_completo, role, activo)
VALUES ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e22', 'Vendedor Demo 1', 'vendedor', true)
ON CONFLICT (id) DO UPDATE SET role = 'vendedor', activo = true;

-- Asignación a Sucursal Central
INSERT INTO usuario_sucursal (user_id, sucursal_id)
VALUES ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
ON CONFLICT DO NOTHING;

-- Vendedores locales 2-7. Distribución: 3 en Central, 2 en Norte, 2 en Sur.
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change, phone, created_at, updated_at, role, aud
) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e23', '00000000-0000-0000-0000-000000000000', 'vendedor2@altix.local', crypt('AltixVendor123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre_completo":"Vendedor Demo 2"}', '', '', '', '', NULL, now(), now(), 'authenticated', 'authenticated'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e24', '00000000-0000-0000-0000-000000000000', 'vendedor3@altix.local', crypt('AltixVendor123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre_completo":"Vendedor Demo 3"}', '', '', '', '', NULL, now(), now(), 'authenticated', 'authenticated'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e25', '00000000-0000-0000-0000-000000000000', 'vendedor4@altix.local', crypt('AltixVendor123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre_completo":"Vendedor Demo 4"}', '', '', '', '', NULL, now(), now(), 'authenticated', 'authenticated'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e26', '00000000-0000-0000-0000-000000000000', 'vendedor5@altix.local', crypt('AltixVendor123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre_completo":"Vendedor Demo 5"}', '', '', '', '', NULL, now(), now(), 'authenticated', 'authenticated'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e27', '00000000-0000-0000-0000-000000000000', 'vendedor6@altix.local', crypt('AltixVendor123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre_completo":"Vendedor Demo 6"}', '', '', '', '', NULL, now(), now(), 'authenticated', 'authenticated'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e28', '00000000-0000-0000-0000-000000000000', 'vendedor7@altix.local', crypt('AltixVendor123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre_completo":"Vendedor Demo 7"}', '', '', '', '', NULL, now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, nombre_completo, role, activo) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e23', 'Vendedor Demo 2', 'vendedor', true),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e24', 'Vendedor Demo 3', 'vendedor', true),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e25', 'Vendedor Demo 4', 'vendedor', true),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e26', 'Vendedor Demo 5', 'vendedor', true),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e27', 'Vendedor Demo 6', 'vendedor', true),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e28', 'Vendedor Demo 7', 'vendedor', true)
ON CONFLICT (id) DO UPDATE SET role = 'vendedor', activo = true;

INSERT INTO usuario_sucursal (user_id, sucursal_id) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e23', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e24', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e25', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e26', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e27', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e28', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33')
ON CONFLICT DO NOTHING;
