-- 043: diseños independientes, aprobación de gastos y depósitos de caja.
-- La columna disenos.producto_id se conserva como legado de compatibilidad.

ALTER TABLE public.disenos
  ADD COLUMN IF NOT EXISTS unidad_venta TEXT NOT NULL DEFAULT 'unidad',
  ADD COLUMN IF NOT EXISTS precio_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_mayorista NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'disenos_unidad_venta_check'
      AND conrelid = 'public.disenos'::regclass
  ) THEN
    ALTER TABLE public.disenos
      ADD CONSTRAINT disenos_unidad_venta_check
      CHECK (unidad_venta IN ('unidad', 'vara', 'metro', 'yarda', 'docena', 'paquete', 'rollo'));
  END IF;
END
$$;

UPDATE public.disenos d
SET precio_base = COALESCE(NULLIF(d.precio, 0), p.precio_base, 0),
    precio_mayorista = COALESCE(p.precio_mayorista, NULLIF(d.precio, 0), 0),
    costo_unitario = COALESCE(pc.costo_unitario, 0),
    unidad_venta = COALESCE(p.unidad_venta, 'unidad')
FROM public.productos p
LEFT JOIN public.productos_costos pc ON pc.producto_id = p.id
WHERE d.producto_id = p.id;

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS diseno_id UUID REFERENCES public.disenos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_productos_diseno_id ON public.productos(diseno_id);

UPDATE public.productos p
SET diseno_id = d.id
FROM public.disenos d
WHERE d.producto_id = p.id
  AND p.diseno_id IS NULL;

ALTER TABLE public.movimientos_caja
  ADD COLUMN IF NOT EXISTS subtipo TEXT NOT NULL DEFAULT 'operativo',
  ADD COLUMN IF NOT EXISTS comprobante_ref TEXT,
  ADD COLUMN IF NOT EXISTS banco_destino TEXT,
  ADD COLUMN IF NOT EXISTS registrado_por UUID REFERENCES public.profiles(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'movimientos_caja_subtipo_check'
      AND conrelid = 'public.movimientos_caja'::regclass
  ) THEN
    ALTER TABLE public.movimientos_caja
      ADD CONSTRAINT movimientos_caja_subtipo_check
      CHECK (subtipo IN ('operativo', 'deposito'));
  END IF;
END
$$;

