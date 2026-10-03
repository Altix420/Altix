-- Pasada 036: unidad de venta y cantidades fraccionarias.
-- No modifica migraciones anteriores ni crea inventario paralelo.

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS unidad_venta TEXT NOT NULL DEFAULT 'unidad';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'productos_unidad_venta_check'
      AND conrelid = 'public.productos'::regclass
  ) THEN
    ALTER TABLE public.productos
      ADD CONSTRAINT productos_unidad_venta_check
      CHECK (unidad_venta IN ('unidad', 'metro', 'yarda', 'docena', 'paquete', 'rollo'));
  END IF;
END
$$;

-- Las cantidades operativas admiten hasta tres decimales; los precios siguen
-- usando la precision monetaria existente.
ALTER TABLE public.cotizacion_items ALTER COLUMN cantidad TYPE NUMERIC(12,3) USING cantidad;
ALTER TABLE public.pedido_items ALTER COLUMN cantidad TYPE NUMERIC(12,3) USING cantidad;
ALTER TABLE public.venta_items ALTER COLUMN cantidad TYPE NUMERIC(12,3) USING cantidad;
ALTER TABLE public.inventarios
  ALTER COLUMN stock TYPE NUMERIC(12,3) USING stock,
  ALTER COLUMN stock_minimo TYPE NUMERIC(12,3) USING stock_minimo,
  ALTER COLUMN stock_maximo TYPE NUMERIC(12,3) USING stock_maximo;
ALTER TABLE public.movimientos_inventario
  ALTER COLUMN cantidad TYPE NUMERIC(12,3) USING cantidad,
  ALTER COLUMN stock_anterior TYPE NUMERIC(12,3) USING stock_anterior,
  ALTER COLUMN stock_nuevo TYPE NUMERIC(12,3) USING stock_nuevo;
ALTER TABLE public.traslado_items ALTER COLUMN cantidad TYPE NUMERIC(12,3) USING cantidad;
ALTER TABLE public.defectuosos ALTER COLUMN cantidad TYPE NUMERIC(12,3) USING cantidad;
ALTER TABLE public.conteos_detalle DROP COLUMN IF EXISTS diferencia;
ALTER TABLE public.conteos_detalle
  ALTER COLUMN stock_sistema TYPE NUMERIC(12,3) USING stock_sistema,
  ALTER COLUMN stock_fisico TYPE NUMERIC(12,3) USING stock_fisico;
ALTER TABLE public.conteos_detalle
  ADD COLUMN diferencia NUMERIC(12,3)
  GENERATED ALWAYS AS (stock_fisico - stock_sistema) STORED;
ALTER TABLE public.solicitudes_ajuste_inventario DROP COLUMN IF EXISTS delta;
ALTER TABLE public.solicitudes_ajuste_inventario
  ALTER COLUMN stock_anterior TYPE NUMERIC(12,3) USING stock_anterior,
  ALTER COLUMN stock_nuevo TYPE NUMERIC(12,3) USING stock_nuevo;
ALTER TABLE public.solicitudes_ajuste_inventario
  ADD COLUMN delta NUMERIC(12,3)
  GENERATED ALWAYS AS (stock_nuevo - stock_anterior) STORED;
ALTER TABLE public.devolucion_items ALTER COLUMN cantidad TYPE NUMERIC(12,3) USING cantidad;
ALTER TABLE public.venta_costos ALTER COLUMN cantidad TYPE NUMERIC(12,3) USING cantidad;

ALTER TABLE public.cotizacion_items
  ADD COLUMN IF NOT EXISTS unidad_venta_snapshot TEXT NOT NULL DEFAULT 'unidad';
ALTER TABLE public.pedido_items
  ADD COLUMN IF NOT EXISTS unidad_venta_snapshot TEXT NOT NULL DEFAULT 'unidad';
ALTER TABLE public.venta_items
  ADD COLUMN IF NOT EXISTS unidad_venta_snapshot TEXT NOT NULL DEFAULT 'unidad';

CREATE OR REPLACE FUNCTION public.snapshot_unidad_venta_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_producto_id UUID;
BEGIN
  v_producto_id := NEW.producto_id;
  IF v_producto_id IS NULL AND NEW.diseno_id IS NOT NULL THEN
    SELECT producto_id INTO v_producto_id FROM public.disenos WHERE id = NEW.diseno_id;
  END IF;
  SELECT unidad_venta INTO NEW.unidad_venta_snapshot
  FROM public.productos WHERE id = v_producto_id;
  NEW.unidad_venta_snapshot := COALESCE(NEW.unidad_venta_snapshot, 'unidad');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_cotizacion_item_unit ON public.cotizacion_items;
CREATE TRIGGER trg_snapshot_cotizacion_item_unit
BEFORE INSERT ON public.cotizacion_items
FOR EACH ROW EXECUTE FUNCTION public.snapshot_unidad_venta_item();
DROP TRIGGER IF EXISTS trg_snapshot_pedido_item_unit ON public.pedido_items;
CREATE TRIGGER trg_snapshot_pedido_item_unit
BEFORE INSERT ON public.pedido_items
FOR EACH ROW EXECUTE FUNCTION public.snapshot_unidad_venta_item();
DROP TRIGGER IF EXISTS trg_snapshot_venta_item_unit ON public.venta_items;
CREATE TRIGGER trg_snapshot_venta_item_unit
BEFORE INSERT ON public.venta_items
FOR EACH ROW EXECUTE FUNCTION public.snapshot_unidad_venta_item();

DROP FUNCTION IF EXISTS public.guardar_producto(UUID, TEXT, TEXT, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, BOOLEAN, UUID);
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
  p_unidad_venta TEXT DEFAULT 'unidad'
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
  IF p_producto_id IS NULL THEN
    INSERT INTO public.productos(sku, nombre, descripcion, categoria_id, precio_base, precio_mayorista, activo, unidad_venta)
    VALUES (btrim(p_sku), btrim(p_nombre), NULLIF(btrim(p_descripcion), ''), p_categoria_id, p_precio_base, p_precio_mayorista, COALESCE(p_activo, true), p_unidad_venta)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.productos
    SET sku = btrim(p_sku), nombre = btrim(p_nombre), descripcion = NULLIF(btrim(p_descripcion), ''),
        categoria_id = p_categoria_id, precio_base = p_precio_base, precio_mayorista = p_precio_mayorista,
        activo = COALESCE(p_activo, true), unidad_venta = p_unidad_venta
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

GRANT EXECUTE ON FUNCTION public.guardar_producto(UUID, TEXT, TEXT, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, BOOLEAN, UUID, TEXT) TO authenticated;
