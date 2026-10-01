-- FULL V1: cotizaciones, pedidos, anticipos, entrega y cierre comercial.
-- Las cotizaciones no reservan inventario. El stock cambia al cerrar el pedido como venta.

ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS metodo_pago public.metodo_pago NOT NULL DEFAULT 'efectivo',
  ADD COLUMN IF NOT EXISTS operation_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS cotizaciones_operation_id_uidx
  ON public.cotizaciones(operation_id) WHERE operation_id IS NOT NULL;

ALTER TABLE public.cotizacion_items
  ADD COLUMN IF NOT EXISTS diseno_id UUID REFERENCES public.disenos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS extra_id UUID REFERENCES public.extras(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS descuento NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS snapshot_economico JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS metodo_pago public.metodo_pago NOT NULL DEFAULT 'efectivo';

CREATE UNIQUE INDEX IF NOT EXISTS pedidos_cotizacion_uidx
  ON public.pedidos(cotizacion_id) WHERE cotizacion_id IS NOT NULL;

ALTER TABLE public.pedido_items
  ADD COLUMN IF NOT EXISTS extra_id UUID REFERENCES public.extras(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS descuento NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS snapshot_economico JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.anticipos
  ADD COLUMN IF NOT EXISTS registrado_por UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS sesion_caja_id UUID REFERENCES public.sesiones_caja(id) ON DELETE RESTRICT;

ALTER TABLE public.entregas
  ADD COLUMN IF NOT EXISTS entregado_por UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS operation_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS entregas_pedido_uidx
  ON public.entregas(pedido_id);
CREATE UNIQUE INDEX IF NOT EXISTS entregas_operation_id_uidx
  ON public.entregas(operation_id) WHERE operation_id IS NOT NULL;

ALTER TABLE public.cuentas_cobrar
  ADD COLUMN IF NOT EXISTS pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cuentas_cobrar_pedido_uidx
  ON public.cuentas_cobrar(pedido_id) WHERE pedido_id IS NOT NULL;

DROP POLICY IF EXISTS "Lectura de cuentas por vendedor o admin" ON public.cuentas_cobrar;
CREATE POLICY "Lectura de cuentas por vendedor o admin" ON public.cuentas_cobrar
  FOR SELECT TO authenticated USING (
    public.altix_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.ventas v
      WHERE v.id = venta_id AND v.vendedor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = pedido_id AND p.vendedor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Lectura de pagos de credito por vendedor o admin" ON public.pagos_credito;
CREATE POLICY "Lectura de pagos de credito por vendedor o admin" ON public.pagos_credito
  FOR SELECT TO authenticated USING (
    public.altix_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.cuentas_cobrar c
      LEFT JOIN public.ventas v ON v.id = c.venta_id
      LEFT JOIN public.pedidos p ON p.id = c.pedido_id
      WHERE c.id = cuenta_cobrar_id
        AND (v.vendedor_id = auth.uid() OR p.vendedor_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.crear_cotizacion(
  p_sucursal_id UUID,
  p_cliente_id UUID,
  p_vendedor_id UUID,
  p_total NUMERIC,
  p_valida_hasta DATE DEFAULT NULL,
  p_observaciones TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb,
  p_metodo_pago public.metodo_pago DEFAULT 'efectivo',
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_quote_id UUID;
  v_existing RECORD;
  v_client RECORD;
  v_item JSONB;
  v_qty NUMERIC;
  v_price NUMERIC;
  v_discount NUMERIC;
  v_subtotal NUMERIC;
  v_sum NUMERIC := 0;
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
    IF v_product_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.productos WHERE id = v_product_id AND activo = true) THEN
        RAISE EXCEPTION 'El producto del item no existe o está inactivo.';
      END IF;
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
    v_subtotal := ROUND(v_qty * v_price - v_discount, 2);
    IF ABS(v_subtotal - COALESCE((v_item->>'subtotal')::NUMERIC, v_subtotal)) > 0.01 THEN
      RAISE EXCEPTION 'El subtotal de un item no coincide con su cantidad, precio y descuento.';
    END IF;
    v_sum := v_sum + v_subtotal;
  END LOOP;
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

CREATE OR REPLACE FUNCTION public.convertir_cotizacion_pedido(p_cotizacion_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_quote RECORD;
  v_order_id UUID;
  v_item RECORD;
  v_client RECORD;
  v_used NUMERIC;
  v_due DATE;
BEGIN
  SELECT * INTO v_quote FROM public.cotizaciones WHERE id = p_cotizacion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cotización no existe.'; END IF;
  IF public.altix_is_admin() THEN
    PERFORM public.altix_require_admin(auth.uid());
  ELSE
    PERFORM public.altix_require_actor(v_quote.vendedor_id, v_quote.sucursal_id);
  END IF;
  IF v_quote.estado = 'convertida' THEN
    SELECT id INTO v_order_id FROM public.pedidos WHERE cotizacion_id = p_cotizacion_id;
    IF v_order_id IS NULL THEN RAISE EXCEPTION 'La cotización está convertida pero no tiene pedido relacionado.'; END IF;
    RETURN v_order_id;
  END IF;
  IF v_quote.estado <> 'enviada' THEN RAISE EXCEPTION 'La cotización no está lista para convertirse.'; END IF;
  IF v_quote.valida_hasta IS NOT NULL AND v_quote.valida_hasta < CURRENT_DATE THEN RAISE EXCEPTION 'La cotización está vencida.'; END IF;
  IF v_quote.metodo_pago = 'credito' THEN
    SELECT * INTO v_client FROM public.clientes WHERE id = v_quote.cliente_id AND activo = true FOR UPDATE;
    IF NOT FOUND OR NOT v_client.es_mayorista OR COALESCE(v_client.monto_autorizado, 0) <= 0 THEN
      RAISE EXCEPTION 'El cliente no tiene crédito autorizado.';
    END IF;
    SELECT COALESCE(SUM(saldo_pendiente), 0) INTO v_used
    FROM public.cuentas_cobrar WHERE cliente_id = v_quote.cliente_id AND saldo_pendiente > 0;
    IF v_used + v_quote.total > v_client.monto_autorizado THEN
      RAISE EXCEPTION 'Límite de crédito excedido. Disponible: Q%, solicitado: Q%.', v_client.monto_autorizado - v_used, v_quote.total;
    END IF;
  END IF;
  INSERT INTO public.pedidos(
    cotizacion_id, sucursal_id, cliente_id, vendedor_id, total, saldo_pendiente, estado, observaciones, metodo_pago
  ) VALUES (
    v_quote.id, v_quote.sucursal_id, v_quote.cliente_id, v_quote.vendedor_id, v_quote.total, v_quote.total,
    'pendiente', v_quote.observaciones, v_quote.metodo_pago
  ) ON CONFLICT (cotizacion_id) WHERE cotizacion_id IS NOT NULL DO NOTHING RETURNING id INTO v_order_id;
  IF v_order_id IS NULL THEN
    SELECT id INTO v_order_id FROM public.pedidos WHERE cotizacion_id = p_cotizacion_id;
    RETURN v_order_id;
  END IF;
  FOR v_item IN SELECT * FROM public.cotizacion_items WHERE cotizacion_id = p_cotizacion_id LOOP
    INSERT INTO public.pedido_items(
      pedido_id, producto_id, diseno_id, extra_id, cantidad, precio_unitario, subtotal, descuento, observaciones, snapshot_economico
    ) VALUES (
      v_order_id, v_item.producto_id, v_item.diseno_id, v_item.extra_id, v_item.cantidad, v_item.precio_unitario,
      v_item.subtotal, v_item.descuento, v_item.observaciones, v_item.snapshot_economico
    );
  END LOOP;
  IF v_quote.metodo_pago = 'credito' THEN
    v_due := CURRENT_DATE + COALESCE(v_client.dias_credito, 0);
    INSERT INTO public.cuentas_cobrar(
      pedido_id, cliente_id, monto_total, saldo_pendiente, fecha_venta, fecha_vencimiento, estado
    ) VALUES (v_order_id, v_quote.cliente_id, v_quote.total, v_quote.total, CURRENT_DATE, v_due, 'pendiente');
  END IF;
  UPDATE public.cotizaciones SET estado = 'convertida' WHERE id = p_cotizacion_id;
  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_anticipo_v1(
  p_pedido_id UUID,
  p_cliente_id UUID,
  p_monto NUMERIC,
  p_forma_pago public.metodo_pago,
  p_comprobante_ref TEXT DEFAULT NULL,
  p_registrado_por UUID DEFAULT auth.uid(),
  p_sesion_caja_id UUID DEFAULT NULL,
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_advance_id UUID;
  v_existing RECORD;
  v_new_balance NUMERIC;
  v_account RECORD;
  v_session RECORD;
BEGIN
  SELECT * INTO v_order FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND OR v_order.cliente_id <> p_cliente_id THEN RAISE EXCEPTION 'El pedido o cliente no es válido.'; END IF;
  IF public.altix_is_admin() THEN
    PERFORM public.altix_require_admin(p_registrado_por);
  ELSE
    PERFORM public.altix_require_actor(v_order.vendedor_id, v_order.sucursal_id);
  END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.anticipos WHERE operation_id = p_operation_id;
    IF FOUND THEN
      IF v_existing.pedido_id <> p_pedido_id OR v_existing.monto <> p_monto OR v_existing.forma_pago <> p_forma_pago THEN
        RAISE EXCEPTION 'El operation_id del anticipo ya fue usado con otro payload.';
      END IF;
      RETURN v_existing.id;
    END IF;
  END IF;
  IF v_order.estado IN ('entregado', 'cancelado') THEN RAISE EXCEPTION 'El pedido ya no acepta anticipos.'; END IF;
  IF p_monto IS NULL OR p_monto <= 0 OR p_monto > v_order.saldo_pendiente THEN
    RAISE EXCEPTION 'El anticipo debe ser mayor a cero y no superar el saldo pendiente.';
  END IF;
  IF p_forma_pago = 'credito' THEN RAISE EXCEPTION 'Crédito no es una forma de pago de un anticipo.'; END IF;
  IF p_forma_pago = 'efectivo' THEN
    IF p_sesion_caja_id IS NULL THEN RAISE EXCEPTION 'Los anticipos en efectivo requieren caja abierta.'; END IF;
    SELECT * INTO v_session FROM public.sesiones_caja WHERE id = p_sesion_caja_id FOR UPDATE;
    IF NOT FOUND OR v_session.estado <> 'abierta' OR v_session.sucursal_id <> v_order.sucursal_id THEN
      RAISE EXCEPTION 'La sesión de caja no es válida para el pedido.';
    END IF;
  ELSIF p_forma_pago = 'saldo_favor' THEN
    PERFORM public.aplicar_saldo_favor(p_cliente_id, p_monto, 'Anticipo de pedido', p_pedido_id);
  END IF;
  INSERT INTO public.anticipos(pedido_id, cliente_id, monto, forma_pago, comprobante_ref, registrado_por, sesion_caja_id, operation_id)
  VALUES (p_pedido_id, p_cliente_id, p_monto, p_forma_pago, NULLIF(btrim(p_comprobante_ref), ''), p_registrado_por, p_sesion_caja_id, p_operation_id)
  RETURNING id INTO v_advance_id;
  v_new_balance := ROUND(v_order.saldo_pendiente - p_monto, 2);
  UPDATE public.pedidos SET saldo_pendiente = v_new_balance WHERE id = p_pedido_id;
  IF v_order.metodo_pago = 'credito' THEN
    SELECT * INTO v_account FROM public.cuentas_cobrar WHERE pedido_id = p_pedido_id FOR UPDATE;
    IF FOUND THEN
      UPDATE public.cuentas_cobrar
      SET saldo_pendiente = v_new_balance,
          estado = CASE WHEN v_new_balance = 0 THEN 'pagada'::estado_cuenta WHEN fecha_vencimiento < CURRENT_DATE THEN 'vencida'::estado_cuenta ELSE 'parcial'::estado_cuenta END
      WHERE id = v_account.id;
      INSERT INTO public.pagos_credito(cuenta_cobrar_id, monto, forma_pago, referencia, registrado_por, operation_id)
      VALUES (v_account.id, p_monto, p_forma_pago, NULLIF(btrim(p_comprobante_ref), ''), p_registrado_por, p_operation_id);
    END IF;
  END IF;
  IF p_forma_pago = 'efectivo' THEN
    INSERT INTO public.movimientos_caja(sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id)
    VALUES (p_sesion_caja_id, 'ingreso', p_monto, 'Anticipo de pedido ' || substring(p_pedido_id::text, 1, 8), v_advance_id, p_operation_id);
  END IF;
  RETURN v_advance_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.marcar_pedido_entregado(
  p_pedido_id UUID,
  p_recibido_por TEXT,
  p_observaciones TEXT DEFAULT NULL,
  p_entregado_por UUID DEFAULT auth.uid(),
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_delivery_id UUID;
  v_existing RECORD;
BEGIN
  PERFORM public.altix_require_admin(p_entregado_por);
  SELECT * INTO v_order FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El pedido no existe.'; END IF;
  IF v_order.estado = 'cancelado' THEN RAISE EXCEPTION 'Un pedido cancelado no puede entregarse.'; END IF;
  IF length(btrim(COALESCE(p_recibido_por, ''))) = 0 THEN RAISE EXCEPTION 'Indica quién recibió el pedido.'; END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.entregas WHERE operation_id = p_operation_id;
    IF FOUND THEN RETURN v_existing.id; END IF;
  END IF;
  SELECT id INTO v_delivery_id FROM public.entregas WHERE pedido_id = p_pedido_id;
  IF v_delivery_id IS NOT NULL THEN RETURN v_delivery_id; END IF;
  INSERT INTO public.entregas(pedido_id, recibido_por, observaciones, entregado_por, operation_id)
  VALUES (p_pedido_id, btrim(p_recibido_por), NULLIF(btrim(p_observaciones), ''), p_entregado_por, p_operation_id)
  RETURNING id INTO v_delivery_id;
  UPDATE public.pedidos SET estado = 'entregado' WHERE id = p_pedido_id;
  RETURN v_delivery_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_pedido_venta(
  p_pedido_id UUID,
  p_operation_id TEXT DEFAULT NULL,
  p_registrado_por UUID DEFAULT auth.uid()
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_sale_id UUID;
  v_item RECORD;
  v_stock NUMERIC;
  v_account RECORD;
BEGIN
  PERFORM public.altix_require_admin(p_registrado_por);
  SELECT * INTO v_order FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El pedido no existe.'; END IF;
  IF v_order.estado <> 'entregado' THEN RAISE EXCEPTION 'El pedido debe estar entregado antes de convertirse en venta.'; END IF;
  IF v_order.saldo_pendiente <> 0 THEN RAISE EXCEPTION 'El pedido aún tiene saldo pendiente.'; END IF;
  SELECT id INTO v_sale_id FROM public.ventas WHERE pedido_id = p_pedido_id;
  IF v_sale_id IS NOT NULL THEN RETURN v_sale_id; END IF;
  INSERT INTO public.ventas(pedido_id, sucursal_id, cliente_id, vendedor_id, total, operation_id, entregada, entregada_at, entregada_por)
  VALUES (p_pedido_id, v_order.sucursal_id, v_order.cliente_id, v_order.vendedor_id, v_order.total, p_operation_id, true, now(), p_registrado_por)
  ON CONFLICT (operation_id) DO NOTHING RETURNING id INTO v_sale_id;
  IF v_sale_id IS NULL THEN
    SELECT id INTO v_sale_id FROM public.ventas WHERE operation_id = p_operation_id;
    IF v_sale_id IS NULL THEN RAISE EXCEPTION 'No se pudo recuperar la venta idempotente.'; END IF;
    RETURN v_sale_id;
  END IF;
  FOR v_item IN SELECT * FROM public.pedido_items WHERE pedido_id = p_pedido_id AND producto_id IS NOT NULL LOOP
    SELECT stock INTO v_stock FROM public.inventarios WHERE sucursal_id = v_order.sucursal_id AND producto_id = v_item.producto_id FOR UPDATE;
    IF v_stock IS NULL OR v_stock < v_item.cantidad THEN RAISE EXCEPTION 'Stock insuficiente para cerrar el pedido.'; END IF;
    INSERT INTO public.venta_items(venta_id, producto_id, cantidad, precio_unitario, subtotal)
    VALUES (v_sale_id, v_item.producto_id, v_item.cantidad, v_item.precio_unitario, v_item.subtotal);
    UPDATE public.inventarios SET stock = stock - v_item.cantidad
    WHERE sucursal_id = v_order.sucursal_id AND producto_id = v_item.producto_id;
    INSERT INTO public.movimientos_inventario(sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
    VALUES (v_order.sucursal_id, v_item.producto_id, 'salida', v_item.cantidad, v_stock, v_stock - v_item.cantidad, 'Pedido ' || v_order.id, p_registrado_por);
  END LOOP;
  SELECT * INTO v_account FROM public.cuentas_cobrar WHERE pedido_id = p_pedido_id FOR UPDATE;
  IF FOUND THEN
    UPDATE public.cuentas_cobrar SET venta_id = v_sale_id WHERE id = v_account.id;
  END IF;
  PERFORM public.generar_comision(v_sale_id);
  RETURN v_sale_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.actualizar_estado_pedido(
  p_pedido_id UUID,
  p_estado public.estado_pedido,
  p_actualizado_por UUID DEFAULT auth.uid()
) RETURNS public.estado_pedido
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
BEGIN
  PERFORM public.altix_require_admin(p_actualizado_por);
  SELECT * INTO v_order FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El pedido no existe.'; END IF;
  IF v_order.estado IN ('entregado', 'cancelado') THEN RAISE EXCEPTION 'El pedido ya no admite cambios de preparación.'; END IF;
  IF p_estado NOT IN ('en_produccion', 'listo') THEN RAISE EXCEPTION 'Estado de preparación no permitido.'; END IF;
  IF p_estado = 'en_produccion' AND v_order.estado <> 'pendiente' THEN
    RAISE EXCEPTION 'El pedido debe estar pendiente para iniciar producción.';
  END IF;
  IF p_estado = 'listo' AND v_order.estado <> 'en_produccion' THEN
    RAISE EXCEPTION 'El pedido debe estar en producción para marcarlo listo.';
  END IF;
  UPDATE public.pedidos SET estado = p_estado WHERE id = p_pedido_id;
  RETURN p_estado;
END;
$$;
