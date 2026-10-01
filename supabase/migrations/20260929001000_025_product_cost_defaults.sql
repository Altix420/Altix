-- Every product must have an administrative cost snapshot, even when it is
-- inserted after the catalog migration has already run.

INSERT INTO public.productos_costos (producto_id)
SELECT id FROM public.productos
ON CONFLICT (producto_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_producto_costo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.productos_costos (producto_id)
  VALUES (NEW.id)
  ON CONFLICT (producto_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_producto_costo ON public.productos;
CREATE TRIGGER trg_ensure_producto_costo
AFTER INSERT ON public.productos
FOR EACH ROW EXECUTE FUNCTION public.ensure_producto_costo();
