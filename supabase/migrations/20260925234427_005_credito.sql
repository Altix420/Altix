-- 005_credito.sql

CREATE TYPE estado_cuenta AS ENUM ('pendiente', 'parcial', 'pagada', 'vencida');

-- Cuentas por cobrar
CREATE TABLE cuentas_cobrar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    venta_id UUID REFERENCES ventas(id) ON DELETE SET NULL,
    monto_total NUMERIC(12,2) NOT NULL CHECK (monto_total > 0),
    saldo_pendiente NUMERIC(12,2) NOT NULL CHECK (saldo_pendiente >= 0),
    fecha_vencimiento DATE NOT NULL,
    estado estado_cuenta DEFAULT 'pendiente',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Pagos aplicados a crédito
CREATE TABLE pagos_credito (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_cobrar_id UUID REFERENCES cuentas_cobrar(id) ON DELETE CASCADE,
    monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    forma_pago metodo_pago NOT NULL DEFAULT 'efectivo',
    referencia TEXT,
    registrado_por UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Recordatorios de cobro
CREATE TABLE recordatorios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    cuenta_cobrar_id UUID REFERENCES cuentas_cobrar(id) ON DELETE CASCADE,
    fecha_recordatorio DATE NOT NULL,
    enviado BOOLEAN DEFAULT false,
    nota TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Saldos a favor de clientes
CREATE TABLE saldos_favor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
    saldo_disponible NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (saldo_disponible >= 0),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE movimientos_saldo_favor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saldo_favor_id UUID REFERENCES saldos_favor(id) ON DELETE CASCADE,
    monto NUMERIC(12,2) NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('credito', 'debito')),
    concepto TEXT NOT NULL,
    referencia_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);
