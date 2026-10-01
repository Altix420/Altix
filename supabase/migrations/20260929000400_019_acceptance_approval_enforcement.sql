-- FULL V1: sucursal en auditoría y control server-side de descuentos.

ALTER TABLE public.bitacora_auditoria
  ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bitacora_auditoria_sucursal_fecha
  ON public.bitacora_auditoria(sucursal_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.audit_critical_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_old JSONB;
  v_new JSONB;
  v_branch UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_id := OLD.id;
    v_old := to_jsonb(OLD);
  ELSE
    v_id := NEW.id;
    v_new := to_jsonb(NEW);
    IF TG_OP = 'UPDATE' THEN v_old := to_jsonb(OLD); END IF;
  END IF;
  v_branch := NULLIF(COALESCE(v_new->>'sucursal_id', v_old->>'sucursal_id'), '')::UUID;
  INSERT INTO public.bitacora_auditoria(
    usuario_id, sucursal_id, accion, tabla_afectada, registro_id,
    datos_anteriores, datos_nuevos
  ) VALUES (
    auth.uid(), v_branch, TG_OP, TG_TABLE_NAME, v_id, v_old, v_new
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_branch_assignment_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old JSONB := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
  v_new JSONB := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END;
BEGIN
  INSERT INTO public.bitacora_auditoria(
    usuario_id, sucursal_id, accion, tabla_afectada, registro_id,
    datos_anteriores, datos_nuevos
  ) VALUES (
    auth.uid(),
    NULLIF(COALESCE(v_new->>'sucursal_id', v_old->>'sucursal_id'), '')::UUID,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NULLIF(COALESCE(v_new->>'user_id', v_old->>'user_id'), '')::UUID, gen_random_uuid()),
    v_old,
    v_new
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_usuario_sucursal ON public.usuario_sucursal;
CREATE TRIGGER trg_audit_usuario_sucursal
AFTER INSERT OR UPDATE OR DELETE ON public.usuario_sucursal
FOR EACH ROW EXECUTE FUNCTION public.audit_branch_assignment_change();

DROP FUNCTION IF EXISTS public.crear_cotizacion(UUID, UUID, UUID, NUMERIC, DATE, TEXT, JSONB, public.metodo_pago, TEXT);

CREATE OR REPLACE FUNCTION public.crear_cotizacion(
  p_sucursal_id UUID,
  p_cliente_id UUID,
  p_vendedor_id UUID,
  p_total NUMERIC,
  p_valida_hasta DATE DEFAULT NULL,
  p_observaciones TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb,
  p_metodo_pago public.metodo_pago DEFAULT 'efectivo',
  p_operation_id TEXT DEFAULT NULL,
  p_aprobacion_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_quote_id UUID;
  v_existing RECORD;
  v_client RECORD;
  v_approval RECORD;
  v_item JSONB;
  v_qty NUMERIC;
  v_price NUMERIC;
  v_discount NUMERIC;
  v_subtotal NUMERIC;
  v_sum NUMERIC := 0;
  v_total_discount NUMERIC := 0;
  v_product_id UUID;
  v_design_id UUID;
  v_extra_id UUID;
BEGIN
  PERFORM public.altix_require_actor(p_vendedor_id, p_sucursal_id);
  IF p_total IS NULL OR p_total <= 0 OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La cotización debe tener un total y al menos un item.';
  END IF;
  SELECT * INTO v_client FROM public.clientes WHERE id = p_cliente_id AND activo = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'El cliente no existe o está inactivo.'; END IF;
  IF p_metodo_pago = 'credito' AND (NOT v_client.es_mayorista OR COALESCE(v_client.monto_autorizado, 0) <= 0) THEN
    RAISE EXCEPTION 'El crédito requiere un cliente mayorista con autorización vigente.';
  END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.cotizaciones WHERE operation_id = p_operation_id;
    IF FOUND THEN
      IF v_existing.total <> p_total OR v_existing.cliente_id IS DISTINCT FROM p_cliente_id
         OR v_existing.sucursal_id IS DISTINCT FROM p_sucursal_id OR v_existing.vendedor_id IS DISTINCT FROM p_vendedor_id THEN
        RAISE EXCEPTION 'El operation_id ya fue usado con otro payload.';
      END IF;
      RETURN v_existing.id;
    END IF;
  END IF;
  IF p_valida_hasta IS NOT NULL AND p_valida_hasta < CURRENT_DATE THEN
    RAISE EXCEPTION 'La vigencia de la cotización no puede estar vencida.';
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_product_id := NULLIF(v_item->>'producto_id', '')::UUID;
    v_design_id := NULLIF(v_item->>'diseno_id', '')::UUID;
    v_extra_id := NULLIF(v_item->>'extra_id', '')::UUID;
    IF v_product_id IS NULL AND v_design_id IS NULL AND v_extra_id IS NULL THEN
      RAISE EXCEPTION 'Cada item debe referenciar producto, diseño o extra.';
    END IF;
    IF v_product_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.productos WHERE id = v_product_id AND activo = true) THEN
      RAISE EXCEPTION 'El producto del item no existe o está inactivo.';
    END IF;
    IF v_design_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.disenos WHERE id = v_design_id) THEN
      RAISE EXCEPTION 'El diseño seleccionado no existe.';
    END IF;
    IF v_extra_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.extras WHERE id = v_extra_id AND activo = true) THEN
      RAISE EXCEPTION 'El extra seleccionado no existe o está inactivo.';
    END IF;
    v_qty := (v_item->>'cantidad')::NUMERIC;
    v_price := (v_item->>'precio_unitario')::NUMERIC;
    v_discount := COALESCE(NULLIF(v_item->>'descuento', '')::NUMERIC, 0);
    IF v_qty IS NULL OR v_qty <= 0 OR v_price IS NULL OR v_price < 0 OR v_discount < 0 OR v_discount > v_qty * v_price THEN
      RAISE EXCEPTION 'Cantidad, precio o descuento inválido en la cotización.';
    END IF;
    v_total_discount := v_total_discount + v_discount;
    v_subtotal := ROUND(v_qty * v_price - v_discount, 2);
    IF ABS(v_subtotal - COALESCE((v_item->>'subtotal')::NUMERIC, v_subtotal)) > 0.01 THEN
      RAISE EXCEPTION 'El subtotal de un item no coincide con su cantidad, precio y descuento.';
    END IF;
    v_sum := v_sum + v_subtotal;
  END LOOP;
  IF v_total_discount > 0 THEN
    SELECT * INTO v_approval
    FROM public.aprobaciones
    WHERE id = p_aprobacion_id
      AND tipo = 'descuento'
      AND estado = 'aprobada'
      AND solicitante_id = p_vendedor_id
      AND sucursal_id = p_sucursal_id
    FOR UPDATE;
    IF NOT FOUND OR COALESCE(v_approval.valor_solicitado, 0) < v_total_discount THEN
      RAISE EXCEPTION 'El descuento requiere una aprobación vigente del administrador.';
    END IF;
  ELSIF p_aprobacion_id IS NOT NULL THEN
    RAISE EXCEPTION 'No se puede asociar una aprobación de descuento a una cotización sin descuento.';
  END IF;
  IF ABS(v_sum - p_total) > 0.01 THEN RAISE EXCEPTION 'El total no coincide con los items.'; END IF;
  INSERT INTO public.cotizaciones(
    sucursal_id, cliente_id, vendedor_id, total, estado, valida_hasta, observaciones, metodo_pago, operation_id
  ) VALUES (
    p_sucursal_id, p_cliente_id, p_vendedor_id, p_total, 'enviada', p_valida_hasta,
    NULLIF(btrim(p_observaciones), ''), p_metodo_pago, p_operation_id
  ) ON CONFLICT (operation_id) WHERE operation_id IS NOT NULL DO NOTHING RETURNING id INTO v_quote_id;
  IF v_quote_id IS NULL THEN
    SELECT id INTO v_quote_id FROM public.cotizaciones WHERE operation_id = p_operation_id;
    IF v_quote_id IS NULL THEN RAISE EXCEPTION 'No se pudo recuperar la cotización idempotente.'; END IF;
    RETURN v_quote_id;
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'cantidad')::NUMERIC;
    v_price := (v_item->>'precio_unitario')::NUMERIC;
    v_discount := COALESCE(NULLIF(v_item->>'descuento', '')::NUMERIC, 0);
    INSERT INTO public.cotizacion_items(
      cotizacion_id, producto_id, diseno_id, extra_id, cantidad, precio_unitario, subtotal, descuento, observaciones, snapshot_economico
    ) VALUES (
      v_quote_id, NULLIF(v_item->>'producto_id', '')::UUID, NULLIF(v_item->>'diseno_id', '')::UUID,
      NULLIF(v_item->>'extra_id', '')::UUID, v_qty, v_price, ROUND(v_qty * v_price - v_discount, 2),
      v_discount, NULLIF(btrim(v_item->>'observaciones'), ''), COALESCE(v_item->'snapshot_economico', '{}'::jsonb)
    );
  END LOOP;
  RETURN v_quote_id;
END;
$$;

