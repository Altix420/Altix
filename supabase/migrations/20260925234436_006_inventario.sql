-- 006_inventario.sql

CREATE TYPE tipo_movimiento_inv AS ENUM ('entrada', 'salida', 'traslado_salida', 'traslado_entrada', 'ajuste', 'defectuoso', 'devolucion');
CREATE TYPE estado_traslado AS ENUM ('pendiente', 'en_transito', 'recibido', 'cancelado');

-- Stock por sucursal
CREATE TABLE inventarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
    stock NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    stock_minimo NUMERIC(12,2) DEFAULT 5.00,
    stock_maximo NUMERIC(12,2) DEFAULT 1000.00,
    UNIQUE(sucursal_id, producto_id)
);

-- Movimientos de inventario (Kardex)
CREATE TABLE movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE RESTRICT,
    producto_id UUID REFERENCES productos(id) ON DELETE RESTRICT,
    tipo tipo_movimiento_inv NOT NULL,
    cantidad NUMERIC(12,2) NOT NULL,
    stock_anterior NUMERIC(12,2) NOT NULL,
    stock_nuevo NUMERIC(12,2) NOT NULL,
    motivo TEXT,
    usuario_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Traslados entre sucursales
CREATE TABLE traslados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_origen_id UUID REFERENCES sucursales(id) ON DELETE RESTRICT,
    sucursal_destino_id UUID REFERENCES sucursales(id) ON DELETE RESTRICT,
    estado estado_traslado DEFAULT 'pendiente',
    solicitado_por UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    recibido_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE traslado_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    traslado_id UUID REFERENCES traslados(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad NUMERIC(12,2) NOT NULL CHECK (cantidad > 0)
);

-- Productos defectuosos / Merma
CREATE TABLE defectuosos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE RESTRICT,
    producto_id UUID REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad NUMERIC(12,2) NOT NULL CHECK (cantidad > 0),
    motivo TEXT NOT NULL,
    reportado_por UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Conteos físicos e inventario ciego
CREATE TABLE conteos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE RESTRICT,
    estado TEXT DEFAULT 'en_proceso' CHECK (estado IN ('en_proceso', 'finalizado', 'cancelado')),
    realizado_por UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE conteos_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conteo_id UUID REFERENCES conteos(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE RESTRICT,
    stock_sistema NUMERIC(12,2) NOT NULL,
    stock_fisico NUMERIC(12,2) NOT NULL,
    diferencia NUMERIC(12,2) GENERATED ALWAYS AS (stock_fisico - stock_sistema) STORED
);
