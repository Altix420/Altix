-- Cotizaciones V1: extras multiples, snapshot historico y aprobacion posterior al guardado.

CREATE TABLE IF NOT EXISTS public.cotizacion_item_extras (
  cotizacion_item_id UUID NOT NULL REFERENCES public.cotizacion_items(id) ON DELETE CASCADE,
  extra_id UUID NOT NULL REFERENCES public.extras(id) ON DELETE RESTRICT,
  precio_adicional NUMERIC(12,2) NOT NULL CHECK (precio_adicional >= 0),
  PRIMARY KEY (cotizacion_item_id, extra_id)
);

CREATE TABLE IF NOT EXISTS public.pedido_item_extras (
  pedido_item_id UUID NOT NULL REFERENCES public.pedido_items(id) ON DELETE CASCADE,
  extra_id UUID NOT NULL REFERENCES public.extras(id) ON DELETE RESTRICT,
  precio_adicional NUMERIC(12,2) NOT NULL CHECK (precio_adicional >= 0),
  PRIMARY KEY (pedido_item_id, extra_id)
);

CREATE INDEX IF NOT EXISTS idx_cotizacion_item_extras_extra ON public.cotizacion_item_extras(extra_id);
CREATE INDEX IF NOT EXISTS idx_pedido_item_extras_extra ON public.pedido_item_extras(extra_id);

ALTER TABLE public.cotizacion_item_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_item_extras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura de extras de cotizacion por sucursal" ON public.cotizacion_item_extras;
CREATE POLICY "Lectura de extras de cotizacion por sucursal" ON public.cotizacion_item_extras
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.cotizacion_items ci
      JOIN public.cotizaciones c ON c.id = ci.cotizacion_id
      WHERE ci.id = cotizacion_item_id AND public.altix_can_access_branch(c.sucursal_id)
    )
  );
DROP POLICY IF EXISTS "Lectura de extras de pedido por sucursal" ON public.pedido_item_extras;
CREATE POLICY "Lectura de extras de pedido por sucursal" ON public.pedido_item_extras
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.pedido_items pi
      JOIN public.pedidos p ON p.id = pi.pedido_id
      WHERE pi.id = pedido_item_id AND public.altix_can_access_branch(p.sucursal_id)
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS aprobaciones_descuento_cotizacion_pendiente_uidx
  ON public.aprobaciones(referencia_id)
  WHERE tipo = 'descuento' AND referencia_tabla = 'cotizaciones'
    AND estado = 'pendiente' AND referencia_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.crear_cotizacion(UUID, UUID, UUID, NUMERIC, DATE, TEXT, JSONB, public.metodo_pago, TEXT, UUID, UUID);
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
  p_aprobacion_id UUID DEFAULT NULL,
  p_cotizacion_borrador_id UUID DEFAULT NULL,
  p_motivo_aprobacion TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_quote_id UUID;
  v_item_id UUID;
  v_existing RECORD;
  v_client RECORD;
  v_item JSONB;
  v_extra JSONB;
  v_extras JSONB;
  v_extra_id UUID;
  v_first_extra UUID;
  v_qty NUMERIC;
  v_price NUMERIC;
  v_extra_price NUMERIC;
  v_discount NUMERIC;
  v_subtotal NUMERIC;
  v_sum NUMERIC := 0;
  v_total_discount NUMERIC := 0;
  v_breakdown JSONB := '[]'::jsonb;
  v_line_no INTEGER := 0;