DROP FUNCTION IF EXISTS public.guardar_diseno(UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT, UUID, NUMERIC, BOOLEAN, TEXT, JSONB, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT);
CREATE OR REPLACE FUNCTION public.guardar_diseno(
  p_diseno_id UUID DEFAULT NULL,
  p_sku TEXT DEFAULT NULL,
  p_nombre TEXT DEFAULT NULL,
  p_descripcion TEXT DEFAULT NULL,
  p_categoria_id UUID DEFAULT NULL,
  p_cliente_id UUID DEFAULT NULL,
  p_archivo_url TEXT DEFAULT NULL,
  p_archivo_id UUID DEFAULT NULL,
  p_precio NUMERIC DEFAULT 0,
  p_activo BOOLEAN DEFAULT true,
  p_observaciones TEXT DEFAULT NULL,
  p_extra_ids JSONB DEFAULT '[]'::jsonb,
  p_precio_base NUMERIC DEFAULT 0,
  p_precio_mayorista NUMERIC DEFAULT 0,
  p_costo_unitario NUMERIC DEFAULT 0,
  p_unidad_venta TEXT DEFAULT 'unidad'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM public.altix_require_admin(auth.uid());
  IF NULLIF(btrim(COALESCE(p_nombre, '')), '') IS NULL THEN
    RAISE EXCEPTION 'El nombre del diseño es obligatorio.';
  END IF;
  IF p_precio_base IS NULL OR p_precio_base < 0
     OR p_precio_mayorista IS NULL OR p_precio_mayorista < 0
     OR p_costo_unitario IS NULL OR p_costo_unitario < 0
     OR jsonb_typeof(p_extra_ids) <> 'array' THEN
    RAISE EXCEPTION 'Los precios, costo y extras del diseño no son válidos.';
  END IF;
  IF p_unidad_venta NOT IN ('unidad', 'vara', 'metro', 'yarda', 'docena', 'paquete', 'rollo') THEN
    RAISE EXCEPTION 'La unidad de venta no está soportada.';
  END IF;

  IF p_diseno_id IS NULL THEN
    INSERT INTO public.disenos(
      sku, nombre, descripcion, categoria_id, cliente_id, archivo_url, archivo_id,
      precio, precio_base, precio_mayorista, costo_unitario, unidad_venta,
      activo, observaciones
    ) VALUES (
      NULLIF(btrim(p_sku), ''), btrim(p_nombre), NULLIF(btrim(p_descripcion), ''),
      p_categoria_id, p_cliente_id, p_archivo_url, p_archivo_id,
      COALESCE(p_precio, p_precio_base), p_precio_base, p_precio_mayorista, p_costo_unitario, p_unidad_venta,
      COALESCE(p_activo, true), NULLIF(btrim(p_observaciones), '')
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.disenos
    SET sku = NULLIF(btrim(p_sku), ''), nombre = btrim(p_nombre),
        descripcion = NULLIF(btrim(p_descripcion), ''), categoria_id = p_categoria_id,
        cliente_id = p_cliente_id, archivo_url = p_archivo_url, archivo_id = p_archivo_id,
        precio = COALESCE(p_precio, p_precio_base), precio_base = p_precio_base,
        precio_mayorista = p_precio_mayorista, costo_unitario = p_costo_unitario,
        unidad_venta = p_unidad_venta, activo = COALESCE(p_activo, true),
        observaciones = NULLIF(btrim(p_observaciones), '')
    WHERE id = p_diseno_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'El diseño no existe.'; END IF;
  END IF;

  DELETE FROM public.diseno_extras WHERE diseno_id = v_id;
  INSERT INTO public.diseno_extras(diseno_id, extra_id)
  SELECT v_id, value::UUID
  FROM jsonb_array_elements_text(p_extra_ids)
  WHERE EXISTS (SELECT 1 FROM public.extras e WHERE e.id = value::UUID AND e.activo);
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.guardar_diseno(UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT, UUID, NUMERIC, BOOLEAN, TEXT, JSONB, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.guardar_producto(UUID, TEXT, TEXT, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, BOOLEAN, UUID, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.guardar_producto(
  p_producto_id UUID DEFAULT NULL,
  p_sku TEXT DEFAULT NULL,
  p_nombre TEXT DEFAULT NULL,
  p_descripcion TEXT DEFAULT NULL,
  p_categoria_id UUID DEFAULT NULL,
  p_precio_base NUMERIC DEFAULT 0,
  p_precio_mayorista NUMERIC DEFAULT 0,
  p_costo_unitario NUMERIC DEFAULT 0,
  p_activo BOOLEAN DEFAULT true,
  p_admin_id UUID DEFAULT auth.uid(),
  p_unidad_venta TEXT DEFAULT 'unidad',
  p_archivo_id UUID DEFAULT NULL,
  p_diseno_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  PERFORM public.altix_require_admin(p_admin_id);
  IF NULLIF(btrim(COALESCE(p_sku, '')), '') IS NULL OR NULLIF(btrim(COALESCE(p_nombre, '')), '') IS NULL THEN
    RAISE EXCEPTION 'SKU y nombre son obligatorios.';
  END IF;
  IF p_unidad_venta NOT IN ('unidad', 'vara', 'metro', 'yarda', 'docena', 'paquete', 'rollo') THEN
    RAISE EXCEPTION 'La unidad de venta no está soportada.';
  END IF;
  IF COALESCE(p_precio_base, -1) < 0 OR COALESCE(p_precio_mayorista, -1) < 0 OR COALESCE(p_costo_unitario, -1) < 0 THEN
    RAISE EXCEPTION 'Los precios y el costo no pueden ser negativos.';
  END IF;
  IF p_diseno_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.disenos WHERE id = p_diseno_id AND activo) THEN
    RAISE EXCEPTION 'El diseño seleccionado no existe o está inactivo.';
  END IF;
  IF p_archivo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.archivos WHERE id = p_archivo_id) THEN
    RAISE EXCEPTION 'La imagen seleccionada no existe.';
  END IF;

  IF p_producto_id IS NULL THEN
    INSERT INTO public.productos(sku, nombre, descripcion, categoria_id, precio_base, precio_mayorista, activo, unidad_venta, archivo_id, diseno_id)
    VALUES (btrim(p_sku), btrim(p_nombre), NULLIF(btrim(p_descripcion), ''), p_categoria_id, p_precio_base, p_precio_mayorista, COALESCE(p_activo, true), p_unidad_venta, p_archivo_id, p_diseno_id)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.productos
    SET sku = btrim(p_sku), nombre = btrim(p_nombre), descripcion = NULLIF(btrim(p_descripcion), ''),
        categoria_id = p_categoria_id, precio_base = p_precio_base, precio_mayorista = p_precio_mayorista,
        activo = COALESCE(p_activo, true), unidad_venta = p_unidad_venta, archivo_id = p_archivo_id,
        diseno_id = p_diseno_id
    WHERE id = p_producto_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'El producto no existe.'; END IF;
  END IF;
  INSERT INTO public.productos_costos(producto_id, costo_unitario, actualizado_por, updated_at)
  VALUES (v_id, p_costo_unitario, p_admin_id, now())
  ON CONFLICT (producto_id) DO UPDATE SET costo_unitario = EXCLUDED.costo_unitario, actualizado_por = EXCLUDED.actualizado_por, updated_at = now();
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.guardar_producto(UUID, TEXT, TEXT, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, BOOLEAN, UUID, TEXT, UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.snapshot_unidad_venta_item()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.producto_id IS NOT NULL THEN
    SELECT unidad_venta INTO NEW.unidad_venta_snapshot FROM public.productos WHERE id = NEW.producto_id;
  ELSIF NEW.diseno_id IS NOT NULL THEN
    SELECT unidad_venta INTO NEW.unidad_venta_snapshot FROM public.disenos WHERE id = NEW.diseno_id;
  END IF;
  NEW.unidad_venta_snapshot := COALESCE(NEW.unidad_venta_snapshot, 'unidad');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_cantidad_unidad_producto()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_unidad TEXT;
BEGIN
  IF NEW.producto_id IS NOT NULL THEN
    SELECT unidad_venta INTO v_unidad FROM public.productos WHERE id = NEW.producto_id;
  ELSIF NEW.diseno_id IS NOT NULL THEN
    SELECT unidad_venta INTO v_unidad FROM public.disenos WHERE id = NEW.diseno_id;
  END IF;
  IF v_unidad IN ('metro', 'yarda', 'rollo', 'vara') AND NEW.cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero.';
  ELSIF v_unidad NOT IN ('metro', 'yarda', 'rollo', 'vara') AND NEW.cantidad <> trunc(NEW.cantidad) THEN
    RAISE EXCEPTION 'La cantidad debe ser entera para esta unidad.';
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.resolver_gasto(UUID, UUID, BOOLEAN, UUID);
CREATE OR REPLACE FUNCTION public.resolver_gasto(
  p_gasto_id UUID,
  p_aprobador_id UUID,
  p_aprobar BOOLEAN,
  p_sesion_caja_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_gasto RECORD;
  v_sesion RECORD;
  v_movimiento_id UUID;
BEGIN
  IF NOT public.altix_is_admin(p_aprobador_id) OR (auth.uid() IS NOT NULL AND auth.uid() <> p_aprobador_id) THEN
    RAISE EXCEPTION 'Solo un administrador autenticado puede resolver gastos.';
  END IF;
  SELECT * INTO v_gasto FROM public.gastos WHERE id = p_gasto_id FOR UPDATE;
  IF NOT FOUND OR v_gasto.estado <> 'pendiente' THEN RAISE EXCEPTION 'El gasto no está pendiente.'; END IF;
  IF p_aprobar AND p_sesion_caja_id IS NULL THEN
    RAISE EXCEPTION 'Selecciona una sesión de caja abierta para aplicar el egreso.';
  END IF;
  IF p_aprobar THEN
    SELECT * INTO v_sesion FROM public.sesiones_caja WHERE id = p_sesion_caja_id FOR UPDATE;
    IF NOT FOUND OR v_sesion.estado <> 'abierta' THEN RAISE EXCEPTION 'La sesión de caja de aplicación no está abierta.'; END IF;
  END IF;
  UPDATE public.gastos
  SET estado = CASE WHEN p_aprobar THEN 'aprobado' ELSE 'rechazado' END,
      autorizado_por = p_aprobador_id, autorizado_at = now(),
      sesion_caja_id = CASE WHEN p_aprobar THEN p_sesion_caja_id ELSE sesion_caja_id END
  WHERE id = p_gasto_id;
  IF p_aprobar THEN
    INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id, registrado_por)
    VALUES (p_sesion_caja_id, 'egreso', v_gasto.monto, 'Gasto aprobado: ' || v_gasto.descripcion, p_gasto_id, 'gasto-aprobacion:' || p_gasto_id::text, p_aprobador_id)
    ON CONFLICT (operation_id) DO UPDATE SET operation_id = EXCLUDED.operation_id
    RETURNING id INTO v_movimiento_id;
    UPDATE public.gastos SET movimiento_caja_id = v_movimiento_id WHERE id = p_gasto_id;
  END IF;
  RETURN p_gasto_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolver_gasto(UUID, UUID, BOOLEAN, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.registrar_deposito_efectivo(
  p_sesion_caja_id UUID,
  p_monto NUMERIC,
  p_comprobante_ref TEXT,
  p_banco_destino TEXT,
  p_concepto TEXT,
  p_registrado_por UUID,
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_sesion RECORD;
  v_existing RECORD;
  v_esperado NUMERIC(12,2);
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_registrado_por THEN
    RAISE EXCEPTION 'El usuario autenticado no coincide con el responsable informado.';
  END IF;
  IF p_monto IS NULL OR p_monto <= 0 OR NULLIF(btrim(COALESCE(p_concepto, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Monto y concepto son obligatorios.';
  END IF;
  SELECT * INTO v_sesion
  FROM public.sesiones_caja
  WHERE id = p_sesion_caja_id AND estado = 'abierta'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No hay una caja abierta para registrar el depósito.'; END IF;
  IF public.altix_is_admin(p_registrado_por) THEN
    NULL;
  ELSE
    PERFORM public.altix_require_actor(p_registrado_por, v_sesion.sucursal_id);
    IF v_sesion.usuario_id <> p_registrado_por THEN
      RAISE EXCEPTION 'Solo puedes depositar sobre tu propia caja abierta.';
    END IF;
  END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.movimientos_caja WHERE operation_id = p_operation_id;
    IF FOUND THEN
      IF v_existing.sesion_caja_id <> p_sesion_caja_id OR v_existing.monto <> p_monto
         OR v_existing.concepto <> btrim(p_concepto) OR v_existing.subtipo <> 'deposito' THEN
        RAISE EXCEPTION 'El operation_id del depósito ya fue usado con otro payload.';
      END IF;
      RETURN v_existing.id;
    END IF;
  END IF;
  SELECT v_sesion.monto_apertura + COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0)
  INTO v_esperado
  FROM public.movimientos_caja
  WHERE sesion_caja_id = p_sesion_caja_id;
  IF v_esperado < p_monto THEN
    RAISE EXCEPTION 'El depósito supera el efectivo disponible esperado en caja.';
  END IF;
  INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, subtipo, monto, concepto, comprobante_ref, banco_destino, registrado_por, operation_id)
  VALUES (p_sesion_caja_id, 'egreso', 'deposito', p_monto, btrim(p_concepto), NULLIF(btrim(p_comprobante_ref), ''), NULLIF(btrim(p_banco_destino), ''), p_registrado_por, p_operation_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_deposito_efectivo(UUID, NUMERIC, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;
