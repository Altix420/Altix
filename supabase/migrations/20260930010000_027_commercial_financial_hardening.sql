-- Commercial and financial hardening for quote economics, approvals and cash closure.

-- Quote rows are written through SECURITY DEFINER business RPCs only. In
-- particular, an authenticated client must not be able to edit estado directly.
DROP POLICY IF EXISTS "Permitir insercion/edicion de cotizaciones" ON public.cotizaciones;
DROP POLICY IF EXISTS "Admin actualiza cotizaciones" ON public.cotizaciones;
CREATE POLICY "Admin actualiza cotizaciones" ON public.cotizaciones
  FOR UPDATE TO authenticated
  USING (public.altix_is_admin())
  WITH CHECK (public.altix_is_admin());

CREATE OR REPLACE FUNCTION public.protect_quote_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF OLD.estado <> 'enviada' OR NEW.estado <> 'convertida' THEN
      RAISE EXCEPTION 'El estado de la cotizacion solo puede avanzar mediante el flujo de conversion autorizado.';
    END IF;
    IF NOT COALESCE(NEW.cliente_acepto, false) THEN
      RAISE EXCEPTION 'La cotizacion debe tener aceptacion del cliente antes de convertirse.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_quote_requires_acceptance ON public.cotizaciones;
DROP TRIGGER IF EXISTS trg_quote_state_protected ON public.cotizaciones;
CREATE TRIGGER trg_quote_state_protected
BEFORE UPDATE OF estado ON public.cotizaciones
FOR EACH ROW EXECUTE FUNCTION public.protect_quote_state();

