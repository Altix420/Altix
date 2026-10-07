-- 039: contratos operativos solicitados por el cliente.
-- Conserva unidades históricas y separa caja origen de sucursal imputada.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'productos_unidad_venta_check'
      AND conrelid = 'public.productos'::regclass
  ) THEN
    ALTER TABLE public.productos DROP CONSTRAINT productos_unidad_venta_check;
  END IF;
  ALTER TABLE public.productos
    ADD CONSTRAINT productos_unidad_venta_check
    CHECK (unidad_venta IN ('unidad', 'vara', 'metro', 'yarda', 'docena', 'paquete', 'rollo'));
END
$$;

CREATE OR REPLACE FUNCTION public.validar_cantidad_unidad_producto()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_producto_id UUID := NEW.producto_id;
  v_unidad TEXT;
BEGIN
  IF v_producto_id IS NULL AND NEW.diseno_id IS NOT NULL THEN
    SELECT producto_id INTO v_producto_id FROM public.disenos WHERE id = NEW.diseno_id;
  END IF;
  SELECT unidad_venta INTO v_unidad FROM public.productos WHERE id = v_producto_id;
  IF COALESCE(NEW.cantidad, 0) <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero.';
  END IF;
  IF v_unidad = 'vara' AND mod(NEW.cantidad, 0.25) <> 0 THEN
    RAISE EXCEPTION 'La cantidad en varas debe usar incrementos de 0.25.';
  END IF;
  IF v_unidad IN ('unidad', 'docena', 'paquete', 'rollo') AND NEW.cantidad <> trunc(NEW.cantidad) THEN
    RAISE EXCEPTION 'La cantidad para esta unidad debe ser entera.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_cotizacion_unit ON public.cotizacion_items;
CREATE TRIGGER trg_validate_cotizacion_unit BEFORE INSERT OR UPDATE ON public.cotizacion_items
FOR EACH ROW EXECUTE FUNCTION public.validar_cantidad_unidad_producto();
DROP TRIGGER IF EXISTS trg_validate_pedido_unit ON public.pedido_items;
CREATE TRIGGER trg_validate_pedido_unit BEFORE INSERT OR UPDATE ON public.pedido_items
FOR EACH ROW EXECUTE FUNCTION public.validar_cantidad_unidad_producto();
DROP TRIGGER IF EXISTS trg_validate_venta_unit ON public.venta_items;
CREATE TRIGGER trg_validate_venta_unit BEFORE INSERT OR UPDATE ON public.venta_items
FOR EACH ROW EXECUTE FUNCTION public.validar_cantidad_unidad_producto();

ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS sucursal_imputada_id UUID REFERENCES public.sucursales(id) ON DELETE RESTRICT;
UPDATE public.gastos SET sucursal_imputada_id = sucursal_id WHERE sucursal_imputada_id IS NULL;
ALTER TABLE public.gastos ALTER COLUMN sucursal_imputada_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gastos_imputada_fecha ON public.gastos(sucursal_imputada_id, created_at DESC);

DROP POLICY IF EXISTS "Lectura de gastos por sucursal" ON public.gastos;
CREATE POLICY "Lectura de gastos por sucursal" ON public.gastos
  FOR SELECT TO authenticated USING (
    public.altix_can_access_branch(sucursal_id)
    OR public.altix_can_access_branch(sucursal_imputada_id)
  );

