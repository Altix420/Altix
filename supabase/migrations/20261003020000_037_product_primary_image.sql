-- 037: imagen principal del SKU vendible.
-- Solo se persiste la referencia a public.archivos; el binario permanece en R2.

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS archivo_id UUID REFERENCES public.archivos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_productos_archivo_id ON public.productos(archivo_id);

CREATE OR REPLACE FUNCTION public.registrar_archivo(
  p_path TEXT,
  p_nombre_original TEXT,
  p_mime_type TEXT,
  p_size_bytes BIGINT,
  p_bucket TEXT DEFAULT 'altix-dev'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM public.altix_require_admin(auth.uid());
  IF p_bucket NOT IN ('altix-dev', 'altix-prod') THEN
    RAISE EXCEPTION 'Bucket no autorizado.';
  END IF;
  IF p_path IS NULL OR p_path !~ '^(disenos|productos|lanzamientos|exports|auditoria|backups)/[A-Za-z0-9][A-Za-z0-9/_ .-]*$' OR p_path LIKE '%..%' THEN
    RAISE EXCEPTION 'Path de archivo invalido.';
  END IF;
  IF NULLIF(btrim(COALESCE(p_nombre_original, '')), '') IS NULL THEN
    RAISE EXCEPTION 'El nombre original es obligatorio.';
  END IF;
  IF lower(COALESCE(p_mime_type, '')) NOT IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv') THEN
    RAISE EXCEPTION 'Tipo de archivo no permitido.';
  END IF;
  IF p_size_bytes IS NULL OR p_size_bytes <= 0 OR p_size_bytes > 10485760 THEN
    RAISE EXCEPTION 'El tamaño del archivo no es valido.';
  END IF;
  INSERT INTO public.archivos(path, nombre_original, mime_type, size_bytes, bucket, created_by)
  VALUES (p_path, btrim(p_nombre_original), lower(p_mime_type), p_size_bytes, p_bucket, auth.uid())
  ON CONFLICT (path) DO UPDATE SET nombre_original = EXCLUDED.nombre_original, mime_type = EXCLUDED.mime_type,
    size_bytes = EXCLUDED.size_bytes, bucket = EXCLUDED.bucket, created_by = EXCLUDED.created_by
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

DROP FUNCTION IF EXISTS public.guardar_producto(UUID, TEXT, TEXT, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, BOOLEAN, UUID, TEXT);

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
  IF p_unidad_venta NOT IN ('unidad', 'metro', 'yarda', 'docena', 'paquete', 'rollo') THEN
    RAISE EXCEPTION 'La unidad de venta no esta soportada.';
  END IF;
  IF COALESCE(p_precio_base, -1) < 0 OR COALESCE(p_precio_mayorista, -1) < 0 OR COALESCE(p_costo_unitario, -1) < 0 THEN
    RAISE EXCEPTION 'Los precios y el costo no pueden ser negativos.';
  END IF;
  IF p_archivo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.archivos WHERE id = p_archivo_id) THEN
    RAISE EXCEPTION 'La imagen seleccionada no existe.';
  END IF;

  IF p_producto_id IS NULL THEN
    INSERT INTO public.productos(sku, nombre, descripcion, categoria_id, precio_base, precio_mayorista, activo, unidad_venta, archivo_id)
    VALUES (btrim(p_sku), btrim(p_nombre), NULLIF(btrim(p_descripcion), ''), p_categoria_id, p_precio_base, p_precio_mayorista, COALESCE(p_activo, true), p_unidad_venta, p_archivo_id)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.productos
    SET sku = btrim(p_sku), nombre = btrim(p_nombre), descripcion = NULLIF(btrim(p_descripcion), ''),
        categoria_id = p_categoria_id, precio_base = p_precio_base, precio_mayorista = p_precio_mayorista,
        activo = COALESCE(p_activo, true), unidad_venta = p_unidad_venta, archivo_id = p_archivo_id
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
