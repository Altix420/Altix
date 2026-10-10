-- 044: canonical cash ledger, branch-safe expense approval and mobile-safe
-- product image relations. Existing data is preserved.

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS pagos_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.calcular_efectivo_esperado(p_sesion_caja_id UUID)
RETURNS NUMERIC(12,2)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ROUND(
    s.monto_apertura + COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE -m.monto END), 0),
    2
  )
  FROM public.sesiones_caja s
  LEFT JOIN public.movimientos_caja m ON m.sesion_caja_id = s.id
  WHERE s.id = p_sesion_caja_id
  GROUP BY s.id, s.monto_apertura;
$$;

GRANT EXECUTE ON FUNCTION public.calcular_efectivo_esperado(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.cerrar_caja(
  p_sesion_caja_id UUID,
  p_denominaciones JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sesion RECORD;
  v_input JSONB := COALESCE(p_denominaciones, '{}'::jsonb);
  v_counts JSONB;
  v_esperado NUMERIC(12,2);
  v_fisico NUMERIC(12,2);
  v_diferencia NUMERIC(12,2);
  v_actor UUID := auth.uid();
BEGIN
  SELECT * INTO v_sesion FROM public.sesiones_caja WHERE id = p_sesion_caja_id FOR UPDATE;
  IF NOT FOUND OR v_sesion.estado <> 'abierta' THEN
    RAISE EXCEPTION 'La sesión de caja no existe o ya está cerrada.';
  END IF;
  IF v_actor IS NULL OR (NOT public.altix_is_admin(v_actor) AND v_actor <> v_sesion.usuario_id) THEN
    RAISE EXCEPTION 'No estás autorizado para cerrar esta sesión de caja.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.gastos WHERE sesion_caja_id = p_sesion_caja_id AND estado = 'pendiente') THEN
    RAISE EXCEPTION 'No se puede cerrar la caja mientras existan gastos pendientes de aprobación.';
  END IF;
  IF jsonb_typeof(v_input) <> 'object' THEN
    RAISE EXCEPTION 'El conteo de denominaciones no es válido.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_each_text(v_input) j
    WHERE j.key IN ('q200', 'q100', 'q50', 'q20', 'q10', 'q5')
      AND j.value <> ''
      AND j.value !~ '^[0-9]+$'
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_each_text(v_input) j
    WHERE j.key = 'monedas'
      AND j.value <> ''
      AND j.value !~ '^[0-9]+([.][0-9]+)?$'
  ) THEN
    RAISE EXCEPTION 'Las cantidades de efectivo deben ser números no negativos.';
  END IF;

  v_counts := jsonb_build_object(
    'q200', COALESCE(NULLIF(v_input->>'q200', '')::NUMERIC, 0),
    'q100', COALESCE(NULLIF(v_input->>'q100', '')::NUMERIC, 0),
    'q50', COALESCE(NULLIF(v_input->>'q50', '')::NUMERIC, 0),
    'q20', COALESCE(NULLIF(v_input->>'q20', '')::NUMERIC, 0),
    'q10', COALESCE(NULLIF(v_input->>'q10', '')::NUMERIC, 0),
    'q5', COALESCE(NULLIF(v_input->>'q5', '')::NUMERIC, 0),
    'monedas', COALESCE(NULLIF(v_input->>'monedas', '')::NUMERIC, 0)
  );
  v_fisico :=
    (v_counts->>'q200')::NUMERIC * 200
    + (v_counts->>'q100')::NUMERIC * 100
    + (v_counts->>'q50')::NUMERIC * 50
    + (v_counts->>'q20')::NUMERIC * 20
    + (v_counts->>'q10')::NUMERIC * 10
    + (v_counts->>'q5')::NUMERIC * 5
    + (v_counts->>'monedas')::NUMERIC;
  v_esperado := public.calcular_efectivo_esperado(p_sesion_caja_id);
  IF v_esperado IS NULL THEN RAISE EXCEPTION 'No se pudo calcular el efectivo esperado.'; END IF;
  v_diferencia := ROUND(v_fisico - v_esperado, 2);
  UPDATE public.sesiones_caja
  SET monto_cierre = v_fisico,
      monto_esperado = v_esperado,
      diferencia = v_diferencia,
      conteo_denominaciones = v_counts,
      cerrado_por = v_actor,
      fecha_cierre = now(),
      estado = 'cerrada'
  WHERE id = p_sesion_caja_id;
  RETURN jsonb_build_object('monto_fisico', v_fisico, 'monto_esperado', v_esperado, 'diferencia', v_diferencia);
END;
$$;

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
  v_estado TEXT := 'pendiente';
BEGIN
  IF public.altix_is_admin(p_registrado_por) THEN
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_registrado_por THEN
      RAISE EXCEPTION 'El usuario autenticado no coincide con el responsable informado.';
    END IF;
  ELSE
    PERFORM public.altix_require_actor(p_registrado_por, p_sucursal_id);
  END IF;
  IF p_monto IS NULL OR p_monto <= 0 OR length(btrim(COALESCE(p_categoria, ''))) = 0 OR length(btrim(COALESCE(p_descripcion, ''))) = 0 THEN
    RAISE EXCEPTION 'Categoría, descripción y monto son obligatorios.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sucursales WHERE id = v_imputada AND activa) THEN
    RAISE EXCEPTION 'La sucursal imputada no existe o está inactiva.';
  END IF;
  IF p_sesion_caja_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sesiones_caja
    WHERE id = p_sesion_caja_id AND sucursal_id = p_sucursal_id AND estado = 'abierta'
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
  INSERT INTO public.gastos(
    sesion_caja_id, sucursal_id, sucursal_imputada_id, categoria, monto, descripcion,
    comprobante_url, registrado_por, observacion, estado, operation_id
  ) VALUES (
    p_sesion_caja_id, p_sucursal_id, v_imputada, btrim(p_categoria), p_monto,
    btrim(p_descripcion), NULLIF(btrim(p_comprobante_url), ''), p_registrado_por,
    NULLIF(btrim(p_observacion), ''), v_estado, p_operation_id
  ) RETURNING id INTO v_gasto_id;
  RETURN v_gasto_id;
END;
$$;

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
  v_sucursal_nombre TEXT;
  v_movimiento_id UUID;
BEGIN
  IF NOT public.altix_is_admin(p_aprobador_id) OR (auth.uid() IS NOT NULL AND auth.uid() <> p_aprobador_id) THEN
    RAISE EXCEPTION 'Solo un administrador autenticado puede resolver gastos.';
  END IF;
  SELECT * INTO v_gasto FROM public.gastos WHERE id = p_gasto_id FOR UPDATE;
  IF NOT FOUND OR v_gasto.estado <> 'pendiente' THEN RAISE EXCEPTION 'El gasto no está pendiente.'; END IF;
  IF p_aprobar THEN
    SELECT s.nombre INTO v_sucursal_nombre FROM public.sucursales s WHERE s.id = v_gasto.sucursal_imputada_id;
    IF p_sesion_caja_id IS NULL THEN
      RAISE EXCEPTION 'No existe una caja abierta en % para aplicar este gasto.', COALESCE(v_sucursal_nombre, 'la sucursal imputada');
    END IF;
    SELECT * INTO v_sesion FROM public.sesiones_caja WHERE id = p_sesion_caja_id FOR UPDATE;
    IF NOT FOUND OR v_sesion.estado <> 'abierta' OR v_sesion.sucursal_id IS DISTINCT FROM v_gasto.sucursal_imputada_id THEN
      RAISE EXCEPTION 'La sesión seleccionada no pertenece a la caja abierta de %.', COALESCE(v_sucursal_nombre, 'la sucursal imputada');
    END IF;
  END IF;
  UPDATE public.gastos
  SET estado = CASE WHEN p_aprobar THEN 'aprobado' ELSE 'rechazado' END,
      autorizado_por = p_aprobador_id,
      autorizado_at = now(),
      sesion_caja_id = CASE WHEN p_aprobar THEN p_sesion_caja_id ELSE sesion_caja_id END
  WHERE id = p_gasto_id;
  IF p_aprobar THEN
    INSERT INTO public.movimientos_caja(sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id, registrado_por)
    VALUES (p_sesion_caja_id, 'egreso', v_gasto.monto, 'Gasto aprobado: ' || v_gasto.descripcion, p_gasto_id, 'gasto-aprobacion:' || p_gasto_id::TEXT, p_aprobador_id)
    ON CONFLICT (operation_id) DO UPDATE SET operation_id = EXCLUDED.operation_id
    RETURNING id INTO v_movimiento_id;
    UPDATE public.gastos SET movimiento_caja_id = v_movimiento_id WHERE id = p_gasto_id;
  END IF;
  RETURN p_gasto_id;
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
  v_cash_session_id UUID := CASE WHEN p_forma_pago = 'efectivo' THEN p_sesion_caja_id ELSE NULL END;
BEGIN
  SELECT * INTO v_order FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND OR v_order.cliente_id <> p_cliente_id THEN RAISE EXCEPTION 'El pedido o cliente no es válido.'; END IF;
  IF public.altix_is_admin() THEN PERFORM public.altix_require_admin(p_registrado_por); ELSE PERFORM public.altix_require_actor(v_order.vendedor_id, v_order.sucursal_id); END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.anticipos WHERE operation_id = p_operation_id;
    IF FOUND THEN
      IF v_existing.pedido_id <> p_pedido_id OR v_existing.monto <> p_monto OR v_existing.forma_pago <> p_forma_pago THEN RAISE EXCEPTION 'El operation_id del anticipo ya fue usado con otro payload.'; END IF;
      RETURN v_existing.id;
    END IF;
  END IF;
  IF v_order.estado IN ('entregado', 'cancelado') THEN RAISE EXCEPTION 'El pedido ya no acepta anticipos.'; END IF;
  IF p_monto IS NULL OR p_monto <= 0 OR p_monto > v_order.saldo_pendiente THEN RAISE EXCEPTION 'El anticipo debe ser mayor a cero y no superar el saldo pendiente.'; END IF;
  IF p_forma_pago = 'credito' THEN RAISE EXCEPTION 'Crédito no es una forma de pago de un anticipo.'; END IF;
  IF p_forma_pago = 'efectivo' THEN
    IF v_cash_session_id IS NULL THEN RAISE EXCEPTION 'Los anticipos en efectivo requieren caja abierta.'; END IF;
    SELECT * INTO v_session FROM public.sesiones_caja WHERE id = v_cash_session_id FOR UPDATE;
    IF NOT FOUND OR v_session.estado <> 'abierta' OR v_session.sucursal_id <> v_order.sucursal_id THEN RAISE EXCEPTION 'La sesión de caja no es válida para el pedido.'; END IF;
  ELSIF p_forma_pago = 'saldo_favor' THEN
    PERFORM public.aplicar_saldo_favor(p_cliente_id, p_monto, 'Anticipo de pedido', p_pedido_id);
  END IF;
  INSERT INTO public.anticipos(pedido_id, cliente_id, monto, forma_pago, comprobante_ref, registrado_por, sesion_caja_id, operation_id)
  VALUES (p_pedido_id, p_cliente_id, p_monto, p_forma_pago, NULLIF(btrim(p_comprobante_ref), ''), p_registrado_por, v_cash_session_id, p_operation_id)
  RETURNING id INTO v_advance_id;
  v_new_balance := ROUND(v_order.saldo_pendiente - p_monto, 2);
  UPDATE public.pedidos SET saldo_pendiente = v_new_balance WHERE id = p_pedido_id;
  IF v_order.metodo_pago = 'credito' THEN
    SELECT * INTO v_account FROM public.cuentas_cobrar WHERE pedido_id = p_pedido_id FOR UPDATE;
    IF FOUND THEN
      UPDATE public.cuentas_cobrar SET saldo_pendiente = v_new_balance, estado = CASE WHEN v_new_balance = 0 THEN 'pagada'::estado_cuenta WHEN fecha_vencimiento < CURRENT_DATE THEN 'vencida'::estado_cuenta ELSE 'parcial'::estado_cuenta END WHERE id = v_account.id;
      INSERT INTO public.pagos_credito(cuenta_cobrar_id, monto, forma_pago, referencia, registrado_por, operation_id) VALUES (v_account.id, p_monto, p_forma_pago, NULLIF(btrim(p_comprobante_ref), ''), p_registrado_por, p_operation_id);
    END IF;
  END IF;
  IF p_forma_pago = 'efectivo' THEN
    INSERT INTO public.movimientos_caja(sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id) VALUES (v_cash_session_id, 'ingreso', p_monto, 'Anticipo de pedido ' || substring(p_pedido_id::text, 1, 8), v_advance_id, p_operation_id);
  END IF;
  RETURN v_advance_id;
END;
$$;

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
  v_snapshot JSONB;
BEGIN
  IF p_confirmado_por IS NULL OR NOT public.altix_is_active_user(p_confirmado_por) THEN RAISE EXCEPTION 'El usuario confirmado no existe o está inactivo.'; END IF;
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_confirmado_por THEN RAISE EXCEPTION 'El usuario autenticado no coincide con el responsable.'; END IF;
  SELECT * INTO v_order FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El pedido no existe.'; END IF;
  IF NOT public.altix_is_admin(p_confirmado_por) THEN PERFORM public.altix_require_actor(p_confirmado_por, v_order.sucursal_id); IF v_order.vendedor_id IS DISTINCT FROM p_confirmado_por THEN RAISE EXCEPTION 'El vendedor no puede confirmar un pedido que no le pertenece.'; END IF; ELSE PERFORM public.altix_require_admin(p_confirmado_por); END IF;
  IF v_order.estado = 'cancelado' THEN RAISE EXCEPTION 'El pedido está cancelado.'; END IF;
  SELECT id INTO v_sale_id FROM public.ventas WHERE pedido_id = p_pedido_id;
  IF v_sale_id IS NOT NULL THEN RETURN v_sale_id; END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.ventas WHERE operation_id = p_operation_id;
    IF FOUND THEN IF v_existing.pedido_id IS DISTINCT FROM p_pedido_id THEN RAISE EXCEPTION 'El operation_id ya fue usado con otro pedido.'; END IF; RETURN v_existing.id; END IF;
  END IF;
  IF v_order.estado NOT IN ('pendiente', 'en_produccion', 'listo') THEN RAISE EXCEPTION 'El pedido no está listo para confirmarse.'; END IF;
  v_due := ROUND(GREATEST(COALESCE(v_order.saldo_pendiente, 0), 0), 2);
  v_payment := COALESCE(p_forma_pago, v_order.metodo_pago);
  IF p_monto_recibido IS NULL OR p_monto_recibido < 0 OR p_monto_recibido > v_due THEN RAISE EXCEPTION 'El monto recibido no es válido para el saldo pendiente.'; END IF;
  IF v_due > 0 AND p_monto_recibido <> v_due THEN RAISE EXCEPTION 'El pedido debe quedar totalmente pagado antes de finalizarse.'; END IF;
  IF v_due > 0 AND v_payment = 'credito' THEN RAISE EXCEPTION 'El crédito debe estar autorizado y pagado antes de finalizarse.'; END IF;
  IF p_monto_recibido > 0 AND v_payment = 'credito' THEN RAISE EXCEPTION 'Un cobro recibido no puede registrarse como crédito.'; END IF;
  IF p_monto_recibido > 0 AND v_payment = 'efectivo' THEN
    IF p_sesion_caja_id IS NULL THEN RAISE EXCEPTION 'No hay una caja abierta para esta sucursal.'; END IF;
    SELECT * INTO v_session FROM public.sesiones_caja WHERE id = p_sesion_caja_id FOR UPDATE;
    IF NOT FOUND OR v_session.estado <> 'abierta' OR v_session.sucursal_id <> v_order.sucursal_id THEN RAISE EXCEPTION 'No hay una caja abierta para esta sucursal.'; END IF;
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('tipo', 'anticipo', 'id', a.id, 'monto', a.monto, 'forma_pago', a.forma_pago, 'sesion_caja_id', a.sesion_caja_id) ORDER BY a.created_at), '[]'::jsonb)
  INTO v_snapshot FROM public.anticipos a WHERE a.pedido_id = p_pedido_id;
  IF p_monto_recibido > 0 THEN v_snapshot := v_snapshot || jsonb_build_array(jsonb_build_object('tipo', 'pago_final', 'monto', p_monto_recibido, 'forma_pago', v_payment, 'sesion_caja_id', CASE WHEN v_payment = 'efectivo' THEN p_sesion_caja_id ELSE NULL END)); END IF;
  INSERT INTO public.ventas(pedido_id, sucursal_id, cliente_id, vendedor_id, total, forma_pago, operation_id, pagos_snapshot, entregada, entregada_at, entregada_por)
  VALUES (p_pedido_id, v_order.sucursal_id, v_order.cliente_id, v_order.vendedor_id, v_order.total, v_payment, p_operation_id, v_snapshot, true, now(), p_confirmado_por)
  ON CONFLICT (pedido_id) WHERE pedido_id IS NOT NULL DO NOTHING RETURNING id INTO v_sale_id;
  IF v_sale_id IS NULL THEN SELECT id INTO v_sale_id FROM public.ventas WHERE pedido_id = p_pedido_id; IF v_sale_id IS NULL THEN RAISE EXCEPTION 'No se pudo recuperar la venta idempotente.'; END IF; RETURN v_sale_id; END IF;
  FOR v_item IN SELECT * FROM public.pedido_items WHERE pedido_id = p_pedido_id LOOP
    IF v_item.producto_id IS NULL THEN CONTINUE; END IF;
    SELECT stock INTO v_stock FROM public.inventarios WHERE sucursal_id = v_order.sucursal_id AND producto_id = v_item.producto_id FOR UPDATE;
    IF v_stock IS NULL OR v_stock < v_item.cantidad THEN RAISE EXCEPTION 'Stock insuficiente para cerrar el pedido.'; END IF;
    INSERT INTO public.venta_items(venta_id, producto_id, diseno_id, extra_id, cantidad, precio_unitario, subtotal, descuento, snapshot_economico)
    VALUES (v_sale_id, v_item.producto_id, v_item.diseno_id, v_item.extra_id, v_item.cantidad, v_item.precio_unitario, v_item.subtotal, v_item.descuento, jsonb_build_object('pedido_item_id', v_item.id, 'extras', COALESCE((SELECT jsonb_agg(jsonb_build_object('extra_id', pie.extra_id, 'precio_adicional', pie.precio_adicional)) FROM public.pedido_item_extras pie WHERE pie.pedido_item_id = v_item.id), '[]'::jsonb), 'snapshot', COALESCE(v_item.snapshot_economico, '{}'::jsonb)));
    UPDATE public.inventarios SET stock = stock - v_item.cantidad WHERE sucursal_id = v_order.sucursal_id AND producto_id = v_item.producto_id;
    INSERT INTO public.movimientos_inventario(sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id) VALUES (v_order.sucursal_id, v_item.producto_id, 'salida', v_item.cantidad, v_stock, v_stock - v_item.cantidad, 'Venta por pedido ' || v_order.id, p_confirmado_por);
  END LOOP;
  IF v_due > 0 THEN
    UPDATE public.pedidos SET saldo_pendiente = 0 WHERE id = p_pedido_id;
    SELECT * INTO v_account FROM public.cuentas_cobrar WHERE pedido_id = p_pedido_id FOR UPDATE;
    IF FOUND THEN UPDATE public.cuentas_cobrar SET venta_id = v_sale_id, saldo_pendiente = 0, estado = 'pagada' WHERE id = v_account.id; END IF;
  END IF;
  IF p_monto_recibido > 0 AND v_payment = 'efectivo' THEN
    INSERT INTO public.movimientos_caja(sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id) VALUES (p_sesion_caja_id, 'ingreso', p_monto_recibido, 'Pago final de pedido ' || substring(p_pedido_id::text, 1, 8), v_sale_id, p_operation_id || ':pago');
  END IF;
  v_received_by := NULLIF(btrim(COALESCE(p_recibido_por, '')), '');
  IF v_received_by IS NULL THEN SELECT COALESCE(nombre_completo, 'Cliente') INTO v_received_by FROM public.profiles WHERE id = p_confirmado_por; END IF;
  INSERT INTO public.entregas(pedido_id, venta_id, recibido_por, entregado_por, entregado_at, operation_id) VALUES (p_pedido_id, v_sale_id, COALESCE(v_received_by, 'Cliente'), p_confirmado_por, now(), p_operation_id || ':entrega') ON CONFLICT (pedido_id) DO NOTHING;
  UPDATE public.pedidos SET estado = 'entregado', saldo_pendiente = 0 WHERE id = p_pedido_id;
  PERFORM public.generar_comision(v_sale_id);
  RETURN v_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_gasto(UUID, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolver_gasto(UUID, UUID, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_anticipo_v1(UUID, UUID, NUMERIC, public.metodo_pago, TEXT, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_pedido_venta(UUID, UUID, NUMERIC, public.metodo_pago, TEXT, UUID, TEXT) TO authenticated;