BEGIN
  PERFORM public.altix_require_actor(p_vendedor_id, p_sucursal_id);
  IF p_total IS NULL OR p_total <= 0 OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La cotizacion debe tener un total y al menos un item.';
  END IF;
  IF p_aprobacion_id IS NOT NULL OR p_cotizacion_borrador_id IS NOT NULL THEN
    RAISE EXCEPTION 'La cotizacion se guarda primero y genera su aprobacion en la misma operacion.';
  END IF;
  SELECT * INTO v_client FROM public.clientes WHERE id = p_cliente_id AND activo = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'El cliente no existe o esta inactivo.'; END IF;
  IF p_metodo_pago = 'credito' AND (NOT v_client.es_mayorista OR COALESCE(v_client.monto_autorizado, 0) <= 0) THEN
    RAISE EXCEPTION 'El credito requiere un cliente mayorista con autorizacion vigente.';
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
    RAISE EXCEPTION 'La vigencia de la cotizacion no puede estar vencida.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_line_no := v_line_no + 1;
    v_extras := COALESCE(v_item->'extras', '[]'::jsonb);
    IF NULLIF(v_item->>'extra_id', '') IS NOT NULL THEN
      v_extras := v_extras || jsonb_build_array(jsonb_build_object('extra_id', v_item->>'extra_id'));
    END IF;
    IF NULLIF(v_item->>'producto_id', '') IS NULL AND NULLIF(v_item->>'diseno_id', '') IS NULL AND jsonb_array_length(v_extras) = 0 THEN
      RAISE EXCEPTION 'Cada item debe referenciar producto, diseno o al menos un extra.';
    END IF;
    IF NULLIF(v_item->>'producto_id', '') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.productos WHERE id = (v_item->>'producto_id')::UUID AND activo) THEN
      RAISE EXCEPTION 'El producto del item no existe o esta inactivo.';
    END IF;
    IF NULLIF(v_item->>'diseno_id', '') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.disenos WHERE id = (v_item->>'diseno_id')::UUID AND activo) THEN
      RAISE EXCEPTION 'El diseno seleccionado no existe o esta inactivo.';
    END IF;
    v_first_extra := NULL;
    FOR v_extra IN SELECT value FROM jsonb_array_elements(v_extras) LOOP
      v_extra_id := NULLIF(v_extra->>'extra_id', '')::UUID;
      IF v_extra_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.extras WHERE id = v_extra_id AND activo) THEN
        RAISE EXCEPTION 'Uno de los extras seleccionados no existe o esta inactivo.';
      END IF;
      SELECT precio_adicional INTO v_extra_price FROM public.extras WHERE id = v_extra_id;
      IF v_extra ? 'precio_adicional' AND ABS(v_extra_price - COALESCE((v_extra->>'precio_adicional')::NUMERIC, -1)) > 0.01 THEN
        RAISE EXCEPTION 'El precio del extra no coincide con el catalogo actual.';
      END IF;
      IF v_first_extra IS NULL THEN v_first_extra := v_extra_id; END IF;
    END LOOP;
    v_qty := (v_item->>'cantidad')::NUMERIC;
    v_price := (v_item->>'precio_unitario')::NUMERIC;
    v_discount := COALESCE(NULLIF(v_item->>'descuento', '')::NUMERIC, 0);
    IF v_qty IS NULL OR v_qty <= 0 OR v_price IS NULL OR v_price < 0 OR v_discount < 0 OR v_discount > v_qty * v_price THEN
      RAISE EXCEPTION 'Cantidad, precio o descuento invalido en la cotizacion.';
    END IF;
    v_subtotal := ROUND(v_qty * v_price - v_discount, 2);
    IF ABS(v_subtotal - COALESCE((v_item->>'subtotal')::NUMERIC, v_subtotal)) > 0.01 THEN
      RAISE EXCEPTION 'El subtotal de un item no coincide con su cantidad, precio y descuento.';
    END IF;
    v_total_discount := v_total_discount + v_discount;
    v_sum := v_sum + v_subtotal;
    v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
      'linea', v_line_no,
      'cantidad', v_qty,
      'precio_oficial_unitario', v_price,
      'descuento_total', v_discount,
      'total_linea', v_subtotal,
      'snapshot_economico', COALESCE(v_item->'snapshot_economico', '{}'::jsonb)
    ));
  END LOOP;
  IF ABS(v_sum - p_total) > 0.01 THEN RAISE EXCEPTION 'El total no coincide con los items.'; END IF;
  IF v_total_discount > 0 AND length(btrim(COALESCE(p_motivo_aprobacion, ''))) = 0 THEN
    RAISE EXCEPTION 'El motivo de aprobacion del descuento es obligatorio.';
  END IF;
  IF v_total_discount = 0 AND length(btrim(COALESCE(p_motivo_aprobacion, ''))) > 0 THEN
    RAISE EXCEPTION 'No se puede enviar motivo de descuento sin descuento.';
  END IF;

  INSERT INTO public.cotizaciones(sucursal_id, cliente_id, vendedor_id, total, estado, valida_hasta, observaciones, metodo_pago, operation_id)
  VALUES (p_sucursal_id, p_cliente_id, p_vendedor_id, p_total, 'enviada', p_valida_hasta, NULLIF(btrim(p_observaciones), ''), p_metodo_pago, p_operation_id)
  ON CONFLICT (operation_id) WHERE operation_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_quote_id;
  IF v_quote_id IS NULL THEN
    SELECT id INTO v_quote_id FROM public.cotizaciones WHERE operation_id = p_operation_id;
    IF v_quote_id IS NULL THEN RAISE EXCEPTION 'No se pudo recuperar la cotizacion idempotente.'; END IF;
    RETURN v_quote_id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_extras := COALESCE(v_item->'extras', '[]'::jsonb);
    IF NULLIF(v_item->>'extra_id', '') IS NOT NULL THEN
      v_extras := v_extras || jsonb_build_array(jsonb_build_object('extra_id', v_item->>'extra_id'));
    END IF;
    v_qty := (v_item->>'cantidad')::NUMERIC;
    v_price := (v_item->>'precio_unitario')::NUMERIC;
    v_discount := COALESCE(NULLIF(v_item->>'descuento', '')::NUMERIC, 0);
    SELECT NULLIF(value->>'extra_id', '')::UUID INTO v_first_extra
    FROM jsonb_array_elements(v_extras) WHERE NULLIF(value->>'extra_id', '') IS NOT NULL LIMIT 1;
    INSERT INTO public.cotizacion_items(cotizacion_id, producto_id, diseno_id, extra_id, cantidad, precio_unitario, subtotal, descuento, observaciones, snapshot_economico)
    VALUES (v_quote_id, NULLIF(v_item->>'producto_id', '')::UUID, NULLIF(v_item->>'diseno_id', '')::UUID, v_first_extra,
      v_qty, v_price, ROUND(v_qty * v_price - v_discount, 2), v_discount, NULLIF(btrim(v_item->>'observaciones'), ''), COALESCE(v_item->'snapshot_economico', '{}'::jsonb))
    RETURNING id INTO v_item_id;
    FOR v_extra IN SELECT value FROM jsonb_array_elements(v_extras) LOOP
      v_extra_id := NULLIF(v_extra->>'extra_id', '')::UUID;
      SELECT precio_adicional INTO v_extra_price FROM public.extras WHERE id = v_extra_id;
      INSERT INTO public.cotizacion_item_extras(cotizacion_item_id, extra_id, precio_adicional)
      VALUES (v_item_id, v_extra_id, v_extra_price)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
  IF v_total_discount > 0 THEN
    PERFORM public.altix_crear_aprobacion(
      'descuento', p_vendedor_id, p_sucursal_id, 'cotizaciones', v_quote_id, v_total_discount,
      jsonb_build_object('total_descuento', v_total_discount, 'lineas', v_breakdown),
      btrim(p_motivo_aprobacion), 'cotizacion-descuento-' || v_quote_id::TEXT
    );
  END IF;
  RETURN v_quote_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.convertir_cotizacion_pedido(p_cotizacion_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_quote RECORD;
  v_order_id UUID;
  v_item RECORD;
  v_order_item_id UUID;
  v_client RECORD;
  v_approval RECORD;
  v_discount NUMERIC;
  v_used NUMERIC;
  v_due DATE;
BEGIN
  SELECT * INTO v_quote FROM public.cotizaciones WHERE id = p_cotizacion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cotizacion no existe.'; END IF;
  IF public.altix_is_admin() THEN
    PERFORM public.altix_require_admin(auth.uid());
  ELSE
    PERFORM public.altix_require_actor(v_quote.vendedor_id, v_quote.sucursal_id);
  END IF;
  IF v_quote.estado = 'convertida' THEN
    SELECT id INTO v_order_id FROM public.pedidos WHERE cotizacion_id = p_cotizacion_id;
    IF v_order_id IS NULL THEN RAISE EXCEPTION 'La cotizacion esta convertida pero no tiene pedido relacionado.'; END IF;
    RETURN v_order_id;
  END IF;
  IF v_quote.estado <> 'enviada' THEN RAISE EXCEPTION 'La cotizacion no esta lista para convertirse.'; END IF;
  IF v_quote.valida_hasta IS NOT NULL AND v_quote.valida_hasta < CURRENT_DATE THEN RAISE EXCEPTION 'La cotizacion esta vencida.'; END IF;
  SELECT COALESCE(SUM(descuento), 0) INTO v_discount FROM public.cotizacion_items WHERE cotizacion_id = p_cotizacion_id;
  IF v_discount > 0 THEN
    SELECT * INTO v_approval FROM public.aprobaciones
    WHERE tipo = 'descuento' AND referencia_tabla = 'cotizaciones' AND referencia_id = p_cotizacion_id
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
    IF NOT FOUND OR v_approval.estado <> 'aprobada' OR COALESCE(v_approval.valor_solicitado, 0) < v_discount THEN
      RAISE EXCEPTION 'La cotizacion tiene un descuento pendiente de aprobacion.';
    END IF;
  END IF;
  IF v_quote.metodo_pago = 'credito' THEN
    SELECT * INTO v_client FROM public.clientes WHERE id = v_quote.cliente_id AND activo = true FOR UPDATE;
    IF NOT FOUND OR NOT v_client.es_mayorista OR COALESCE(v_client.monto_autorizado, 0) <= 0 THEN
      RAISE EXCEPTION 'El cliente no tiene credito autorizado.';
    END IF;
    SELECT COALESCE(SUM(saldo_pendiente), 0) INTO v_used FROM public.cuentas_cobrar WHERE cliente_id = v_quote.cliente_id AND saldo_pendiente > 0;
    IF v_used + v_quote.total > v_client.monto_autorizado THEN
      RAISE EXCEPTION 'Limite de credito excedido. Disponible: Q%, solicitado: Q%.', v_client.monto_autorizado - v_used, v_quote.total;
    END IF;
  END IF;
  INSERT INTO public.pedidos(cotizacion_id, sucursal_id, cliente_id, vendedor_id, total, saldo_pendiente, estado, observaciones, metodo_pago)
  VALUES (v_quote.id, v_quote.sucursal_id, v_quote.cliente_id, v_quote.vendedor_id, v_quote.total, v_quote.total, 'pendiente', v_quote.observaciones, v_quote.metodo_pago)
  ON CONFLICT (cotizacion_id) WHERE cotizacion_id IS NOT NULL DO NOTHING RETURNING id INTO v_order_id;
  IF v_order_id IS NULL THEN SELECT id INTO v_order_id FROM public.pedidos WHERE cotizacion_id = p_cotizacion_id; RETURN v_order_id; END IF;
  FOR v_item IN SELECT * FROM public.cotizacion_items WHERE cotizacion_id = p_cotizacion_id LOOP
    INSERT INTO public.pedido_items(pedido_id, producto_id, diseno_id, extra_id, cantidad, precio_unitario, subtotal, descuento, observaciones, snapshot_economico)
    VALUES (v_order_id, v_item.producto_id, v_item.diseno_id, v_item.extra_id, v_item.cantidad, v_item.precio_unitario, v_item.subtotal, v_item.descuento, v_item.observaciones, v_item.snapshot_economico)
    RETURNING id INTO v_order_item_id;
    INSERT INTO public.pedido_item_extras(pedido_item_id, extra_id, precio_adicional)
    SELECT v_order_item_id, extra_id, precio_adicional FROM public.cotizacion_item_extras WHERE cotizacion_item_id = v_item.id;
  END LOOP;
  IF v_quote.metodo_pago = 'credito' THEN
    v_due := CURRENT_DATE + COALESCE(v_client.dias_credito, 0);
    INSERT INTO public.cuentas_cobrar(pedido_id, cliente_id, monto_total, saldo_pendiente, fecha_venta, fecha_vencimiento, estado)
    VALUES (v_order_id, v_quote.cliente_id, v_quote.total, v_quote.total, CURRENT_DATE, v_due, 'pendiente');
  END IF;
  UPDATE public.cotizaciones SET estado = 'convertida' WHERE id = p_cotizacion_id;
  RETURN v_order_id;
END;
$$;
