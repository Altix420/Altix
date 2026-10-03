-- Cierre comercial V1: pedido -> venta y respuestas no vistas.
-- Mantiene 001-034 intactas. Toda mutacion critica ocurre dentro de RPC.

ALTER TABLE public.venta_items
  ADD COLUMN IF NOT EXISTS diseno_id UUID REFERENCES public.disenos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS extra_id UUID REFERENCES public.extras(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS descuento NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS snapshot_economico JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS ventas_pedido_uidx
  ON public.ventas(pedido_id) WHERE pedido_id IS NOT NULL;

ALTER TABLE public.aprobaciones
  ADD COLUMN IF NOT EXISTS solicitante_visto_at TIMESTAMPTZ;

ALTER TABLE public.entregas
  ADD COLUMN IF NOT EXISTS entregado_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.confirmar_pedido_venta(
  p_pedido_id UUID,
  p_sesion_caja_id UUID DEFAULT NULL,
  p_monto_recibido NUMERIC DEFAULT 0,
  p_forma_pago public.metodo_pago DEFAULT NULL,
  p_operation_id TEXT DEFAULT NULL,
  p_confirmado_por UUID DEFAULT auth.uid(),
  p_recibido_por TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_sale_id UUID;
  v_item RECORD;
  v_stock NUMERIC;
  v_due NUMERIC;
  v_payment public.metodo_pago;
  v_session RECORD;
  v_received_by TEXT;
  v_existing RECORD;
  v_account RECORD;
BEGIN
  IF p_confirmado_por IS NULL OR NOT public.altix_is_active_user(p_confirmado_por) THEN
    RAISE EXCEPTION 'El usuario confirmado no existe o esta inactivo.';
  END IF;
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_confirmado_por THEN
    RAISE EXCEPTION 'El usuario autenticado no coincide con el responsable.';
  END IF;

  SELECT * INTO v_order FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El pedido no existe.'; END IF;
  IF NOT public.altix_is_admin(p_confirmado_por) THEN
    PERFORM public.altix_require_actor(p_confirmado_por, v_order.sucursal_id);
    IF v_order.vendedor_id IS DISTINCT FROM p_confirmado_por THEN
      RAISE EXCEPTION 'El vendedor no puede confirmar un pedido que no le pertenece.';
    END IF;
  ELSE
    PERFORM public.altix_require_admin(p_confirmado_por);
  END IF;
  IF v_order.estado = 'cancelado' THEN RAISE EXCEPTION 'El pedido esta cancelado.'; END IF;

  SELECT id INTO v_sale_id FROM public.ventas WHERE pedido_id = p_pedido_id;
  IF v_sale_id IS NOT NULL THEN RETURN v_sale_id; END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.ventas WHERE operation_id = p_operation_id;
    IF FOUND THEN
      IF v_existing.pedido_id IS DISTINCT FROM p_pedido_id THEN
        RAISE EXCEPTION 'El operation_id ya fue usado con otro pedido.';
      END IF;
      RETURN v_existing.id;
    END IF;
  END IF;
  IF v_order.estado NOT IN ('pendiente', 'en_produccion', 'listo') THEN
    RAISE EXCEPTION 'El pedido no esta listo para confirmarse.';
  END IF;

  v_due := ROUND(GREATEST(COALESCE(v_order.saldo_pendiente, 0), 0), 2);
  v_payment := COALESCE(p_forma_pago, v_order.metodo_pago);
  IF p_monto_recibido IS NULL OR p_monto_recibido < 0 OR p_monto_recibido > v_due THEN
    RAISE EXCEPTION 'El monto recibido no es valido para el saldo pendiente.';
  END IF;
  IF v_due > 0 AND p_monto_recibido <> v_due THEN
    RAISE EXCEPTION 'El pedido debe quedar totalmente pagado antes de finalizarse.';
  END IF;
  IF v_due > 0 AND v_payment = 'credito' THEN
    RAISE EXCEPTION 'El credito debe estar autorizado y pagado antes de finalizarse.';
  END IF;
  IF p_monto_recibido > 0 THEN
    IF v_payment = 'credito' THEN RAISE EXCEPTION 'Un cobro recibido no puede registrarse como credito.'; END IF;
    IF p_sesion_caja_id IS NULL THEN RAISE EXCEPTION 'No hay una caja abierta para esta sucursal.'; END IF;
    SELECT * INTO v_session FROM public.sesiones_caja WHERE id = p_sesion_caja_id FOR UPDATE;
    IF NOT FOUND OR v_session.estado <> 'abierta' OR v_session.sucursal_id <> v_order.sucursal_id THEN
      RAISE EXCEPTION 'No hay una caja abierta para esta sucursal.';
    END IF;
  END IF;

  INSERT INTO public.ventas(
    pedido_id, sucursal_id, cliente_id, vendedor_id, total, forma_pago, operation_id,
    entregada, entregada_at, entregada_por
  ) VALUES (
    p_pedido_id, v_order.sucursal_id, v_order.cliente_id, v_order.vendedor_id, v_order.total,
    v_payment, p_operation_id, true, now(), p_confirmado_por
  ) ON CONFLICT (pedido_id) WHERE pedido_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_sale_id;
  IF v_sale_id IS NULL THEN
    SELECT id INTO v_sale_id FROM public.ventas WHERE pedido_id = p_pedido_id;
    IF v_sale_id IS NULL THEN RAISE EXCEPTION 'No se pudo recuperar la venta idempotente.'; END IF;
    RETURN v_sale_id;
  END IF;

  FOR v_item IN SELECT * FROM public.pedido_items WHERE pedido_id = p_pedido_id LOOP
    IF v_item.producto_id IS NULL THEN CONTINUE; END IF;
    SELECT stock INTO v_stock
    FROM public.inventarios
    WHERE sucursal_id = v_order.sucursal_id AND producto_id = v_item.producto_id
    FOR UPDATE;
    IF v_stock IS NULL OR v_stock < v_item.cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente para cerrar el pedido.';
    END IF;
    INSERT INTO public.venta_items(
      venta_id, producto_id, diseno_id, extra_id, cantidad, precio_unitario, subtotal, descuento, snapshot_economico
    ) VALUES (
      v_sale_id, v_item.producto_id, v_item.diseno_id, v_item.extra_id, v_item.cantidad,
      v_item.precio_unitario, v_item.subtotal, v_item.descuento,
      jsonb_build_object(
        'pedido_item_id', v_item.id,
        'extras', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('extra_id', pie.extra_id, 'precio_adicional', pie.precio_adicional))
          FROM public.pedido_item_extras pie WHERE pie.pedido_item_id = v_item.id
        ), '[]'::jsonb),
        'snapshot', COALESCE(v_item.snapshot_economico, '{}'::jsonb)
      )
    );
    UPDATE public.inventarios
    SET stock = stock - v_item.cantidad
    WHERE sucursal_id = v_order.sucursal_id AND producto_id = v_item.producto_id;
    INSERT INTO public.movimientos_inventario(
      sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id
    ) VALUES (
      v_order.sucursal_id, v_item.producto_id, 'salida', v_item.cantidad, v_stock,
      v_stock - v_item.cantidad, 'Venta por pedido ' || v_order.id, p_confirmado_por
    );
  END LOOP;

  IF v_due > 0 THEN
    UPDATE public.pedidos SET saldo_pendiente = 0 WHERE id = p_pedido_id;
    SELECT * INTO v_account FROM public.cuentas_cobrar WHERE pedido_id = p_pedido_id FOR UPDATE;
    IF FOUND THEN
      UPDATE public.cuentas_cobrar SET venta_id = v_sale_id, saldo_pendiente = 0, estado = 'pagada' WHERE id = v_account.id;
    END IF;
    INSERT INTO public.movimientos_caja(sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id)
    VALUES (p_sesion_caja_id, 'ingreso', p_monto_recibido, 'Pago final de pedido ' || substring(p_pedido_id::text, 1, 8), v_sale_id, p_operation_id || ':pago');
  END IF;

  v_received_by := NULLIF(btrim(COALESCE(p_recibido_por, '')), '');
  IF v_received_by IS NULL THEN
    SELECT COALESCE(nombre_completo, 'Cliente') INTO v_received_by FROM public.profiles WHERE id = p_confirmado_por;
  END IF;
  INSERT INTO public.entregas(pedido_id, venta_id, recibido_por, entregado_por, entregado_at, operation_id)
  VALUES (p_pedido_id, v_sale_id, COALESCE(v_received_by, 'Cliente'), p_confirmado_por, now(), p_operation_id || ':entrega')
  ON CONFLICT (pedido_id) DO NOTHING;
  UPDATE public.pedidos SET estado = 'entregado', saldo_pendiente = 0 WHERE id = p_pedido_id;
  PERFORM public.generar_comision(v_sale_id);
  RETURN v_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirmar_pedido_venta(UUID, UUID, NUMERIC, public.metodo_pago, TEXT, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.marcar_aprobaciones_vistas()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Se requiere autenticacion.'; END IF;
  UPDATE public.aprobaciones
  SET solicitante_visto_at = now()
  WHERE solicitante_id = auth.uid() AND estado <> 'pendiente' AND solicitante_visto_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_aprobaciones_vistas() TO authenticated;

-- Direct sales are completed sales: commission generation can run immediately.
UPDATE public.ventas SET entregada = true, entregada_at = COALESCE(entregada_at, created_at)
WHERE entregada = false AND pedido_id IS NULL;

CREATE OR REPLACE FUNCTION public.marcar_venta_directa_finalizada()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.pedido_id IS NULL THEN
    NEW.entregada := true;
    NEW.entregada_at := COALESCE(NEW.entregada_at, now());
    NEW.entregada_por := COALESCE(NEW.entregada_por, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_direct_sale_finalized ON public.ventas;
CREATE TRIGGER trg_direct_sale_finalized
BEFORE INSERT ON public.ventas
FOR EACH ROW EXECUTE FUNCTION public.marcar_venta_directa_finalizada();

CREATE OR REPLACE FUNCTION public.obtener_dashboard_admin(
  p_desde DATE DEFAULT date_trunc('month', timezone('America/Guatemala', now()))::date,
  p_hasta DATE DEFAULT timezone('America/Guatemala', now())::date,
  p_sucursal_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sales NUMERIC := 0;
  v_returns NUMERIC := 0;
  v_cost NUMERIC := 0;
  v_commissions NUMERIC := 0;
BEGIN
  PERFORM public.altix_require_admin(auth.uid());
  SELECT COALESCE(SUM(v.total), 0) INTO v_sales FROM public.ventas v
  WHERE v.entregada AND (v.created_at AT TIME ZONE 'America/Guatemala')::date BETWEEN p_desde AND p_hasta
    AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id);
  SELECT COALESCE(SUM(d.monto_total), 0) INTO v_returns FROM public.devoluciones d
  WHERE (d.fecha_operativa BETWEEN p_desde AND p_hasta) AND (p_sucursal_id IS NULL OR d.sucursal_id = p_sucursal_id);
  SELECT COALESCE(SUM(vc.cantidad * vc.costo_unitario), 0) INTO v_cost
  FROM public.venta_costos vc JOIN public.venta_items vi ON vi.id = vc.venta_item_id
  JOIN public.ventas v ON v.id = vi.venta_id
  WHERE v.entregada AND (v.created_at AT TIME ZONE 'America/Guatemala')::date BETWEEN p_desde AND p_hasta
    AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id);
  SELECT COALESCE((SELECT SUM(c.monto_comision) FROM public.comisiones c JOIN public.ventas v ON v.id = c.venta_id
    WHERE v.entregada AND (v.created_at AT TIME ZONE 'America/Guatemala')::date BETWEEN p_desde AND p_hasta
      AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id)), 0)
    + COALESCE((SELECT SUM(a.monto_ajuste) FROM public.ajustes_comision a JOIN public.comisiones c ON c.id = a.comision_id JOIN public.ventas v ON v.id = c.venta_id
    WHERE (v.created_at AT TIME ZONE 'America/Guatemala')::date BETWEEN p_desde AND p_hasta
      AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id)), 0) INTO v_commissions;
  RETURN jsonb_build_object(
    'kpis', jsonb_build_object(
      'sales_period', v_sales - v_returns,
      'net_sales', v_sales - v_returns,
      'cost_of_sales', v_cost,
      'gross_profit', v_sales - v_returns - v_cost,
      'commissions', v_commissions,
      'profit_after_commissions', v_sales - v_returns - v_cost - v_commissions,
      'cash', COALESCE((SELECT SUM(monto_apertura) FROM public.sesiones_caja WHERE estado = 'abierta' AND (p_sucursal_id IS NULL OR sucursal_id = p_sucursal_id)), 0),
      'pending_approvals', (SELECT count(*) FROM public.aprobaciones WHERE estado = 'pendiente'),
      'orders', (SELECT count(*) FROM public.pedidos WHERE (created_at AT TIME ZONE 'America/Guatemala')::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR sucursal_id = p_sucursal_id)),
      'quotes', (SELECT count(*) FROM public.cotizaciones WHERE (created_at AT TIME ZONE 'America/Guatemala')::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR sucursal_id = p_sucursal_id))
    ),
    'sales_over_time', '[]'::jsonb,
    'cost_profit_over_time', '[]'::jsonb,
    'sales_by_branch', '[]'::jsonb,
    'sales_by_seller', '[]'::jsonb,
    'customer_type', '[]'::jsonb,
    'products_sold', (SELECT COALESCE(SUM(vi.cantidad), 0) FROM public.venta_items vi JOIN public.ventas v ON v.id = vi.venta_id WHERE v.entregada AND (v.created_at AT TIME ZONE 'America/Guatemala')::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id))
  );
END;
$$;
