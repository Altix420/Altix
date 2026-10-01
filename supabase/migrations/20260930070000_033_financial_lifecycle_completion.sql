-- Cierre de contratos financieros V1.
-- No modifica migraciones ya aplicadas: agrega trazabilidad e idempotencia a
-- saldos a favor, devoluciones, gastos y pagos de cuentas ligadas a pedidos.

ALTER TABLE public.movimientos_saldo_favor
  ADD COLUMN IF NOT EXISTS operation_id TEXT,
  ADD COLUMN IF NOT EXISTS registrado_por UUID REFERENCES public.profiles(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS movimientos_saldo_favor_operation_id_uidx
  ON public.movimientos_saldo_favor(operation_id)
  WHERE operation_id IS NOT NULL;

ALTER TABLE public.ajustes_comision
  ADD COLUMN IF NOT EXISTS operation_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ajustes_comision_operation_id_uidx
  ON public.ajustes_comision(operation_id)
  WHERE operation_id IS NOT NULL;

ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS operation_id TEXT,
  ADD COLUMN IF NOT EXISTS movimiento_caja_id UUID REFERENCES public.movimientos_caja(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS movimiento_reintegro_id UUID REFERENCES public.movimientos_caja(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS gastos_operation_id_uidx
  ON public.gastos(operation_id)
  WHERE operation_id IS NOT NULL;

-- Toda aplicación de saldo a favor debe identificar al actor y la operación.
-- Los cuatro argumentos originales se conservan mediante valores por defecto.
DROP FUNCTION IF EXISTS public.aplicar_saldo_favor(UUID, NUMERIC, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.aplicar_saldo_favor(
  p_cliente_id UUID,
  p_monto NUMERIC,
  p_concepto TEXT,
  p_referencia_id UUID DEFAULT NULL,
  p_operation_id TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT auth.uid()
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_saldo RECORD;
  v_movimiento RECORD;
  v_autorizado BOOLEAN := false;
  v_sucursal_id UUID;
BEGIN
  IF p_monto IS NULL OR p_monto <= 0 OR length(btrim(COALESCE(p_concepto, ''))) = 0 THEN
    RAISE EXCEPTION 'Monto y concepto son obligatorios para aplicar saldo a favor.';
  END IF;
  IF p_actor_id IS NULL OR NOT public.altix_is_active_user(p_actor_id) THEN
    RAISE EXCEPTION 'El usuario responsable no existe o está inactivo.';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_actor_id THEN
    RAISE EXCEPTION 'El usuario autenticado no coincide con el responsable informado.';
  END IF;

  IF p_operation_id IS NOT NULL THEN
    SELECT m.*, s.cliente_id INTO v_movimiento
    FROM public.movimientos_saldo_favor m
    JOIN public.saldos_favor s ON s.id = m.saldo_favor_id
    WHERE m.operation_id = p_operation_id;
    IF FOUND THEN
      IF v_movimiento.cliente_id <> p_cliente_id OR v_movimiento.monto <> p_monto OR v_movimiento.tipo <> 'debito'
         OR v_movimiento.referencia_id IS DISTINCT FROM p_referencia_id
         OR v_movimiento.concepto IS DISTINCT FROM btrim(p_concepto) THEN
        RAISE EXCEPTION 'El operation_id del saldo a favor ya fue usado con otro payload.';
      END IF;
      RETURN;
    END IF;
  END IF;

  -- Un administrador puede aplicar saldo de forma operativa. Un vendedor
  -- solo puede hacerlo contra una cuenta/pedido/venta de su propia cartera.
  IF public.altix_is_admin(p_actor_id) THEN
    PERFORM public.altix_require_admin(p_actor_id);
    v_autorizado := true;
  ELSIF p_referencia_id IS NOT NULL THEN
    SELECT p.sucursal_id INTO v_sucursal_id
    FROM public.pedidos p
    WHERE p.id = p_referencia_id AND p.vendedor_id = p_actor_id AND p.cliente_id = p_cliente_id;
    IF v_sucursal_id IS NULL THEN
      SELECT v.sucursal_id INTO v_sucursal_id
      FROM public.ventas v
      WHERE v.id = p_referencia_id AND v.vendedor_id = p_actor_id AND v.cliente_id = p_cliente_id;
    END IF;
    IF v_sucursal_id IS NULL THEN
      SELECT COALESCE(v.sucursal_id, p.sucursal_id) INTO v_sucursal_id
      FROM public.cuentas_cobrar c
      LEFT JOIN public.pedidos p ON p.id = c.pedido_id
      LEFT JOIN public.ventas v ON v.id = c.venta_id
      WHERE c.id = p_referencia_id
        AND c.cliente_id = p_cliente_id
        AND (p.vendedor_id = p_actor_id OR v.vendedor_id = p_actor_id);
    END IF;
    IF v_sucursal_id IS NOT NULL THEN
      PERFORM public.altix_require_actor(p_actor_id, v_sucursal_id);
      v_autorizado := true;
    END IF;
  END IF;
  IF NOT v_autorizado THEN
    RAISE EXCEPTION 'El vendedor solo puede aplicar saldo a favor en una operación de su cartera.';
  END IF;

  SELECT * INTO v_saldo
  FROM public.saldos_favor
  WHERE cliente_id = p_cliente_id
  FOR UPDATE;
  IF NOT FOUND OR v_saldo.saldo_disponible < p_monto THEN
    RAISE EXCEPTION 'Saldo a favor insuficiente para el cliente.';
  END IF;

  UPDATE public.saldos_favor
  SET saldo_disponible = saldo_disponible - p_monto, updated_at = now()
  WHERE id = v_saldo.id;

  INSERT INTO public.movimientos_saldo_favor
    (saldo_favor_id, monto, tipo, concepto, referencia_id, operation_id, registrado_por)
  VALUES
    (v_saldo.id, p_monto, 'debito', btrim(p_concepto), p_referencia_id, p_operation_id, p_actor_id);
END;
$$;

-- Permite cobrar cuentas creadas en la conversión de pedido, antes de que
-- exista una venta final. También consume saldo a favor de forma atómica.
DROP FUNCTION IF EXISTS public.registrar_pago(UUID, NUMERIC, public.metodo_pago, TEXT, UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.registrar_pago(
  p_cuenta_cobrar_id UUID,
  p_monto NUMERIC,
  p_forma_pago public.metodo_pago,
  p_referencia TEXT,
  p_registrado_por UUID,
  p_sesion_caja_id UUID DEFAULT NULL,
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cuenta RECORD;
  v_pago RECORD;
  v_pago_id UUID;
  v_nuevo NUMERIC;
  v_sesion RECORD;
  v_sucursal_id UUID;
  v_vendedor_id UUID;
  v_venta_id UUID;
BEGIN
  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto del pago debe ser mayor a cero.';
  END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO v_pago FROM public.pagos_credito WHERE operation_id = p_operation_id;
    IF FOUND THEN
      IF v_pago.cuenta_cobrar_id <> p_cuenta_cobrar_id OR v_pago.monto <> p_monto OR v_pago.forma_pago <> p_forma_pago
         OR v_pago.referencia IS DISTINCT FROM NULLIF(btrim(p_referencia), '')
         OR v_pago.registrado_por IS DISTINCT FROM p_registrado_por THEN
        RAISE EXCEPTION 'El operation_id del pago ya fue usado con otro payload.';
      END IF;
      RETURN v_pago.id;
    END IF;
  END IF;

  SELECT * INTO v_cuenta
  FROM public.cuentas_cobrar
  WHERE id = p_cuenta_cobrar_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cuenta por cobrar no existe.'; END IF;

  SELECT COALESCE(v.sucursal_id, p.sucursal_id), COALESCE(v.vendedor_id, p.vendedor_id), v.id
  INTO v_sucursal_id, v_vendedor_id, v_venta_id
  FROM public.cuentas_cobrar c
  LEFT JOIN public.ventas v ON v.id = c.venta_id
  LEFT JOIN public.pedidos p ON p.id = c.pedido_id
  WHERE c.id = p_cuenta_cobrar_id;
  IF v_sucursal_id IS NULL THEN RAISE EXCEPTION 'La cuenta no tiene sucursal operativa.'; END IF;

  IF public.altix_is_admin(p_registrado_por) THEN
    PERFORM public.altix_require_admin(p_registrado_por);
  ELSE
    PERFORM public.altix_require_actor(p_registrado_por, v_sucursal_id);
    IF v_vendedor_id IS DISTINCT FROM p_registrado_por THEN
      RAISE EXCEPTION 'Solo el vendedor responsable puede registrar este pago.';
    END IF;
  END IF;
  IF v_cuenta.estado = 'pagada' OR v_cuenta.saldo_pendiente <= 0 THEN RAISE EXCEPTION 'La cuenta ya está pagada.'; END IF;
  IF p_monto > v_cuenta.saldo_pendiente THEN RAISE EXCEPTION 'El pago excede el saldo pendiente (Q%).', v_cuenta.saldo_pendiente; END IF;

  IF p_forma_pago = 'efectivo' THEN
    IF p_sesion_caja_id IS NULL THEN RAISE EXCEPTION 'Los pagos en efectivo requieren una sesión de caja.'; END IF;
    SELECT * INTO v_sesion FROM public.sesiones_caja WHERE id = p_sesion_caja_id FOR UPDATE;
    IF NOT FOUND OR v_sesion.estado <> 'abierta' OR v_sesion.sucursal_id <> v_sucursal_id THEN
      RAISE EXCEPTION 'La sesión de caja no es válida para esta cuenta.';
    END IF;
  ELSIF p_sesion_caja_id IS NOT NULL THEN
    RAISE EXCEPTION 'La sesión de caja solo aplica a pagos en efectivo.';
  END IF;

  INSERT INTO public.pagos_credito (cuenta_cobrar_id, monto, forma_pago, referencia, registrado_por, operation_id)
  VALUES (p_cuenta_cobrar_id, p_monto, p_forma_pago, NULLIF(btrim(p_referencia), ''), p_registrado_por, p_operation_id)
  RETURNING id INTO v_pago_id;

  IF p_forma_pago = 'saldo_favor' THEN
    PERFORM public.aplicar_saldo_favor(
      v_cuenta.cliente_id, p_monto, 'Pago de cuenta por cobrar', p_cuenta_cobrar_id,
      COALESCE(p_operation_id, 'pago-saldo:' || v_pago_id::text), p_registrado_por
    );
  END IF;

  v_nuevo := ROUND(v_cuenta.saldo_pendiente - p_monto, 2);
  UPDATE public.cuentas_cobrar
  SET saldo_pendiente = v_nuevo,
      estado = CASE WHEN v_nuevo = 0 THEN 'pagada'::estado_cuenta WHEN fecha_vencimiento < CURRENT_DATE THEN 'vencida'::estado_cuenta ELSE 'parcial'::estado_cuenta END
  WHERE id = p_cuenta_cobrar_id;
  IF p_forma_pago = 'efectivo' THEN
    INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id)
    VALUES (p_sesion_caja_id, 'ingreso', p_monto, 'Pago a crédito', v_pago_id, p_operation_id);
  END IF;
  INSERT INTO public.bitacora_auditoria (usuario_id, accion, tabla_afectada, registro_id, datos_nuevos)
  VALUES (p_registrado_por, 'PAGO_CREDITO', 'cuentas_cobrar', p_cuenta_cobrar_id,
          jsonb_build_object('monto', p_monto, 'forma_pago', p_forma_pago, 'saldo_restante', v_nuevo));
  IF v_venta_id IS NOT NULL THEN PERFORM public.generar_comision(v_venta_id); END IF;
  RETURN v_pago_id;
END;
$$;

-- Una devolución produce saldo a favor, deja autoría y revierte la comisión
-- proporcional existente. El inventario se actualiza en la misma transacción.
DROP FUNCTION IF EXISTS public.registrar_devolucion(UUID, TEXT, UUID, JSONB, TEXT, DATE);
CREATE OR REPLACE FUNCTION public.registrar_devolucion(
  p_venta_id UUID,
  p_motivo TEXT,
  p_autorizado_por UUID,
  p_items JSONB,
  p_operation_id TEXT DEFAULT NULL,
  p_fecha_operativa DATE DEFAULT CURRENT_DATE
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_venta RECORD;
  v_existing RECORD;
  v_comision RECORD;
  v_id UUID;
  v_item JSONB;
  v_producto UUID;
  v_cantidad NUMERIC;
  v_precio NUMERIC;
  v_stock NUMERIC;
  v_vendido NUMERIC;
  v_devuelto NUMERIC;
  v_total NUMERIC := 0;
  v_fecha DATE := COALESCE(p_fecha_operativa, CURRENT_DATE);
  v_saldo_id UUID;
BEGIN
  IF p_operation_id IS NULL OR length(btrim(p_operation_id)) = 0 THEN
    RAISE EXCEPTION 'La devolución requiere un operation_id.';
  END IF;
  SELECT * INTO v_venta FROM public.ventas WHERE id = p_venta_id FOR SHARE;
  IF NOT FOUND OR v_venta.cliente_id IS NULL THEN RAISE EXCEPTION 'La venta no existe o no tiene cliente para devolución.'; END IF;
  PERFORM public.altix_require_actor(p_autorizado_por, v_venta.sucursal_id);
  IF length(btrim(COALESCE(p_motivo, ''))) = 0 OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Motivo e items son obligatorios.';
  END IF;
  IF v_fecha < date_trunc('week', CURRENT_DATE)::date OR v_fecha > CURRENT_DATE OR v_fecha < v_venta.created_at::date THEN
    RAISE EXCEPTION 'La fecha operativa de devolución no es válida.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_producto := (v_item->>'producto_id')::UUID;
    v_cantidad := (v_item->>'cantidad')::NUMERIC;
    v_precio := (v_item->>'precio_unitario')::NUMERIC;
    IF v_cantidad <= 0 OR v_precio < 0 THEN RAISE EXCEPTION 'Cantidad o precio inválido en devolución.'; END IF;
    SELECT COALESCE(SUM(cantidad), 0) INTO v_vendido FROM public.venta_items WHERE venta_id = p_venta_id AND producto_id = v_producto;
    SELECT COALESCE(SUM(di.cantidad), 0) INTO v_devuelto
    FROM public.devolucion_items di JOIN public.devoluciones d ON d.id = di.devolucion_id
    WHERE d.venta_id = p_venta_id AND di.producto_id = v_producto;
    IF v_vendido = 0 OR v_devuelto + v_cantidad > v_vendido THEN RAISE EXCEPTION 'La cantidad devuelta excede la venta original.'; END IF;
    v_total := v_total + v_cantidad * v_precio;
  END LOOP;

  SELECT * INTO v_existing FROM public.devoluciones WHERE operation_id = p_operation_id;
  IF FOUND THEN
    IF v_existing.venta_id <> p_venta_id OR v_existing.monto_total <> v_total
       OR v_existing.motivo IS DISTINCT FROM btrim(p_motivo)
       OR v_existing.fecha_operativa IS DISTINCT FROM v_fecha THEN
      RAISE EXCEPTION 'El operation_id de la devolución ya fue usado con otro payload.';
    END IF;
    RETURN v_existing.id;
  END IF;

  INSERT INTO public.devoluciones (venta_id, sucursal_id, cliente_id, monto_total, motivo, autorizado_por, operation_id, fecha_operativa)
  VALUES (p_venta_id, v_venta.sucursal_id, v_venta.cliente_id, v_total, btrim(p_motivo), p_autorizado_por, p_operation_id, v_fecha)
  RETURNING id INTO v_id;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_producto := (v_item->>'producto_id')::UUID; v_cantidad := (v_item->>'cantidad')::NUMERIC; v_precio := (v_item->>'precio_unitario')::NUMERIC;
    SELECT stock INTO v_stock FROM public.inventarios WHERE sucursal_id = v_venta.sucursal_id AND producto_id = v_producto FOR UPDATE;
    IF v_stock IS NULL THEN
      INSERT INTO public.inventarios (sucursal_id, producto_id, stock) VALUES (v_venta.sucursal_id, v_producto, v_cantidad);
      v_stock := 0;
    ELSE
      UPDATE public.inventarios SET stock = stock + v_cantidad WHERE sucursal_id = v_venta.sucursal_id AND producto_id = v_producto;
    END IF;
    INSERT INTO public.devolucion_items (devolucion_id, producto_id, cantidad, precio_unitario, subtotal)
    VALUES (v_id, v_producto, v_cantidad, v_precio, v_cantidad * v_precio);
    INSERT INTO public.movimientos_inventario (sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
    VALUES (v_venta.sucursal_id, v_producto, 'devolucion', v_cantidad, v_stock, v_stock + v_cantidad, 'Devolución ' || v_id, p_autorizado_por);
  END LOOP;

  INSERT INTO public.saldos_favor (cliente_id, saldo_disponible)
  VALUES (v_venta.cliente_id, v_total)
  ON CONFLICT (cliente_id) DO UPDATE SET saldo_disponible = public.saldos_favor.saldo_disponible + EXCLUDED.saldo_disponible
  RETURNING id INTO v_saldo_id;
  INSERT INTO public.movimientos_saldo_favor
    (saldo_favor_id, monto, tipo, concepto, referencia_id, operation_id, registrado_por)
  VALUES (v_saldo_id, v_total, 'credito', 'Saldo a favor por devolución', v_id, p_operation_id || ':saldo', p_autorizado_por);

  SELECT * INTO v_comision FROM public.comisiones WHERE venta_id = p_venta_id ORDER BY created_at DESC LIMIT 1;
  IF FOUND AND v_venta.total > 0 THEN
    INSERT INTO public.ajustes_comision (comision_id, monto_ajuste, motivo, aprobado_por, operation_id)
    VALUES (v_comision.id, -ROUND(v_comision.monto_comision * v_total / v_venta.total, 2), 'Ajuste proporcional por devolución ' || v_id, p_autorizado_por, p_operation_id || ':comision');
  END IF;
  INSERT INTO public.bitacora_auditoria (usuario_id, accion, tabla_afectada, registro_id, datos_nuevos)
  VALUES (p_autorizado_por, 'DEVOLUCION_REGISTRADA', 'devoluciones', v_id,
          jsonb_build_object('venta_id', p_venta_id, 'monto', v_total, 'operation_id', p_operation_id));
  RETURN v_id;
END;
$$;

-- El desembolso físico ocurre al registrar el gasto, aun cuando la aprobación
-- administrativa quede pendiente. Rechazarlo genera un ingreso de reintegro;
-- nunca se borra ni se altera silenciosamente el egreso original.
DROP FUNCTION IF EXISTS public.registrar_gasto(UUID, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.registrar_gasto(
  p_sesion_caja_id UUID,
  p_sucursal_id UUID,
  p_categoria TEXT,
  p_monto NUMERIC,
  p_descripcion TEXT,
  p_comprobante_url TEXT,
  p_registrado_por UUID,
  p_observacion TEXT DEFAULT NULL,
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_gasto_id UUID;
  v_estado TEXT;
  v_movimiento_id UUID;
  v_existing RECORD;
BEGIN
  PERFORM public.altix_require_actor(p_registrado_por, p_sucursal_id);
  IF p_monto IS NULL OR p_monto <= 0 OR length(btrim(COALESCE(p_categoria, ''))) = 0 OR length(btrim(COALESCE(p_descripcion, ''))) = 0 THEN
    RAISE EXCEPTION 'Categoría, descripción y monto son obligatorios.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sesiones_caja WHERE id = p_sesion_caja_id AND sucursal_id = p_sucursal_id AND estado = 'abierta') THEN
    RAISE EXCEPTION 'La sesión de caja no existe o no está abierta.';
  END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.gastos WHERE operation_id = p_operation_id;
    IF FOUND THEN
      IF v_existing.sucursal_id <> p_sucursal_id OR v_existing.sesion_caja_id <> p_sesion_caja_id
         OR v_existing.categoria IS DISTINCT FROM btrim(p_categoria)
         OR v_existing.monto <> p_monto
         OR v_existing.descripcion IS DISTINCT FROM btrim(p_descripcion)
         OR v_existing.registrado_por <> p_registrado_por THEN
        RAISE EXCEPTION 'El operation_id del gasto ya fue usado con otro payload.';
      END IF;
      RETURN v_existing.id;
    END IF;
  END IF;
  v_estado := CASE WHEN public.altix_is_admin(p_registrado_por) THEN 'aprobado' ELSE 'pendiente' END;
  INSERT INTO public.gastos (sesion_caja_id, sucursal_id, categoria, monto, descripcion, comprobante_url, registrado_por, observacion, estado, autorizado_por, autorizado_at, operation_id)
  VALUES (p_sesion_caja_id, p_sucursal_id, btrim(p_categoria), p_monto, btrim(p_descripcion), NULLIF(btrim(p_comprobante_url), ''), p_registrado_por, NULLIF(btrim(p_observacion), ''), v_estado, CASE WHEN v_estado = 'aprobado' THEN p_registrado_por END, CASE WHEN v_estado = 'aprobado' THEN now() END, p_operation_id)
  RETURNING id INTO v_gasto_id;
  INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id)
  VALUES (p_sesion_caja_id, 'egreso', p_monto, 'Gasto: ' || btrim(p_descripcion), v_gasto_id, COALESCE(p_operation_id, 'gasto:' || v_gasto_id::text))
  RETURNING id INTO v_movimiento_id;
  UPDATE public.gastos SET movimiento_caja_id = v_movimiento_id WHERE id = v_gasto_id;
  RETURN v_gasto_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolver_gasto(
  p_gasto_id UUID,
  p_aprobador_id UUID,
  p_aprobar BOOLEAN
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_gasto RECORD;
  v_sesion RECORD;
  v_reintegro_id UUID;
BEGIN
  IF NOT public.altix_is_admin(p_aprobador_id) OR (auth.uid() IS NOT NULL AND auth.uid() <> p_aprobador_id) THEN
    RAISE EXCEPTION 'Solo un administrador autenticado puede resolver gastos.';
  END IF;
  SELECT * INTO v_gasto FROM public.gastos WHERE id = p_gasto_id FOR UPDATE;
  IF NOT FOUND OR v_gasto.estado <> 'pendiente' THEN RAISE EXCEPTION 'El gasto no esta pendiente.'; END IF;
  SELECT * INTO v_sesion FROM public.sesiones_caja WHERE id = v_gasto.sesion_caja_id FOR UPDATE;
  IF NOT FOUND OR v_sesion.estado <> 'abierta' THEN RAISE EXCEPTION 'La sesion de caja del gasto ya esta cerrada.'; END IF;

  UPDATE public.gastos
  SET estado = CASE WHEN p_aprobar THEN 'aprobado' ELSE 'rechazado' END,
      autorizado_por = p_aprobador_id, autorizado_at = now()
  WHERE id = p_gasto_id;

  IF NOT p_aprobar AND v_gasto.movimiento_caja_id IS NOT NULL AND v_gasto.movimiento_reintegro_id IS NULL THEN
    INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id)
    VALUES (v_gasto.sesion_caja_id, 'ingreso', v_gasto.monto, 'Reintegro de gasto rechazado: ' || v_gasto.descripcion, p_gasto_id, 'gasto-reintegro:' || p_gasto_id::text)
    RETURNING id INTO v_reintegro_id;
    UPDATE public.gastos SET movimiento_reintegro_id = v_reintegro_id WHERE id = p_gasto_id;
  END IF;
  RETURN p_gasto_id;
END;
$$;
