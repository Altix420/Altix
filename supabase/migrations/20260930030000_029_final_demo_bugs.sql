-- Final demo fixes: preserve payment method and close rejected quotes safely.

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS forma_pago public.metodo_pago NOT NULL DEFAULT 'efectivo';

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
LANGUAGE plpgsql SECURITY DEFINER
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
      IF v_existing.total <> p_total OR v_existing.cliente_id IS DISTINCT FROM p_cliente_id OR v_existing.sucursal_id IS DISTINCT FROM p_sucursal_id OR v_existing.vendedor_id IS DISTINCT FROM p_vendedor_id OR v_existing.forma_pago IS DISTINCT FROM p_tipo_pago::public.metodo_pago THEN
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
  INSERT INTO public.ventas (sucursal_id, cliente_id, vendedor_id, total, forma_pago, operation_id, pedido_id)
  VALUES (p_sucursal_id, p_cliente_id, p_vendedor_id, p_total, p_tipo_pago::public.metodo_pago, p_operation_id, p_pedido_id)
  ON CONFLICT (operation_id) DO NOTHING RETURNING id INTO v_venta_id;
  IF v_venta_id IS NULL AND p_operation_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.ventas WHERE operation_id = p_operation_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'No se pudo recuperar la venta idempotente.'; END IF;
    IF v_existing.total <> p_total OR v_existing.cliente_id IS DISTINCT FROM p_cliente_id OR v_existing.sucursal_id IS DISTINCT FROM p_sucursal_id OR v_existing.vendedor_id IS DISTINCT FROM p_vendedor_id OR v_existing.forma_pago IS DISTINCT FROM p_tipo_pago::public.metodo_pago THEN
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
  INSERT INTO public.ventas(pedido_id, sucursal_id, cliente_id, vendedor_id, total, forma_pago, operation_id, entregada, entregada_at, entregada_por)
  VALUES (p_pedido_id, v_order.sucursal_id, v_order.cliente_id, v_order.vendedor_id, v_order.total, v_order.metodo_pago, p_operation_id, true, now(), p_registrado_por)
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
    UPDATE public.inventarios SET stock = stock - v_item.cantidad WHERE sucursal_id = v_order.sucursal_id AND producto_id = v_item.producto_id;
    INSERT INTO public.movimientos_inventario(sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
    VALUES (v_order.sucursal_id, v_item.producto_id, 'salida', v_item.cantidad, v_stock, v_stock - v_item.cantidad, 'Pedido ' || v_order.id, p_registrado_por);
  END LOOP;
  SELECT * INTO v_account FROM public.cuentas_cobrar WHERE pedido_id = p_pedido_id FOR UPDATE;
  IF FOUND THEN UPDATE public.cuentas_cobrar SET venta_id = v_sale_id WHERE id = v_account.id; END IF;
  PERFORM public.generar_comision(v_sale_id);
  RETURN v_sale_id;
END;
$$;

-- Vendor cancellation is a logical removal that keeps quote, approval and audit history.
DROP POLICY IF EXISTS "Vendedor cancela cotizacion rechazada" ON public.cotizaciones;
CREATE POLICY "Vendedor cancela cotizacion rechazada" ON public.cotizaciones
  FOR UPDATE TO authenticated
  USING (
    vendedor_id = auth.uid() AND estado = 'enviada'
    AND EXISTS (
      SELECT 1 FROM public.aprobaciones a
      WHERE a.tipo = 'descuento' AND a.referencia_tabla = 'cotizaciones'
        AND a.referencia_id = id AND a.estado = 'rechazada'
    )
  )
  WITH CHECK (vendedor_id = auth.uid() AND estado = 'cancelada');

CREATE OR REPLACE FUNCTION public.protect_quote_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_approval_state TEXT;
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NEW.estado = 'cancelada' THEN
      IF OLD.estado <> 'enviada' OR auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM OLD.vendedor_id THEN
        RAISE EXCEPTION 'Solo el vendedor responsable puede eliminar una cotizacion rechazada.';
      END IF;
      SELECT a.estado INTO v_approval_state FROM public.aprobaciones a
      WHERE a.tipo = 'descuento' AND a.referencia_tabla = 'cotizaciones' AND a.referencia_id = OLD.id
      ORDER BY a.created_at DESC LIMIT 1;
      IF v_approval_state IS DISTINCT FROM 'rechazada' THEN
        RAISE EXCEPTION 'Solo se puede eliminar una cotizacion con descuento rechazado.';
      END IF;
      IF NEW.id IS DISTINCT FROM OLD.id OR NEW.sucursal_id IS DISTINCT FROM OLD.sucursal_id OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id OR NEW.vendedor_id IS DISTINCT FROM OLD.vendedor_id OR NEW.total IS DISTINCT FROM OLD.total OR NEW.valida_hasta IS DISTINCT FROM OLD.valida_hasta OR NEW.observaciones IS DISTINCT FROM OLD.observaciones OR NEW.metodo_pago IS DISTINCT FROM OLD.metodo_pago OR NEW.operation_id IS DISTINCT FROM OLD.operation_id OR NEW.cliente_acepto IS DISTINCT FROM OLD.cliente_acepto THEN
        RAISE EXCEPTION 'La eliminacion de una cotizacion solo puede cambiar su estado.';
      END IF;
      RETURN NEW;
    END IF;
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
