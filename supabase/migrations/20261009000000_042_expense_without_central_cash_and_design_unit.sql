-- 042: gastos administrativos sin caja central y unidad de diseño.
-- El producto vinculado sigue siendo la autoridad de inventario/venta.

DROP FUNCTION IF EXISTS public.registrar_gasto(UUID, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT, TEXT, UUID);
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
  v_existing RECORD;
  v_imputada UUID := COALESCE(p_sucursal_imputada_id, p_sucursal_id);
BEGIN
  PERFORM public.altix_require_actor(p_registrado_por, p_sucursal_id);
  IF p_monto IS NULL OR p_monto <= 0 OR length(btrim(COALESCE(p_categoria, ''))) = 0 OR length(btrim(COALESCE(p_descripcion, ''))) = 0 THEN
    RAISE EXCEPTION 'Categoría, descripción y monto son obligatorios.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sucursales WHERE id = p_sucursal_id AND activa)
     OR NOT EXISTS (SELECT 1 FROM public.sucursales WHERE id = v_imputada AND activa) THEN
    RAISE EXCEPTION 'El origen o la sucursal imputada no existe o está inactiva.';
  END IF;
  IF p_sesion_caja_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sesiones_caja WHERE id = p_sesion_caja_id AND sucursal_id = p_sucursal_id AND estado = 'abierta'
  ) THEN
    RAISE EXCEPTION 'La sesión de caja de origen no existe o no está abierta.';
  END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.gastos WHERE operation_id = p_operation_id;
    IF FOUND THEN
      IF v_existing.sucursal_id <> p_sucursal_id OR v_existing.sucursal_imputada_id <> v_imputada
         OR v_existing.sesion_caja_id IS DISTINCT FROM p_sesion_caja_id OR v_existing.monto <> p_monto
         OR v_existing.descripcion IS DISTINCT FROM btrim(p_descripcion) THEN
        RAISE EXCEPTION 'El operation_id del gasto ya fue usado con otro payload.';
      END IF;
      RETURN v_existing.id;
    END IF;
  END IF;
  INSERT INTO public.gastos (sesion_caja_id, sucursal_id, sucursal_imputada_id, categoria, monto, descripcion, comprobante_url, registrado_por, observacion, estado, operation_id)
  VALUES (p_sesion_caja_id, p_sucursal_id, v_imputada, btrim(p_categoria), p_monto, btrim(p_descripcion), NULLIF(btrim(p_comprobante_url), ''), p_registrado_por, NULLIF(btrim(p_observacion), ''), 'pendiente', p_operation_id)
  RETURNING id INTO v_gasto_id;
  RETURN v_gasto_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_gasto(UUID, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT, TEXT, UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.resolver_gasto(UUID, UUID, BOOLEAN);
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
  IF p_sesion_caja_id IS NOT NULL THEN
    SELECT * INTO v_sesion FROM public.sesiones_caja WHERE id = p_sesion_caja_id FOR UPDATE;
    IF NOT FOUND OR v_sesion.estado <> 'abierta' THEN RAISE EXCEPTION 'La sesión de caja de aplicación no está abierta.'; END IF;
  END IF;
  UPDATE public.gastos
  SET estado = CASE WHEN p_aprobar THEN 'aprobado' ELSE 'rechazado' END,
      autorizado_por = p_aprobador_id, autorizado_at = now(),
      sesion_caja_id = COALESCE(p_sesion_caja_id, sesion_caja_id)
  WHERE id = p_gasto_id;
  IF p_aprobar AND p_sesion_caja_id IS NOT NULL AND v_gasto.movimiento_caja_id IS NULL THEN
    INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id)
    VALUES (p_sesion_caja_id, 'egreso', v_gasto.monto, 'Gasto aprobado: ' || v_gasto.descripcion, p_gasto_id, 'gasto-aprobacion:' || p_gasto_id::text)
    RETURNING id INTO v_movimiento_id;
    UPDATE public.gastos SET movimiento_caja_id = v_movimiento_id WHERE id = p_gasto_id;
  END IF;
  RETURN p_gasto_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolver_gasto(UUID, UUID, BOOLEAN, UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.guardar_diseno(UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT, UUID, NUMERIC, BOOLEAN, TEXT, JSONB, UUID, NUMERIC, NUMERIC, NUMERIC);
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
  p_producto_id UUID DEFAULT NULL,
  p_precio_base NUMERIC DEFAULT 0,
  p_precio_mayorista NUMERIC DEFAULT 0,
  p_costo_unitario NUMERIC DEFAULT 0,
  p_unidad_venta TEXT DEFAULT 'unidad'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  PERFORM public.altix_require_admin(auth.uid());
  IF NULLIF(btrim(COALESCE(p_nombre, '')), '') IS NULL THEN RAISE EXCEPTION 'El nombre del diseño es obligatorio.'; END IF;
  IF p_precio IS NULL OR p_precio < 0 OR p_precio_base IS NULL OR p_precio_base < 0 OR p_precio_mayorista IS NULL OR p_precio_mayorista < 0 OR p_costo_unitario IS NULL OR p_costo_unitario < 0 OR jsonb_typeof(p_extra_ids) <> 'array' THEN
    RAISE EXCEPTION 'Los precios, costo y extras del diseño no son válidos.';
  END IF;
  IF p_unidad_venta NOT IN ('unidad', 'vara', 'metro', 'yarda', 'docena', 'paquete', 'rollo') THEN RAISE EXCEPTION 'La unidad de venta no está soportada.'; END IF;
  IF p_producto_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.productos WHERE id = p_producto_id AND activo) THEN RAISE EXCEPTION 'El SKU vinculado no existe o está inactivo.'; END IF;
  IF p_diseno_id IS NULL THEN
    INSERT INTO public.disenos(sku,nombre,descripcion,categoria_id,cliente_id,archivo_url,archivo_id,precio,activo,observaciones,producto_id)
    VALUES(NULLIF(btrim(p_sku),''),btrim(p_nombre),NULLIF(btrim(p_descripcion),''),p_categoria_id,p_cliente_id,p_archivo_url,p_archivo_id,p_precio,COALESCE(p_activo,true),NULLIF(btrim(p_observaciones),''),p_producto_id) RETURNING id INTO v_id;
  ELSE
    UPDATE public.disenos SET sku=NULLIF(btrim(p_sku),''), nombre=btrim(p_nombre), descripcion=NULLIF(btrim(p_descripcion),''), categoria_id=p_categoria_id, cliente_id=p_cliente_id, archivo_url=p_archivo_url, archivo_id=p_archivo_id, precio=p_precio, activo=COALESCE(p_activo,true), observaciones=NULLIF(btrim(p_observaciones),''), producto_id=p_producto_id WHERE id=p_diseno_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'El diseño no existe.'; END IF;
  END IF;
  UPDATE public.productos SET precio_base=p_precio_base, precio_mayorista=p_precio_mayorista, unidad_venta=p_unidad_venta WHERE id=p_producto_id;
  INSERT INTO public.productos_costos(producto_id,costo_unitario,actualizado_por,updated_at) VALUES(p_producto_id,p_costo_unitario,auth.uid(),now()) ON CONFLICT (producto_id) DO UPDATE SET costo_unitario=EXCLUDED.costo_unitario, actualizado_por=EXCLUDED.actualizado_por, updated_at=now();
  DELETE FROM public.diseno_extras WHERE diseno_id=v_id;
  INSERT INTO public.diseno_extras(diseno_id,extra_id) SELECT v_id,value::UUID FROM jsonb_array_elements_text(p_extra_ids) WHERE EXISTS (SELECT 1 FROM public.extras e WHERE e.id=value::UUID AND e.activo);
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.guardar_diseno(UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT, UUID, NUMERIC, BOOLEAN, TEXT, JSONB, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated;