-- One pending discount request belongs to one quote draft. The draft id is promoted
-- to the final quote id after the quote commits.
CREATE UNIQUE INDEX IF NOT EXISTS aprobaciones_descuento_borrador_pendiente_uidx
  ON public.aprobaciones(referencia_id)
  WHERE tipo = 'descuento' AND referencia_tabla = 'cotizacion_borrador'
    AND estado = 'pendiente' AND referencia_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.solicitar_aprobacion(
  p_tipo TEXT,
  p_sucursal_id UUID,
  p_solicitante_id UUID,
  p_referencia_tabla TEXT DEFAULT NULL,
  p_referencia_id UUID DEFAULT NULL,
  p_valor_solicitado NUMERIC DEFAULT NULL,
  p_datos_solicitados JSONB DEFAULT '{}'::jsonb,
  p_motivo TEXT DEFAULT NULL,
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing UUID;
BEGIN
  IF p_tipo NOT IN ('descuento', 'precio_especial', 'cliente_mayorista', 'credito', 'pedido_especial', 'otro') THEN
    RAISE EXCEPTION 'El tipo de aprobacion no esta soportado por este RPC.';
  END IF;
  PERFORM public.altix_require_actor(p_solicitante_id, p_sucursal_id);
  IF length(btrim(COALESCE(p_motivo, ''))) = 0 THEN
    RAISE EXCEPTION 'El motivo de aprobacion es obligatorio.';
  END IF;
  IF p_tipo = 'descuento' AND p_referencia_tabla = 'cotizacion_borrador' AND p_referencia_id IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM public.aprobaciones
    WHERE tipo = 'descuento'
      AND referencia_tabla = 'cotizacion_borrador'
      AND referencia_id = p_referencia_id
      AND estado = 'pendiente'
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;
    IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  END IF;
  RETURN public.altix_crear_aprobacion(
    p_tipo, p_solicitante_id, p_sucursal_id, p_referencia_tabla, p_referencia_id,
    p_valor_solicitado, p_datos_solicitados, p_motivo, p_operation_id
  );
END;
$$;

-- An approved credit request immediately becomes an operational authorization.
-- The administrator can still reduce or extend the terms through its dedicated RPC.
CREATE OR REPLACE FUNCTION public.resolver_aprobacion(
  p_aprobacion_id UUID,
  p_revisado_por UUID,
  p_aprobar BOOLEAN,
  p_nota_resolucion TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request RECORD;
BEGIN
  PERFORM public.altix_require_admin(p_revisado_por);
  SELECT * INTO v_request FROM public.aprobaciones WHERE id = p_aprobacion_id FOR UPDATE;
  IF NOT FOUND OR v_request.estado <> 'pendiente' THEN
    RAISE EXCEPTION 'La aprobacion no esta pendiente.';
  END IF;
  IF v_request.tipo IN ('ajuste_inventario', 'gasto') THEN
    RAISE EXCEPTION 'Los ajustes y gastos deben resolverse desde su RPC operativo.';
  END IF;
  UPDATE public.aprobaciones
  SET estado = CASE WHEN p_aprobar THEN 'aprobada' ELSE 'rechazada' END,
      revisado_por = p_revisado_por,
      revisado_at = now(),
      nota_resolucion = NULLIF(btrim(p_nota_resolucion), '')
  WHERE id = p_aprobacion_id;
  IF p_aprobar AND v_request.tipo IN ('cliente_mayorista', 'credito')
     AND v_request.referencia_tabla = 'clientes' AND v_request.referencia_id IS NOT NULL THEN
    UPDATE public.clientes
    SET monto_autorizado = GREATEST(monto_autorizado, COALESCE(v_request.valor_solicitado, 0))
    WHERE id = v_request.referencia_id AND es_mayorista AND activo;
  END IF;
  RETURN p_aprobacion_id;
END;
$$;

-- Do not close a session while a seller expense is waiting for approval. This
-- prevents a later approval from mutating an already closed cash ledger.
CREATE OR REPLACE FUNCTION public.cerrar_caja(
  p_sesion_caja_id UUID,
  p_denominaciones JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sesion RECORD;
  v_esperado NUMERIC(12,2);
  v_fisico NUMERIC(12,2);
  v_diferencia NUMERIC(12,2);
  v_actor UUID := auth.uid();
  v_counts JSONB := COALESCE(p_denominaciones, '{}'::jsonb);
BEGIN
  SELECT * INTO v_sesion FROM public.sesiones_caja WHERE id = p_sesion_caja_id FOR UPDATE;
  IF NOT FOUND OR v_sesion.estado <> 'abierta' THEN
    RAISE EXCEPTION 'La sesion de caja no existe o ya esta cerrada.';
  END IF;
  IF v_actor IS NULL OR (NOT public.altix_is_admin(v_actor) AND v_actor <> v_sesion.usuario_id) THEN
    RAISE EXCEPTION 'No estas autorizado para cerrar esta sesion de caja.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.gastos WHERE sesion_caja_id = p_sesion_caja_id AND estado = 'pendiente') THEN
    RAISE EXCEPTION 'No se puede cerrar la caja mientras existan gastos pendientes de aprobacion.';
  END IF;
  IF jsonb_typeof(v_counts) <> 'object' THEN
    RAISE EXCEPTION 'El conteo de denominaciones no es valido.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_each_text(v_counts) j
    WHERE j.key <> 'monedas' AND (j.value !~ '^[0-9]+([.][0-9]+)?$' OR j.value::NUMERIC < 0)
  ) OR (v_counts ? 'monedas' AND ((v_counts->>'monedas') !~ '^[0-9]+([.][0-9]+)?$' OR (v_counts->>'monedas')::NUMERIC < 0)) THEN
    RAISE EXCEPTION 'Las cantidades de efectivo deben ser numeros no negativos.';
  END IF;
  v_fisico :=
    COALESCE((v_counts->>'q200')::NUMERIC, 0) * 200
    + COALESCE((v_counts->>'q100')::NUMERIC, 0) * 100
    + COALESCE((v_counts->>'q50')::NUMERIC, 0) * 50
    + COALESCE((v_counts->>'q20')::NUMERIC, 0) * 20
    + COALESCE((v_counts->>'q10')::NUMERIC, 0) * 10
    + COALESCE((v_counts->>'q5')::NUMERIC, 0) * 5
    + COALESCE((v_counts->>'monedas')::NUMERIC, 0);
  SELECT v_sesion.monto_apertura + COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0)
  INTO v_esperado FROM public.movimientos_caja WHERE sesion_caja_id = p_sesion_caja_id;
  v_diferencia := v_fisico - v_esperado;
  UPDATE public.sesiones_caja
  SET monto_cierre = v_fisico, monto_esperado = v_esperado, diferencia = v_diferencia,
      conteo_denominaciones = v_counts, cerrado_por = v_actor, fecha_cierre = now(), estado = 'cerrada'
  WHERE id = p_sesion_caja_id;
  RETURN jsonb_build_object('monto_fisico', v_fisico, 'monto_esperado', v_esperado, 'diferencia', v_diferencia);
END;
$$;

-- Resolving a pending expense locks and validates the session before writing its
-- cash movement. Closed sessions remain immutable.
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
BEGIN
  IF NOT public.altix_is_admin(p_aprobador_id) OR (auth.uid() IS NOT NULL AND auth.uid() <> p_aprobador_id) THEN
    RAISE EXCEPTION 'Solo un administrador autenticado puede resolver gastos.';
  END IF;
  SELECT * INTO v_gasto FROM public.gastos WHERE id = p_gasto_id FOR UPDATE;
  IF NOT FOUND OR v_gasto.estado <> 'pendiente' THEN
    RAISE EXCEPTION 'El gasto no esta pendiente.';
  END IF;
  SELECT * INTO v_sesion FROM public.sesiones_caja WHERE id = v_gasto.sesion_caja_id FOR UPDATE;
  IF NOT FOUND OR v_sesion.estado <> 'abierta' THEN
    RAISE EXCEPTION 'La sesion de caja del gasto ya esta cerrada.';
  END IF;
  UPDATE public.gastos
  SET estado = CASE WHEN p_aprobar THEN 'aprobado' ELSE 'rechazado' END,
      autorizado_por = p_aprobador_id, autorizado_at = now()
  WHERE id = p_gasto_id;
  IF p_aprobar THEN
    INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id)
    VALUES (v_gasto.sesion_caja_id, 'egreso', v_gasto.monto, 'Gasto: ' || v_gasto.descripcion, p_gasto_id);
  END IF;
  RETURN p_gasto_id;