DROP FUNCTION IF EXISTS public.registrar_gasto(UUID, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.registrar_gasto(
  p_sesion_caja_id UUID,
  p_sucursal_id UUID,
  p_categoria TEXT,
  p_monto NUMERIC,
  p_descripcion TEXT,
  p_comprobante_url TEXT,
  p_registrado_por UUID,
  p_observacion TEXT DEFAULT NULL,
  p_operation_id TEXT DEFAULT NULL,
  p_sucursal_imputada_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_gasto_id UUID;
  v_estado TEXT;
  v_movimiento_id UUID;
  v_existing RECORD;
  v_imputada UUID := COALESCE(p_sucursal_imputada_id, p_sucursal_id);
BEGIN
  PERFORM public.altix_require_actor(p_registrado_por, p_sucursal_id);
  IF p_monto IS NULL OR p_monto <= 0 OR length(btrim(COALESCE(p_categoria, ''))) = 0 OR length(btrim(COALESCE(p_descripcion, ''))) = 0 THEN
    RAISE EXCEPTION 'Categoría, descripción y monto son obligatorios.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sucursales WHERE id = v_imputada AND activa) THEN
    RAISE EXCEPTION 'La sucursal imputada no existe o está inactiva.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sesiones_caja WHERE id = p_sesion_caja_id AND sucursal_id = p_sucursal_id AND estado = 'abierta') THEN
    RAISE EXCEPTION 'La sesión de caja de origen no existe o no está abierta.';
  END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.gastos WHERE operation_id = p_operation_id;
    IF FOUND THEN
      IF v_existing.sucursal_id <> p_sucursal_id OR v_existing.sucursal_imputada_id <> v_imputada
         OR v_existing.sesion_caja_id <> p_sesion_caja_id OR v_existing.monto <> p_monto
         OR v_existing.descripcion IS DISTINCT FROM btrim(p_descripcion) THEN
        RAISE EXCEPTION 'El operation_id del gasto ya fue usado con otro payload.';
      END IF;
      RETURN v_existing.id;
    END IF;
  END IF;
  v_estado := CASE WHEN public.altix_is_admin(p_registrado_por) THEN 'aprobado' ELSE 'pendiente' END;
  INSERT INTO public.gastos (sesion_caja_id, sucursal_id, sucursal_imputada_id, categoria, monto, descripcion, comprobante_url, registrado_por, observacion, estado, autorizado_por, autorizado_at, operation_id)
  VALUES (p_sesion_caja_id, p_sucursal_id, v_imputada, btrim(p_categoria), p_monto, btrim(p_descripcion), NULLIF(btrim(p_comprobante_url), ''), p_registrado_por, NULLIF(btrim(p_observacion), ''), v_estado, CASE WHEN v_estado = 'aprobado' THEN p_registrado_por END, CASE WHEN v_estado = 'aprobado' THEN now() END, p_operation_id)
  RETURNING id INTO v_gasto_id;
  -- Una solicitud pendiente no representa una salida aplicada. El movimiento
  -- se crea al aprobarla; un desembolso previo queda trazable por separado.
  IF v_estado = 'aprobado' THEN
    INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id)
    VALUES (p_sesion_caja_id, 'egreso', p_monto, 'Gasto: ' || btrim(p_descripcion) || ' · ' || v_imputada::text, v_gasto_id, COALESCE(p_operation_id, 'gasto:' || v_gasto_id::text))
    RETURNING id INTO v_movimiento_id;
    UPDATE public.gastos SET movimiento_caja_id = v_movimiento_id WHERE id = v_gasto_id;
  END IF;
  RETURN v_gasto_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_gasto(UUID, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT, TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolver_gasto(
  p_gasto_id UUID,
  p_aprobador_id UUID,
  p_aprobar BOOLEAN
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_gasto RECORD;
  v_sesion RECORD;
  v_movimiento_id UUID;
  v_reintegro_id UUID;
BEGIN
  IF NOT public.altix_is_admin(p_aprobador_id) OR (auth.uid() IS NOT NULL AND auth.uid() <> p_aprobador_id) THEN
    RAISE EXCEPTION 'Solo un administrador autenticado puede resolver gastos.';
  END IF;
  SELECT * INTO v_gasto FROM public.gastos WHERE id = p_gasto_id FOR UPDATE;
  IF NOT FOUND OR v_gasto.estado <> 'pendiente' THEN RAISE EXCEPTION 'El gasto no está pendiente.'; END IF;
  SELECT * INTO v_sesion FROM public.sesiones_caja WHERE id = v_gasto.sesion_caja_id FOR UPDATE;
  IF NOT FOUND OR v_sesion.estado <> 'abierta' THEN RAISE EXCEPTION 'La sesión de caja del gasto ya está cerrada.'; END IF;

  UPDATE public.gastos
  SET estado = CASE WHEN p_aprobar THEN 'aprobado' ELSE 'rechazado' END,
      autorizado_por = p_aprobador_id, autorizado_at = now()
  WHERE id = p_gasto_id;

  IF p_aprobar AND v_gasto.movimiento_caja_id IS NULL THEN
    INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id)
    VALUES (v_gasto.sesion_caja_id, 'egreso', v_gasto.monto, 'Gasto aprobado: ' || v_gasto.descripcion, p_gasto_id, 'gasto-aprobacion:' || p_gasto_id::text)
    RETURNING id INTO v_movimiento_id;
    UPDATE public.gastos SET movimiento_caja_id = v_movimiento_id WHERE id = p_gasto_id;
  ELSIF NOT p_aprobar AND v_gasto.movimiento_caja_id IS NOT NULL AND v_gasto.movimiento_reintegro_id IS NULL THEN
    INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id)
    VALUES (v_gasto.sesion_caja_id, 'ingreso', v_gasto.monto, 'Reintegro de gasto rechazado: ' || v_gasto.descripcion, p_gasto_id, 'gasto-reintegro:' || p_gasto_id::text)
    RETURNING id INTO v_reintegro_id;
    UPDATE public.gastos SET movimiento_reintegro_id = v_reintegro_id WHERE id = p_gasto_id;
  END IF;
  RETURN p_gasto_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolver_gasto(UUID, UUID, BOOLEAN) TO authenticated;

-- Reopen the product RPC with the new operational unit while preserving its
-- existing cost snapshot and image behavior.
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
  p_archivo_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
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
  IF p_producto_id IS NULL THEN
    INSERT INTO public.productos(sku, nombre, descripcion, categoria_id, precio_base, precio_mayorista, activo, unidad_venta, archivo_id)
    VALUES (btrim(p_sku), btrim(p_nombre), NULLIF(btrim(p_descripcion), ''), p_categoria_id, p_precio_base, p_precio_mayorista, COALESCE(p_activo, true), p_unidad_venta, p_archivo_id)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.productos
    SET sku = btrim(p_sku), nombre = btrim(p_nombre), descripcion = NULLIF(btrim(p_descripcion), ''), categoria_id = p_categoria_id,
        precio_base = p_precio_base, precio_mayorista = p_precio_mayorista, activo = COALESCE(p_activo, true),
        unidad_venta = p_unidad_venta, archivo_id = COALESCE(p_archivo_id, archivo_id)
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

GRANT EXECUTE ON FUNCTION public.guardar_producto(UUID, TEXT, TEXT, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, BOOLEAN, UUID, TEXT, UUID) TO authenticated;
