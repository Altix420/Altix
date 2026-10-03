-- Production initialization contracts. Never depend on seed data for these operations.

CREATE OR REPLACE FUNCTION public.guardar_sucursal(
  p_sucursal_id UUID DEFAULT NULL,
  p_nombre TEXT DEFAULT NULL,
  p_activa BOOLEAN DEFAULT true,
  p_admin_id UUID DEFAULT auth.uid()
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM public.altix_require_admin(p_admin_id);
  IF length(btrim(COALESCE(p_nombre, ''))) = 0 THEN
    RAISE EXCEPTION 'El nombre de la sucursal es obligatorio.';
  END IF;
  IF p_sucursal_id IS NULL THEN
    INSERT INTO public.sucursales (nombre, activa)
    VALUES (btrim(p_nombre), COALESCE(p_activa, true))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.sucursales
    SET nombre = btrim(p_nombre), activa = COALESCE(p_activa, true)
    WHERE id = p_sucursal_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'La sucursal no existe.';
    END IF;
  END IF;
  RETURN v_id;
END;
$$;

-- The first entry for a product must record a zero previous balance in Kardex.
CREATE OR REPLACE FUNCTION public.registrar_entrada_inventario(
  p_sucursal_id UUID,
  p_producto_id UUID,
  p_cantidad NUMERIC,
  p_motivo TEXT,
  p_usuario_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stock NUMERIC;
BEGIN
  PERFORM public.altix_require_actor(p_usuario_id, p_sucursal_id);
  IF p_cantidad IS NULL OR p_cantidad <= 0 OR length(btrim(COALESCE(p_motivo, ''))) = 0 THEN
    RAISE EXCEPTION 'Cantidad y motivo son obligatorios.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.productos WHERE id = p_producto_id AND activo) THEN
    RAISE EXCEPTION 'El producto no existe o está inactivo.';
  END IF;
  SELECT stock INTO v_stock
  FROM public.inventarios
  WHERE sucursal_id = p_sucursal_id AND producto_id = p_producto_id
  FOR UPDATE;
  IF NOT FOUND THEN
    v_stock := 0;
    INSERT INTO public.inventarios (sucursal_id, producto_id, stock)
    VALUES (p_sucursal_id, p_producto_id, p_cantidad);
  ELSE
    UPDATE public.inventarios
    SET stock = stock + p_cantidad
    WHERE sucursal_id = p_sucursal_id AND producto_id = p_producto_id;
  END IF;
  INSERT INTO public.movimientos_inventario (sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
  VALUES (p_sucursal_id, p_producto_id, 'entrada', p_cantidad, v_stock, v_stock + p_cantidad, btrim(p_motivo), p_usuario_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.configurar_vendedor(
  p_user_id UUID,
  p_nombre_completo TEXT DEFAULT NULL,
  p_activo BOOLEAN DEFAULT true,
  p_sucursal_id UUID DEFAULT NULL,
  p_admin_id UUID DEFAULT auth.uid()
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  PERFORM public.altix_require_admin(p_admin_id);
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El usuario Auth no tiene un perfil creado.';
  END IF;
  IF length(btrim(COALESCE(p_nombre_completo, v_profile.nombre_completo, ''))) = 0 THEN
    RAISE EXCEPTION 'El nombre del vendedor es obligatorio.';
  END IF;
  IF COALESCE(p_activo, true) AND p_sucursal_id IS NULL THEN
    RAISE EXCEPTION 'Un vendedor activo debe tener una sucursal asignada.';
  END IF;
  IF p_sucursal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sucursales WHERE id = p_sucursal_id AND activa
  ) THEN
    RAISE EXCEPTION 'La sucursal no existe o está inactiva.';
  END IF;
  UPDATE public.profiles
  SET nombre_completo = btrim(COALESCE(p_nombre_completo, v_profile.nombre_completo)),
      role = 'vendedor'::public.user_role,
      activo = COALESCE(p_activo, true)
  WHERE id = p_user_id;
  DELETE FROM public.usuario_sucursal WHERE user_id = p_user_id;
  IF p_sucursal_id IS NOT NULL THEN
    INSERT INTO public.usuario_sucursal (user_id, sucursal_id)
    VALUES (p_user_id, p_sucursal_id);
  END IF;
  RETURN p_user_id;
END;
$$;

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
  p_admin_id UUID DEFAULT auth.uid()
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM public.altix_require_admin(p_admin_id);
  IF length(btrim(COALESCE(p_sku, ''))) = 0 OR length(btrim(COALESCE(p_nombre, ''))) = 0 THEN
    RAISE EXCEPTION 'Código y nombre del producto son obligatorios.';
  END IF;
  IF COALESCE(p_precio_base, -1) < 0 OR COALESCE(p_precio_mayorista, -1) < 0 OR COALESCE(p_costo_unitario, -1) < 0 THEN
    RAISE EXCEPTION 'Los precios y el costo no pueden ser negativos.';
  END IF;
  IF p_producto_id IS NULL THEN
    INSERT INTO public.productos (categoria_id, sku, nombre, descripcion, precio_base, precio_mayorista, activo)
    VALUES (p_categoria_id, btrim(p_sku), btrim(p_nombre), NULLIF(btrim(p_descripcion), ''), p_precio_base, p_precio_mayorista, COALESCE(p_activo, true))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.productos
    SET categoria_id = p_categoria_id, sku = btrim(p_sku), nombre = btrim(p_nombre),
        descripcion = NULLIF(btrim(p_descripcion), ''), precio_base = p_precio_base,
        precio_mayorista = p_precio_mayorista, activo = COALESCE(p_activo, true)
    WHERE id = p_producto_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'El producto no existe.'; END IF;
  END IF;
  INSERT INTO public.productos_costos (producto_id, costo_unitario, actualizado_por, updated_at)
  VALUES (v_id, p_costo_unitario, p_admin_id, now())
  ON CONFLICT (producto_id) DO UPDATE SET costo_unitario = EXCLUDED.costo_unitario, actualizado_por = EXCLUDED.actualizado_por, updated_at = now();
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.guardar_sucursal(UUID, TEXT, BOOLEAN, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_sucursal(UUID, TEXT, BOOLEAN, UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.configurar_vendedor(UUID, TEXT, BOOLEAN, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.configurar_vendedor(UUID, TEXT, BOOLEAN, UUID, UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.guardar_producto(UUID, TEXT, TEXT, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, BOOLEAN, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_producto(UUID, TEXT, TEXT, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, BOOLEAN, UUID) TO authenticated;
