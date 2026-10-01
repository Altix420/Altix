-- ALTIX FULL V1: crédito mayorista, cuentas por cobrar y comisión condicionada.
-- Las condiciones financieras se modifican únicamente mediante las RPC de este archivo.

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS monto_solicitado NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto_solicitado >= 0),
  ADD COLUMN IF NOT EXISTS monto_autorizado NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto_autorizado >= 0),
  ADD COLUMN IF NOT EXISTS dias_credito INTEGER NOT NULL DEFAULT 0 CHECK (dias_credito >= 0);

ALTER TABLE public.cuentas_cobrar
  ADD COLUMN IF NOT EXISTS fecha_venta DATE;

UPDATE public.cuentas_cobrar
SET fecha_venta = created_at::date
WHERE fecha_venta IS NULL;

ALTER TABLE public.cuentas_cobrar
  ALTER COLUMN fecha_venta SET DEFAULT CURRENT_DATE,
  ALTER COLUMN fecha_venta SET NOT NULL;

ALTER TABLE public.pagos_credito
  ADD COLUMN IF NOT EXISTS operation_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pagos_credito_operation_id
  ON public.pagos_credito(operation_id)
  WHERE operation_id IS NOT NULL;

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS entregada BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS entregada_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entregada_por UUID REFERENCES public.profiles(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recordatorios_cuenta_fecha
  ON public.recordatorios(cuenta_cobrar_id, fecha_recordatorio);
CREATE INDEX IF NOT EXISTS idx_cuentas_cobrar_cliente_estado
  ON public.cuentas_cobrar(cliente_id, estado, fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_pagos_credito_cuenta_fecha
  ON public.pagos_credito(cuenta_cobrar_id, created_at);

CREATE OR REPLACE FUNCTION public.altix_require_admin(p_actor_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_actor_id IS NULL OR NOT public.altix_is_admin(p_actor_id)
     OR (auth.uid() IS NOT NULL AND auth.uid() <> p_actor_id) THEN
    RAISE EXCEPTION 'Solo un administrador autenticado puede ejecutar esta operación.';
  END IF;
END;
$$;

-- La solicitud no modifica el monto autorizado. Puede ser levantada por el vendedor
-- autenticado de la sucursal o por un administrador.
CREATE OR REPLACE FUNCTION public.solicitar_credito_cliente(
  p_cliente_id UUID,
  p_monto_solicitado NUMERIC,
  p_solicitado_por UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cliente RECORD;
BEGIN
  IF p_monto_solicitado IS NULL OR p_monto_solicitado < 0 THEN
    RAISE EXCEPTION 'El monto solicitado no puede ser negativo.';
  END IF;
  SELECT * INTO v_cliente FROM public.clientes WHERE id = p_cliente_id FOR UPDATE;
  IF NOT FOUND OR NOT v_cliente.activo OR NOT v_cliente.es_mayorista THEN
    RAISE EXCEPTION 'El crédito solo está disponible para clientes mayoristas activos.';
  END IF;
  IF NOT public.altix_is_admin(p_solicitado_por) THEN
    IF auth.uid() IS DISTINCT FROM p_solicitado_por OR NOT EXISTS (
      SELECT 1 FROM public.ventas v
      WHERE v.cliente_id = p_cliente_id AND v.vendedor_id = p_solicitado_por
    ) THEN
      RAISE EXCEPTION 'El vendedor no está autorizado para solicitar crédito de este cliente.';
    END IF;
  ELSE
    PERFORM public.altix_require_admin(p_solicitado_por);
  END IF;
  UPDATE public.clientes SET monto_solicitado = p_monto_solicitado WHERE id = p_cliente_id;
END;
$$;

-- Administración de términos: el monto solicitado y el autorizado permanecen separados.
CREATE OR REPLACE FUNCTION public.configurar_credito_cliente(
  p_cliente_id UUID,
  p_monto_autorizado NUMERIC,
  p_dias_credito INTEGER,
  p_admin_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_solicitado NUMERIC;
BEGIN
  PERFORM public.altix_require_admin(p_admin_id);
  IF p_monto_autorizado IS NULL OR p_monto_autorizado < 0 OR p_dias_credito IS NULL OR p_dias_credito < 0 THEN
    RAISE EXCEPTION 'El monto autorizado y los días de crédito deben ser válidos.';
  END IF;
  SELECT monto_solicitado INTO v_solicitado FROM public.clientes WHERE id = p_cliente_id AND activo = true AND es_mayorista = true FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El cliente mayorista no existe o está inactivo.';
  END IF;
  IF p_monto_autorizado > v_solicitado THEN
    RAISE EXCEPTION 'El monto autorizado no puede superar el monto solicitado.';
  END IF;
  UPDATE public.clientes
  SET monto_autorizado = p_monto_autorizado, dias_credito = p_dias_credito
  WHERE id = p_cliente_id;
END;
$$;

-- Única puerta para generar comisión. Bloquear la venta evita duplicados concurrentes.
CREATE OR REPLACE FUNCTION public.generar_comision(p_venta_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_venta RECORD;
  v_cliente_mayorista BOOLEAN;
  v_porcentaje NUMERIC(5,2);
  v_monto NUMERIC(12,2);
  v_periodo TEXT;
  v_comision_id UUID;
  v_pendiente NUMERIC;
BEGIN
  SELECT * INTO v_venta FROM public.ventas WHERE id = p_venta_id FOR UPDATE;
  IF NOT FOUND OR NOT v_venta.entregada THEN RETURN NULL; END IF;
  SELECT COALESCE(SUM(saldo_pendiente), 0) INTO v_pendiente
  FROM public.cuentas_cobrar
  WHERE venta_id = p_venta_id AND estado <> 'pagada';
  IF v_pendiente > 0 THEN RETURN NULL; END IF;
  SELECT id INTO v_comision_id FROM public.comisiones WHERE venta_id = p_venta_id LIMIT 1;
  IF v_comision_id IS NOT NULL THEN RETURN v_comision_id; END IF;

  SELECT COALESCE(es_mayorista, false) INTO v_cliente_mayorista FROM public.clientes WHERE id = v_venta.cliente_id;
  SELECT porcentaje INTO v_porcentaje
  FROM public.reglas_comision
  WHERE tipo_cliente = CASE WHEN v_cliente_mayorista THEN 'mayorista' ELSE 'cliente_final' END
    AND v_venta.total >= monto_min AND v_venta.total <= monto_max AND activa
  ORDER BY monto_min DESC LIMIT 1;
  v_porcentaje := COALESCE(v_porcentaje, 0);
  v_monto := ROUND(v_venta.total * v_porcentaje / 100.0, 2);
  v_periodo := to_char(v_venta.created_at, 'YYYY-MM');
  INSERT INTO public.comisiones (vendedor_id, venta_id, monto_venta, porcentaje_aplicado, monto_comision, periodo)
  VALUES (v_venta.vendedor_id, v_venta.id, v_venta.total, v_porcentaje, v_monto, v_periodo)
  RETURNING id INTO v_comision_id;
  RETURN v_comision_id;
END;
$$;

-- Venta de contado o crédito. Para crédito se bloquea el cliente mayorista antes de
-- calcular el saldo utilizado, de modo que dos ventas concurrentes no sobrepasen el límite.
CREATE OR REPLACE FUNCTION public.registrar_venta(
  p_sucursal_id UUID,
  p_cliente_id UUID,
  p_vendedor_id UUID,
  p_sesion_caja_id UUID DEFAULT NULL,
  p_total NUMERIC DEFAULT 0,
  p_tipo_pago TEXT DEFAULT 'efectivo',
  p_items JSONB DEFAULT '[]'::jsonb,
  p_pedido_id UUID DEFAULT NULL,
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_venta_id UUID;
  v_existing RECORD;
  v_cliente RECORD;
  v_item JSONB;
  v_prod_id UUID;
  v_cant NUMERIC;
  v_precio NUMERIC;
  v_stock NUMERIC;
  v_sum NUMERIC := 0;
  v_sesion RECORD;
  v_usado NUMERIC := 0;
  v_dias INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Se requiere autenticación.'; END IF;
  IF auth.uid() <> p_vendedor_id AND NOT public.altix_is_admin() THEN RAISE EXCEPTION 'El vendedor autenticado no coincide con la venta.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.usuario_sucursal WHERE user_id = p_vendedor_id AND sucursal_id = p_sucursal_id) THEN
    RAISE EXCEPTION 'El vendedor no está autorizado para operar en la sucursal.';
  END IF;
  IF p_tipo_pago NOT IN ('efectivo', 'tarjeta', 'transferencia', 'credito') THEN RAISE EXCEPTION 'Tipo de pago no permitido.'; END IF;
  IF p_total IS NULL OR p_total <= 0 OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La venta debe tener total e items válidos.';
  END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.ventas WHERE operation_id = p_operation_id;
    IF FOUND THEN
      IF v_existing.total <> p_total OR v_existing.cliente_id IS DISTINCT FROM p_cliente_id OR v_existing.sucursal_id IS DISTINCT FROM p_sucursal_id OR v_existing.vendedor_id IS DISTINCT FROM p_vendedor_id THEN
        RAISE EXCEPTION 'El operation_id ya fue usado con otro payload.';
      END IF;
      RETURN v_existing.id;
    END IF;
  END IF;
  SELECT * INTO v_cliente FROM public.clientes WHERE id = p_cliente_id AND activo = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El cliente no existe o está inactivo.'; END IF;
  IF p_tipo_pago = 'credito' THEN
    IF NOT v_cliente.es_mayorista THEN RAISE EXCEPTION 'El crédito solo está disponible para clientes mayoristas.'; END IF;
    IF v_cliente.monto_autorizado <= 0 THEN RAISE EXCEPTION 'El cliente no tiene crédito autorizado.'; END IF;
    SELECT COALESCE(SUM(saldo_pendiente), 0) INTO v_usado FROM public.cuentas_cobrar WHERE cliente_id = p_cliente_id AND saldo_pendiente > 0;
    IF v_usado + p_total > v_cliente.monto_autorizado THEN
      RAISE EXCEPTION 'Límite de crédito excedido. Disponible: Q%, solicitado: Q%.', v_cliente.monto_autorizado - v_usado, p_total;
    END IF;
    v_dias := v_cliente.dias_credito;
  END IF;
  IF p_tipo_pago <> 'credito' THEN
    IF p_sesion_caja_id IS NULL THEN RAISE EXCEPTION 'Se requiere una sesión de caja abierta.'; END IF;
    SELECT * INTO v_sesion FROM public.sesiones_caja WHERE id = p_sesion_caja_id FOR UPDATE;
    IF NOT FOUND OR v_sesion.estado <> 'abierta' OR v_sesion.sucursal_id <> p_sucursal_id THEN RAISE EXCEPTION 'La sesión de caja no existe, está cerrada o no pertenece a la sucursal.'; END IF;
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF v_item->>'producto_id' IS NULL OR v_item->>'cantidad' IS NULL OR v_item->>'precio_unitario' IS NULL THEN RAISE EXCEPTION 'Cada item debe incluir producto, cantidad y precio.'; END IF;
    v_cant := (v_item->>'cantidad')::NUMERIC; v_precio := (v_item->>'precio_unitario')::NUMERIC;
    IF v_cant <= 0 OR v_precio < 0 THEN RAISE EXCEPTION 'Cantidad o precio inválido.'; END IF;
    v_sum := v_sum + v_cant * v_precio;
  END LOOP;
  IF ABS(v_sum - p_total) > 0.01 THEN RAISE EXCEPTION 'El total no coincide con los items.'; END IF;
  INSERT INTO public.ventas (sucursal_id, cliente_id, vendedor_id, total, operation_id, pedido_id)
  VALUES (p_sucursal_id, p_cliente_id, p_vendedor_id, p_total, p_operation_id, p_pedido_id)
  ON CONFLICT (operation_id) DO NOTHING RETURNING id INTO v_venta_id;
  IF v_venta_id IS NULL AND p_operation_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.ventas WHERE operation_id = p_operation_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'No se pudo recuperar la venta idempotente.'; END IF;
    IF v_existing.total <> p_total OR v_existing.cliente_id IS DISTINCT FROM p_cliente_id OR v_existing.sucursal_id IS DISTINCT FROM p_sucursal_id OR v_existing.vendedor_id IS DISTINCT FROM p_vendedor_id THEN
      RAISE EXCEPTION 'El operation_id ya fue usado con otro payload.';
    END IF;
    RETURN v_existing.id;
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_prod_id := (v_item->>'producto_id')::UUID; v_cant := (v_item->>'cantidad')::NUMERIC; v_precio := (v_item->>'precio_unitario')::NUMERIC;
    SELECT stock INTO v_stock FROM public.inventarios WHERE sucursal_id = p_sucursal_id AND producto_id = v_prod_id FOR UPDATE;
    IF v_stock IS NULL OR v_stock < v_cant THEN RAISE EXCEPTION 'Stock insuficiente o producto no configurado en la sucursal.'; END IF;
    INSERT INTO public.venta_items (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (v_venta_id, v_prod_id, v_cant, v_precio, v_cant * v_precio);
    UPDATE public.inventarios SET stock = stock - v_cant WHERE sucursal_id = p_sucursal_id AND producto_id = v_prod_id;
    INSERT INTO public.movimientos_inventario (sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id) VALUES (p_sucursal_id, v_prod_id, 'salida', v_cant, v_stock, v_stock - v_cant, 'Venta ' || v_venta_id, p_vendedor_id);
  END LOOP;
  IF p_tipo_pago = 'credito' THEN
    INSERT INTO public.cuentas_cobrar (cliente_id, venta_id, monto_total, saldo_pendiente, fecha_venta, fecha_vencimiento, estado)
    VALUES (p_cliente_id, v_venta_id, p_total, p_total, CURRENT_DATE, CURRENT_DATE + v_dias, 'pendiente');
  ELSIF p_tipo_pago = 'efectivo' THEN
    INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id)
    VALUES (p_sesion_caja_id, 'ingreso', p_total, 'Venta ' || substring(v_venta_id::text, 1, 8), v_venta_id, p_operation_id);
  END IF;
  PERFORM public.generar_comision(v_venta_id);
  RETURN v_venta_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_pago(
  p_cuenta_cobrar_id UUID,
  p_monto NUMERIC,
  p_forma_pago metodo_pago,
  p_referencia TEXT,
  p_registrado_por UUID,
  p_sesion_caja_id UUID DEFAULT NULL,
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cuenta RECORD;
  v_pago RECORD;
  v_pago_id UUID;
  v_nuevo NUMERIC;
  v_sesion RECORD;
BEGIN
  PERFORM public.altix_require_admin(p_registrado_por);
  IF p_monto IS NULL OR p_monto <= 0 THEN RAISE EXCEPTION 'El monto del pago debe ser mayor a cero.'; END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO v_pago FROM public.pagos_credito WHERE operation_id = p_operation_id;
    IF FOUND THEN
      IF v_pago.cuenta_cobrar_id <> p_cuenta_cobrar_id OR v_pago.monto <> p_monto OR v_pago.forma_pago <> p_forma_pago THEN RAISE EXCEPTION 'El operation_id del pago ya fue usado con otro payload.'; END IF;
      RETURN v_pago.id;
    END IF;
  END IF;
  SELECT c.*, v.sucursal_id, v.id AS venta_ref INTO v_cuenta
  FROM public.cuentas_cobrar c JOIN public.ventas v ON v.id = c.venta_id
  WHERE c.id = p_cuenta_cobrar_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cuenta por cobrar no existe.'; END IF;
  IF v_cuenta.estado = 'pagada' OR v_cuenta.saldo_pendiente <= 0 THEN RAISE EXCEPTION 'La cuenta ya está pagada.'; END IF;
  IF p_monto > v_cuenta.saldo_pendiente THEN RAISE EXCEPTION 'El pago excede el saldo pendiente (Q%).', v_cuenta.saldo_pendiente; END IF;
  IF p_forma_pago = 'efectivo' THEN
    IF p_sesion_caja_id IS NULL THEN RAISE EXCEPTION 'Los pagos en efectivo requieren una sesión de caja.'; END IF;
    SELECT * INTO v_sesion FROM public.sesiones_caja WHERE id = p_sesion_caja_id FOR UPDATE;
    IF NOT FOUND OR v_sesion.estado <> 'abierta' OR v_sesion.sucursal_id <> v_cuenta.sucursal_id THEN RAISE EXCEPTION 'La sesión de caja no es válida para esta cuenta.'; END IF;
  END IF;
  INSERT INTO public.pagos_credito (cuenta_cobrar_id, monto, forma_pago, referencia, registrado_por, operation_id)
  VALUES (p_cuenta_cobrar_id, p_monto, p_forma_pago, NULLIF(btrim(p_referencia), ''), p_registrado_por, p_operation_id)
  RETURNING id INTO v_pago_id;
  v_nuevo := ROUND(v_cuenta.saldo_pendiente - p_monto, 2);
  UPDATE public.cuentas_cobrar SET saldo_pendiente = v_nuevo, estado = CASE WHEN v_nuevo = 0 THEN 'pagada'::estado_cuenta WHEN fecha_vencimiento < CURRENT_DATE THEN 'vencida'::estado_cuenta ELSE 'parcial'::estado_cuenta END WHERE id = p_cuenta_cobrar_id;
  IF p_forma_pago = 'efectivo' THEN
    INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id) VALUES (p_sesion_caja_id, 'ingreso', p_monto, 'Pago a crédito', v_pago_id, p_operation_id);
  END IF;
  INSERT INTO public.bitacora_auditoria (usuario_id, accion, tabla_afectada, registro_id, datos_nuevos) VALUES (p_registrado_por, 'PAGO_CREDITO', 'cuentas_cobrar', p_cuenta_cobrar_id, jsonb_build_object('monto', p_monto, 'saldo_restante', v_nuevo));
  PERFORM public.generar_comision(v_cuenta.venta_ref);
  RETURN v_pago_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.marcar_venta_entregada(
  p_venta_id UUID,
  p_entregada_por UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.altix_require_admin(p_entregada_por);
  UPDATE public.ventas SET entregada = true, entregada_at = COALESCE(entregada_at, now()), entregada_por = COALESCE(entregada_por, p_entregada_por) WHERE id = p_venta_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'La venta no existe.'; END IF;
  PERFORM public.generar_comision(p_venta_id);
  RETURN p_venta_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revisar_vencimientos_credito() RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.cuentas_cobrar SET estado = 'vencida' WHERE fecha_vencimiento < CURRENT_DATE AND saldo_pendiente > 0 AND estado IN ('pendiente', 'parcial');
  INSERT INTO public.recordatorios (cliente_id, cuenta_cobrar_id, fecha_recordatorio, nota)
  SELECT cliente_id, id, CURRENT_DATE, 'Crédito por vencer mañana. Saldo pendiente: Q' || saldo_pendiente
  FROM public.cuentas_cobrar
  WHERE fecha_vencimiento = CURRENT_DATE + 1 AND saldo_pendiente > 0 AND estado IN ('pendiente', 'parcial')
  ON CONFLICT (cuenta_cobrar_id, fecha_recordatorio) DO NOTHING;
END;
$$;

-- El vendedor solo consulta la cartera asociada a sus propias ventas; el Admin conserva la vista consolidada.
DROP POLICY IF EXISTS "Lectura de cuentas por sucursal" ON public.cuentas_cobrar;
CREATE POLICY "Lectura de cuentas por vendedor o admin" ON public.cuentas_cobrar
  FOR SELECT TO authenticated USING (
    public.altix_is_admin() OR EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = venta_id AND v.vendedor_id = auth.uid())
  );
DROP POLICY IF EXISTS "Lectura de pagos de credito por sucursal" ON public.pagos_credito;
CREATE POLICY "Lectura de pagos de credito por vendedor o admin" ON public.pagos_credito
  FOR SELECT TO authenticated USING (
    public.altix_is_admin() OR EXISTS (SELECT 1 FROM public.cuentas_cobrar c JOIN public.ventas v ON v.id = c.venta_id WHERE c.id = cuenta_cobrar_id AND v.vendedor_id = auth.uid())
  );

-- Recordatorio interno diario. No integra WhatsApp ni envía mensajes externos.
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
DECLARE
  v_job_id BIGINT;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'altix-credit-reminders';
  IF v_job_id IS NOT NULL THEN PERFORM cron.unschedule(v_job_id); END IF;
  PERFORM cron.schedule('altix-credit-reminders', '0 8 * * *', 'SELECT public.revisar_vencimientos_credito();');
END
$$;
