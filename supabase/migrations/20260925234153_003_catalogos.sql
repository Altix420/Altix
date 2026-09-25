-- 003_catalogos.sql

-- Clientes y Mayoristas
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    nit_dpi TEXT,
    telefono TEXT,
    direccion TEXT,
    es_mayorista BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Categorías de Productos
CREATE TABLE categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Productos
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
    sku TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio_base NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    precio_mayorista NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Reglas de Descuento
CREATE TABLE reglas_descuento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    porcentaje NUMERIC(5,2) CHECK (porcentaje >= 0 AND porcentaje <= 100),
    monto_minimo NUMERIC(12,2) DEFAULT 0.00,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Diseños asignados
CREATE TABLE disenos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    archivo_url TEXT,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Extras de servicios/impresión
CREATE TABLE extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    precio_adicional NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
