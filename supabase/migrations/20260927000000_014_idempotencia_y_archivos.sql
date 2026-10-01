-- 014_idempotencia_y_archivos.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ventas'
      AND column_name = 'operation_id'
  ) THEN
    ALTER TABLE public.ventas ADD COLUMN operation_id TEXT UNIQUE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.archivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL UNIQUE,
  nombre_original TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  bucket TEXT NOT NULL DEFAULT 'altix-dev',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.archivos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'archivos'
      AND policyname = 'Lectura autenticada de archivos'
  ) THEN
    CREATE POLICY "Lectura autenticada de archivos"
      ON public.archivos FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'archivos'
      AND policyname = 'Insercion autenticada de archivos'
  ) THEN
    CREATE POLICY "Insercion autenticada de archivos"
      ON public.archivos FOR INSERT TO authenticated
      WITH CHECK (created_by = auth.uid());
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.registrar_archivo(
  p_path TEXT,
  p_nombre_original TEXT,
  p_mime_type TEXT,
  p_size_bytes BIGINT,
  p_bucket TEXT DEFAULT 'altix-dev'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión autenticada.';
  END IF;
  IF p_path IS NULL OR p_path !~ '^[a-zA-Z0-9/_ .-]+$' OR p_path LIKE '%..%' THEN
    RAISE EXCEPTION 'Path de archivo inválido.';
  END IF;
  IF p_size_bytes IS NULL OR p_size_bytes <= 0 THEN
    RAISE EXCEPTION 'El archivo debe tener un tamaño válido.';
  END IF;

  INSERT INTO public.archivos (
    path, nombre_original, mime_type, size_bytes, bucket, created_by
  ) VALUES (
    p_path, p_nombre_original, p_mime_type, p_size_bytes, p_bucket, auth.uid()
  )
  ON CONFLICT (path) DO UPDATE SET
    nombre_original = EXCLUDED.nombre_original,
    mime_type = EXCLUDED.mime_type,
    size_bytes = EXCLUDED.size_bytes,
    bucket = EXCLUDED.bucket
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

DROP FUNCTION IF EXISTS public.registrar_venta(uuid, uuid, uuid, uuid, numeric, text, jsonb, uuid);
DROP FUNCTION IF EXISTS public.registrar_venta(uuid, uuid, uuid, uuid, numeric, text, jsonb, uuid, text);
DROP FUNCTION IF EXISTS public.registrar_venta(uuid, uuid, uuid, uuid, numeric, text, json, uuid);
DROP FUNCTION IF EXISTS public.registrar_venta(uuid, uuid, uuid, uuid, numeric, text, json, uuid, text);

CREATE OR REPLACE FUNCTION public.registrar_venta(
  p_sucursal_id UUID,
  p_cliente_id UUID,
  p_vendedor_id UUID,
  p_sesion_caja_id UUID DEFAULT NULL,
  p_total NUMERIC DEFAULT 0,
  p_tipo_pago TEXT DEFAULT 'efectivo',
  p_items JSONB DEFAULT '[]'::jsonb,
  p_pedido_id UUID DEFAULT NULL,
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_venta_id UUID;
  v_venta_total NUMERIC;
  v_venta_cliente UUID;
  v_venta_sucursal UUID;
  v_venta_vendedor UUID;
  v_venta_pedido UUID;
  v_item JSONB;
  v_prod_id UUID;
  v_cant NUMERIC;
  v_precio NUMERIC;
  v_sum_calculated NUMERIC := 0;
  v_stock_actual NUMERIC;
  v_sesion_estado TEXT;
  v_sesion_sucursal UUID;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La venta debe contener al menos un producto.';
  END IF;
  IF p_tipo_pago NOT IN ('efectivo', 'tarjeta', 'transferencia', 'credito') THEN
    RAISE EXCEPTION 'Tipo de pago % no permitido.', p_tipo_pago;
  END IF;
  IF p_total IS NULL OR p_total <= 0 THEN
    RAISE EXCEPTION 'El total de la venta debe ser mayor a cero.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.usuario_sucursal
    WHERE user_id = p_vendedor_id AND sucursal_id = p_sucursal_id
  ) THEN
    RAISE EXCEPTION 'El vendedor no está autorizado para operar en la sucursal.';
  END IF;
  IF p_cliente_id IS NULL AND p_tipo_pago = 'credito' THEN
    RAISE EXCEPTION 'Las ventas a crédito requieren un cliente.';
  END IF;
  IF p_cliente_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clientes WHERE id = p_cliente_id AND activo = true
  ) THEN
    RAISE EXCEPTION 'El cliente no existe o está inactivo.';
  END IF;

  IF p_sesion_caja_id IS NOT NULL THEN
    SELECT estado, sucursal_id INTO v_sesion_estado, v_sesion_sucursal
    FROM public.sesiones_caja WHERE id = p_sesion_caja_id FOR UPDATE;
    IF v_sesion_estado IS DISTINCT FROM 'abierta' THEN
      RAISE EXCEPTION 'La sesión de caja no existe o no está abierta.';
    END IF;
    IF v_sesion_sucursal IS DISTINCT FROM p_sucursal_id THEN
      RAISE EXCEPTION 'La sesión de caja no pertenece a la sucursal.';
    END IF;
  ELSIF p_tipo_pago <> 'credito' THEN
    RAISE EXCEPTION 'Se requiere una sesión de caja para este tipo de pago.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF v_item->>'producto_id' IS NULL
       OR v_item->>'cantidad' IS NULL
       OR v_item->>'precio_unitario' IS NULL THEN
      RAISE EXCEPTION 'Cada item debe incluir producto_id, cantidad y precio_unitario.';
    END IF;
    v_cant := (v_item->>'cantidad')::NUMERIC;
    v_precio := (v_item->>'precio_unitario')::NUMERIC;
    IF v_cant <= 0 OR v_precio < 0 THEN
      RAISE EXCEPTION 'Cantidad o precio inválido en los items.';
    END IF;
    v_sum_calculated := v_sum_calculated + (v_cant * v_precio);
  END LOOP;
  IF ABS(v_sum_calculated - p_total) > 0.01 THEN
    RAISE EXCEPTION 'El total no coincide con la suma de los items.';
  END IF;

  IF p_operation_id IS NOT NULL THEN
    SELECT id, total, cliente_id, sucursal_id, vendedor_id, pedido_id
    INTO v_venta_id, v_venta_total, v_venta_cliente, v_venta_sucursal,
         v_venta_vendedor, v_venta_pedido
    FROM public.ventas WHERE operation_id = p_operation_id;
    IF v_venta_id IS NOT NULL THEN
      IF v_venta_total <> p_total
         OR v_venta_cliente IS DISTINCT FROM p_cliente_id
         OR v_venta_sucursal IS DISTINCT FROM p_sucursal_id
         OR v_venta_vendedor IS DISTINCT FROM p_vendedor_id
         OR v_venta_pedido IS DISTINCT FROM p_pedido_id THEN
        RAISE EXCEPTION 'El operation_id ya fue usado con otro payload.';
      END IF;
      RETURN v_venta_id;
    END IF;
  END IF;

  INSERT INTO public.ventas (
    sucursal_id, cliente_id, vendedor_id, total, operation_id, pedido_id
  ) VALUES (
    p_sucursal_id, p_cliente_id, p_vendedor_id, p_total, p_operation_id, p_pedido_id
  )
  ON CONFLICT (operation_id) DO NOTHING
  RETURNING id INTO v_venta_id;

  IF v_venta_id IS NULL AND p_operation_id IS NOT NULL THEN
    SELECT id INTO v_venta_id FROM public.ventas
    WHERE operation_id = p_operation_id;
    RETURN v_venta_id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := (v_item->>'producto_id')::UUID;
    v_cant := (v_item->>'cantidad')::NUMERIC;
    v_precio := (v_item->>'precio_unitario')::NUMERIC;
    SELECT stock INTO v_stock_actual FROM public.inventarios
    WHERE sucursal_id = p_sucursal_id AND producto_id = v_prod_id FOR UPDATE;
    IF v_stock_actual IS NULL OR v_stock_actual < v_cant THEN
      RAISE EXCEPTION 'Stock insuficiente o producto no configurado en la sucursal.';
    END IF;

    INSERT INTO public.venta_items (
      venta_id, producto_id, cantidad, precio_unitario, subtotal
    ) VALUES (v_venta_id, v_prod_id, v_cant, v_precio, v_cant * v_precio);
    UPDATE public.inventarios SET stock = stock - v_cant
    WHERE sucursal_id = p_sucursal_id AND producto_id = v_prod_id;
    INSERT INTO public.movimientos_inventario (
      sucursal_id, producto_id, tipo, cantidad, stock_anterior,
      stock_nuevo, motivo, usuario_id
    ) VALUES (
      p_sucursal_id, v_prod_id, 'salida', v_cant, v_stock_actual,
      v_stock_actual - v_cant, 'Venta ' || v_venta_id, p_vendedor_id
    );
  END LOOP;

  IF p_sesion_caja_id IS NOT NULL
     AND p_tipo_pago IN ('efectivo', 'tarjeta', 'transferencia') THEN
    INSERT INTO public.movimientos_caja (
      sesion_caja_id, tipo, monto, concepto, referencia_id
    ) VALUES (
      p_sesion_caja_id, 'ingreso', p_total,
      'Venta ' || substring(v_venta_id::text, 1, 8), v_venta_id
    );
  END IF;
  PERFORM public.generar_comision(v_venta_id);
  RETURN v_venta_id;
END;
$$;
