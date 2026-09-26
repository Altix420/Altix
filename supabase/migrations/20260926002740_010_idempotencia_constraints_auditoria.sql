-- 010_idempotencia_constraints_auditoria.sql

-- 1. Idempotencia en tablas críticas
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS operation_id TEXT UNIQUE;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS operation_id TEXT UNIQUE;
ALTER TABLE anticipos ADD COLUMN IF NOT EXISTS operation_id TEXT UNIQUE;
ALTER TABLE movimientos_caja ADD COLUMN IF NOT EXISTS operation_id TEXT UNIQUE;
ALTER TABLE traslados ADD COLUMN IF NOT EXISTS operation_id TEXT UNIQUE;

-- 2. Tabla de Devoluciones
CREATE TABLE IF NOT EXISTS devoluciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE RESTRICT,
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    monto_total NUMERIC(12,2) NOT NULL CHECK (monto_total > 0),
    motivo TEXT NOT NULL,
    autorizado_por UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    operation_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devolucion_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devolucion_id UUID REFERENCES devoluciones(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad NUMERIC(12,2) NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

-- 3. Bitácora de Auditoría
CREATE TABLE IF NOT EXISTS bitacora_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    accion TEXT NOT NULL,
    tabla_afectada TEXT NOT NULL,
    registro_id UUID,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Constraints de Integridad Numérica
ALTER TABLE inventarios ADD CONSTRAINT check_stock_non_negative CHECK (stock >= 0);
ALTER TABLE productos ADD CONSTRAINT check_precio_base CHECK (precio_base >= 0);
ALTER TABLE productos ADD CONSTRAINT check_precio_mayorista CHECK (precio_mayorista >= 0);
