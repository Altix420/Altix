-- 004_motor_comercial.sql

-- Estados de cotización y pedido
CREATE TYPE estado_cotizacion AS ENUM ('borrador', 'enviada', 'convertida', 'cancelada');
CREATE TYPE estado_pedido AS ENUM ('pendiente', 'en_produccion', 'listo', 'entregado', 'cancelado');
CREATE TYPE metodo_pago AS ENUM ('efectivo', 'tarjeta', 'transferencia', 'credito', 'saldo_favor');

-- Cotizaciones
CREATE TABLE cotizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    vendedor_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    estado estado_cotizacion DEFAULT 'borrador',
    valida_hasta DATE,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cotizacion_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotizacion_id UUID REFERENCES cotizaciones(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad NUMERIC(12,2) NOT NULL DEFAULT 1.00,
    precio_unitario NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    observaciones TEXT
);

-- Pedidos
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotizacion_id UUID REFERENCES cotizaciones(id) ON DELETE SET NULL,
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    vendedor_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    saldo_pendiente NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    estado estado_pedido DEFAULT 'pendiente',
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pedido_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE RESTRICT,
    diseno_id UUID REFERENCES disenos(id) ON DELETE SET NULL,
    cantidad NUMERIC(12,2) NOT NULL DEFAULT 1.00,
    precio_unitario NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    observaciones TEXT
);

-- Anticipos de pedidos
CREATE TABLE anticipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    forma_pago metodo_pago NOT NULL DEFAULT 'efectivo',
    comprobante_ref TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ventas consolidadas
CREATE TABLE ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    vendedor_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    total NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE venta_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad NUMERIC(12,2) NOT NULL,
    precio_unitario NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL
);

-- Entregas registradas
CREATE TABLE entregas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    venta_id UUID REFERENCES ventas(id) ON DELETE SET NULL,
    recibido_por TEXT NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Pagos finales
CREATE TABLE pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    forma_pago metodo_pago NOT NULL,
    referencia TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
