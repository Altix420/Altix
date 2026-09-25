-- 007_caja_comisiones.sql

-- Sesiones de caja
CREATE TABLE sesiones_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE RESTRICT,
    usuario_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    monto_apertura NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    monto_cierre NUMERIC(12,2),
    fecha_apertura TIMESTAMPTZ DEFAULT now(),
    fecha_cierre TIMESTAMPTZ,
    estado TEXT DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada'))
);

-- Arqueo y movimientos de caja
CREATE TABLE movimientos_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesion_caja_id UUID REFERENCES sesiones_caja(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
    monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    concepto TEXT NOT NULL,
    referencia_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Gastos de caja chica
CREATE TABLE gastos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesion_caja_id UUID REFERENCES sesiones_caja(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE RESTRICT,
    categoria TEXT NOT NULL,
    monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    descripcion TEXT NOT NULL,
    comprobante_url TEXT,
    registrado_por UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Reglas de Comisión Escalonadas
CREATE TABLE reglas_comision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_cliente TEXT NOT NULL CHECK (tipo_cliente IN ('mayorista', 'cliente_final')),
    monto_min NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    monto_max NUMERIC(12,2) NOT NULL,
    porcentaje NUMERIC(5,2) NOT NULL CHECK (porcentaje >= 0 AND porcentaje <= 100),
    activa BOOLEAN DEFAULT true
);

-- Comisiones calculadas por venta
CREATE TABLE comisiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    monto_venta NUMERIC(12,2) NOT NULL,
    porcentaje_aplicado NUMERIC(5,2) NOT NULL,
    monto_comision NUMERIC(12,2) NOT NULL,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'anulada')),
    periodo TEXT NOT NULL, -- Formato YYYY-MM
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ajustes_comision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comision_id UUID REFERENCES comisiones(id) ON DELETE CASCADE,
    monto_ajuste NUMERIC(12,2) NOT NULL,
    motivo TEXT NOT NULL,
    aprobado_por UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar las reglas de comisión por defecto
INSERT INTO reglas_comision (tipo_cliente, monto_min, monto_max, porcentaje) VALUES
('mayorista', 0.00, 999999999.99, 1.00),
('cliente_final', 0.00, 19999.99, 2.00),
('cliente_final', 20000.00, 24999.99, 3.00),
('cliente_final', 25000.00, 50000.00, 4.00),
('cliente_final', 50000.01, 999999999.99, 5.00);