END;
$$;

-- Quote economics are canonical: precio_unitario is the official unit price and
-- descuento is the total discount for the line, never a second unit deduction.
DROP FUNCTION IF EXISTS public.crear_cotizacion(UUID, UUID, UUID, NUMERIC, DATE, TEXT, JSONB, public.metodo_pago, TEXT, UUID);
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
  p_cotizacion_borrador_id UUID DEFAULT NULL
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
BEGIN
  PERFORM public.altix_require_actor(p_vendedor_id, p_sucursal_id);
  IF p_total IS NULL OR p_total <= 0 OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La cotizacion debe tener un total y al menos un item.';
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
    IF NULLIF(v_item->>'producto_id', '') IS NULL AND NULLIF(v_item->>'diseno_id', '') IS NULL AND NULLIF(v_item->>'extra_id', '') IS NULL THEN
      RAISE EXCEPTION 'Cada item debe referenciar producto, diseno o extra.';
    END IF;
    IF NULLIF(v_item->>'producto_id', '') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.productos WHERE id = (v_item->>'producto_id')::UUID AND activo) THEN
      RAISE EXCEPTION 'El producto del item no existe o esta inactivo.';
    END IF;
    IF NULLIF(v_item->>'diseno_id', '') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.disenos WHERE id = (v_item->>'diseno_id')::UUID) THEN
      RAISE EXCEPTION 'El diseno seleccionado no existe.';
    END IF;
    IF NULLIF(v_item->>'extra_id', '') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.extras WHERE id = (v_item->>'extra_id')::UUID AND activo) THEN
      RAISE EXCEPTION 'El extra seleccionado no existe o esta inactivo.';
    END IF;
    v_qty := (v_item->>'cantidad')::NUMERIC;
    v_price := (v_item->>'precio_unitario')::NUMERIC;
    v_discount := COALESCE(NULLIF(v_item->>'descuento', '')::NUMERIC, 0);
    IF v_qty IS NULL OR v_qty <= 0 OR v_price IS NULL OR v_price < 0 OR v_discount < 0 OR v_discount > v_qty * v_price THEN
      RAISE EXCEPTION 'Cantidad, precio o descuento invalido en la cotizacion.';
    END IF;
    v_total_discount := v_total_discount + v_discount;
    v_subtotal := ROUND(v_qty * v_price - v_discount, 2);
    IF ABS(v_subtotal - COALESCE((v_item->>'subtotal')::NUMERIC, v_subtotal)) > 0.01 THEN
      RAISE EXCEPTION 'El subtotal de un item no coincide con su cantidad, precio y descuento.';
    END IF;
    v_sum := v_sum + v_subtotal;
  END LOOP;
  IF v_total_discount > 0 THEN
    IF p_cotizacion_borrador_id IS NULL THEN
      RAISE EXCEPTION 'El descuento debe estar vinculado a un borrador de cotizacion.';
    END IF;
    SELECT * INTO v_approval FROM public.aprobaciones
    WHERE id = p_aprobacion_id AND tipo = 'descuento' AND estado = 'aprobada'
      AND solicitante_id = p_vendedor_id AND sucursal_id = p_sucursal_id
      AND referencia_tabla = 'cotizacion_borrador' AND referencia_id = p_cotizacion_borrador_id
    FOR UPDATE;
    IF NOT FOUND OR COALESCE(v_approval.valor_solicitado, 0) < v_total_discount THEN
      RAISE EXCEPTION 'El descuento requiere una aprobacion vigente para esta cotizacion.';
    END IF;
  ELSIF p_aprobacion_id IS NOT NULL OR p_cotizacion_borrador_id IS NOT NULL THEN
    RAISE EXCEPTION 'No se puede asociar una aprobacion a una cotizacion sin descuento.';
  END IF;
  IF ABS(v_sum - p_total) > 0.01 THEN RAISE EXCEPTION 'El total no coincide con los items.'; END IF;
  INSERT INTO public.cotizaciones(sucursal_id, cliente_id, vendedor_id, total, estado, valida_hasta, observaciones, metodo_pago, operation_id)
  VALUES (p_sucursal_id, p_cliente_id, p_vendedor_id, p_total, 'enviada', p_valida_hasta, NULLIF(btrim(p_observaciones), ''), p_metodo_pago, p_operation_id)
  ON CONFLICT (operation_id) WHERE operation_id IS NOT NULL DO NOTHING RETURNING id INTO v_quote_id;
  IF v_quote_id IS NULL THEN
    SELECT id INTO v_quote_id FROM public.cotizaciones WHERE operation_id = p_operation_id;
    IF v_quote_id IS NULL THEN RAISE EXCEPTION 'No se pudo recuperar la cotizacion idempotente.'; END IF;
    RETURN v_quote_id;
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'cantidad')::NUMERIC;
    v_price := (v_item->>'precio_unitario')::NUMERIC;
    v_discount := COALESCE(NULLIF(v_item->>'descuento', '')::NUMERIC, 0);
    INSERT INTO public.cotizacion_items(cotizacion_id, producto_id, diseno_id, extra_id, cantidad, precio_unitario, subtotal, descuento, observaciones, snapshot_economico)
    VALUES (v_quote_id, NULLIF(v_item->>'producto_id', '')::UUID, NULLIF(v_item->>'diseno_id', '')::UUID, NULLIF(v_item->>'extra_id', '')::UUID,
      v_qty, v_price, ROUND(v_qty * v_price - v_discount, 2), v_discount, NULLIF(btrim(v_item->>'observaciones'), ''), COALESCE(v_item->'snapshot_economico', '{}'::jsonb));
  END LOOP;
  IF p_aprobacion_id IS NOT NULL THEN
    UPDATE public.aprobaciones SET referencia_tabla = 'cotizaciones', referencia_id = v_quote_id
    WHERE id = p_aprobacion_id AND referencia_tabla = 'cotizacion_borrador' AND referencia_id = p_cotizacion_borrador_id;
  END IF;
  RETURN v_quote_id;
END;
$$;
