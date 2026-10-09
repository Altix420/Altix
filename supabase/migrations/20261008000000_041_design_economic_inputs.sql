-- A design keeps its commercial economics in the linked product. This extends
-- the existing atomic design RPC without duplicating price/cost columns.
DROP FUNCTION IF EXISTS public.guardar_diseno(UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT, UUID, NUMERIC, BOOLEAN, TEXT, JSONB, UUID);

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
  p_costo_unitario NUMERIC DEFAULT 0
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
  IF p_precio IS NULL OR p_precio < 0 OR p_precio_base IS NULL OR p_precio_base < 0
    OR p_precio_mayorista IS NULL OR p_precio_mayorista < 0
    OR p_costo_unitario IS NULL OR p_costo_unitario < 0
    OR jsonb_typeof(p_extra_ids) <> 'array' THEN
    RAISE EXCEPTION 'Los precios, costo y extras del diseño no son válidos.';
  END IF;
  IF p_producto_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.productos WHERE id = p_producto_id AND activo) THEN
    RAISE EXCEPTION 'El SKU vinculado no existe o está inactivo.';
  END IF;

  IF p_diseno_id IS NULL THEN
    INSERT INTO public.disenos(sku,nombre,descripcion,categoria_id,cliente_id,archivo_url,archivo_id,precio,activo,observaciones,producto_id)
    VALUES(NULLIF(btrim(p_sku),''),btrim(p_nombre),NULLIF(btrim(p_descripcion),''),p_categoria_id,p_cliente_id,p_archivo_url,p_archivo_id,p_precio,COALESCE(p_activo,true),NULLIF(btrim(p_observaciones),''),p_producto_id)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.disenos
    SET sku=NULLIF(btrim(p_sku),''), nombre=btrim(p_nombre), descripcion=NULLIF(btrim(p_descripcion),''),
        categoria_id=p_categoria_id, cliente_id=p_cliente_id, archivo_url=p_archivo_url, archivo_id=p_archivo_id,
        precio=p_precio, activo=COALESCE(p_activo,true), observaciones=NULLIF(btrim(p_observaciones),''), producto_id=p_producto_id
    WHERE id=p_diseno_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'El diseño no existe.'; END IF;
  END IF;

  UPDATE public.productos
  SET precio_base = p_precio_base, precio_mayorista = p_precio_mayorista
  WHERE id = p_producto_id;
  INSERT INTO public.productos_costos(producto_id, costo_unitario, actualizado_por, updated_at)
  VALUES (p_producto_id, p_costo_unitario, auth.uid(), now())
  ON CONFLICT (producto_id) DO UPDATE SET costo_unitario=EXCLUDED.costo_unitario, actualizado_por=EXCLUDED.actualizado_por, updated_at=now();

  DELETE FROM public.diseno_extras WHERE diseno_id=v_id;
  INSERT INTO public.diseno_extras(diseno_id,extra_id)
  SELECT v_id, value::UUID FROM jsonb_array_elements_text(p_extra_ids)
  WHERE EXISTS (SELECT 1 FROM public.extras e WHERE e.id=value::UUID AND e.activo);
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.guardar_diseno(UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT, UUID, NUMERIC, BOOLEAN, TEXT, JSONB, UUID, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
