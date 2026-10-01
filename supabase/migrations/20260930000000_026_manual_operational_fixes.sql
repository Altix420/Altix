-- Correcciones de validación operativa. Mantiene compatibilidad con las funciones V1.

-- Los diseños pueden apuntar a un SKU vendible; el stock sigue viviendo en inventarios.
ALTER TABLE public.disenos
  ADD COLUMN IF NOT EXISTS producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_disenos_producto ON public.disenos(producto_id);

-- La fecha operativa no reemplaza created_at: solo permite el corte comercial controlado.
ALTER TABLE public.devoluciones
  ADD COLUMN IF NOT EXISTS fecha_operativa DATE NOT NULL DEFAULT CURRENT_DATE;

DROP FUNCTION IF EXISTS public.registrar_devolucion(UUID, TEXT, UUID, JSONB, TEXT);
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
BEGIN
  SELECT * INTO v_venta FROM public.ventas WHERE id = p_venta_id FOR SHARE;
  IF NOT FOUND OR v_venta.cliente_id IS NULL THEN
    RAISE EXCEPTION 'La venta no existe o no tiene cliente para devolución.';
  END IF;
  PERFORM public.altix_require_actor(p_autorizado_por, v_venta.sucursal_id);
  IF length(btrim(COALESCE(p_motivo, ''))) = 0 OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Motivo e items son obligatorios.';
  END IF;
  IF v_fecha < date_trunc('week', CURRENT_DATE)::date OR v_fecha > CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha operativa debe estar dentro de la semana actual y no puede ser futura.';
  END IF;
  IF v_fecha < v_venta.created_at::date THEN
    RAISE EXCEPTION 'La fecha operativa no puede ser anterior a la venta.';
  END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.devoluciones WHERE operation_id = p_operation_id;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_producto := (v_item->>'producto_id')::UUID;
    v_cantidad := (v_item->>'cantidad')::NUMERIC;
    v_precio := (v_item->>'precio_unitario')::NUMERIC;
    IF v_cantidad <= 0 OR v_precio < 0 THEN RAISE EXCEPTION 'Cantidad o precio inválido en devolución.'; END IF;
    SELECT COALESCE(SUM(cantidad), 0) INTO v_vendido FROM public.venta_items WHERE venta_id = p_venta_id AND producto_id = v_producto;
    SELECT COALESCE(SUM(di.cantidad), 0) INTO v_devuelto FROM public.devolucion_items di JOIN public.devoluciones d ON d.id = di.devolucion_id WHERE d.venta_id = p_venta_id AND di.producto_id = v_producto;
    IF v_vendido = 0 OR v_devuelto + v_cantidad > v_vendido THEN RAISE EXCEPTION 'La cantidad devuelta excede la venta original.'; END IF;
    v_total := v_total + v_cantidad * v_precio;
  END LOOP;
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
    INSERT INTO public.devolucion_items (devolucion_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (v_id, v_producto, v_cantidad, v_precio, v_cantidad * v_precio);
    INSERT INTO public.movimientos_inventario (sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id) VALUES (v_venta.sucursal_id, v_producto, 'devolucion', v_cantidad, v_stock, v_stock + v_cantidad, 'Devolución ' || v_id, p_autorizado_por);
  END LOOP;
  INSERT INTO public.saldos_favor (cliente_id, saldo_disponible) VALUES (v_venta.cliente_id, v_total) ON CONFLICT (cliente_id) DO UPDATE SET saldo_disponible = public.saldos_favor.saldo_disponible + EXCLUDED.saldo_disponible;
  RETURN v_id;
END;
$$;

-- Un vendedor puede solicitar crédito para un mayorista recién creado. La solicitud queda visible en Aprobaciones.
CREATE OR REPLACE FUNCTION public.solicitar_credito_cliente(
  p_cliente_id UUID,
  p_monto_solicitado NUMERIC,
  p_solicitado_por UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cliente RECORD;
  v_sucursal UUID;
  v_tipo TEXT;
BEGIN
  IF p_monto_solicitado IS NULL OR p_monto_solicitado <= 0 THEN
    RAISE EXCEPTION 'El monto solicitado debe ser mayor a cero.';
  END IF;
  SELECT * INTO v_cliente FROM public.clientes WHERE id = p_cliente_id FOR UPDATE;
  IF NOT FOUND OR NOT v_cliente.activo OR NOT v_cliente.es_mayorista THEN
    RAISE EXCEPTION 'El crédito solo está disponible para clientes mayoristas activos.';
  END IF;
  IF public.altix_is_admin(p_solicitado_por) THEN
    PERFORM public.altix_require_admin(p_solicitado_por);
    SELECT us.sucursal_id INTO v_sucursal FROM public.usuario_sucursal us WHERE us.user_id = p_solicitado_por ORDER BY us.sucursal_id LIMIT 1;
  ELSE
    IF auth.uid() IS DISTINCT FROM p_solicitado_por THEN RAISE EXCEPTION 'El vendedor autenticado no coincide con el solicitante.'; END IF;
    SELECT us.sucursal_id INTO v_sucursal FROM public.usuario_sucursal us WHERE us.user_id = p_solicitado_por ORDER BY us.sucursal_id LIMIT 1;
    IF v_sucursal IS NULL THEN RAISE EXCEPTION 'El vendedor no tiene sucursal asignada.'; END IF;
  END IF;
  UPDATE public.clientes SET monto_solicitado = p_monto_solicitado WHERE id = p_cliente_id;
  v_tipo := CASE WHEN COALESCE(v_cliente.monto_solicitado, 0) = 0 THEN 'cliente_mayorista' ELSE 'credito' END;
  IF v_sucursal IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.aprobaciones WHERE tipo = v_tipo AND referencia_tabla = 'clientes' AND referencia_id = p_cliente_id AND estado = 'pendiente'
  ) THEN
    PERFORM public.altix_crear_aprobacion(
      v_tipo, p_solicitado_por, v_sucursal, 'clientes', p_cliente_id, p_monto_solicitado,
      jsonb_build_object('cliente_id', p_cliente_id, 'monto_solicitado', p_monto_solicitado),
      'Solicitud de crédito mayorista para ' || v_cliente.nombre, NULL
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.crear_cliente_mayorista(
  p_nombre TEXT,
  p_nit_dpi TEXT DEFAULT NULL,
  p_telefono TEXT DEFAULT NULL,
  p_direccion TEXT DEFAULT NULL,
  p_monto_solicitado NUMERIC DEFAULT NULL,
  p_solicitado_por UUID DEFAULT auth.uid()
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF length(btrim(COALESCE(p_nombre, ''))) = 0 THEN RAISE EXCEPTION 'El nombre del cliente es obligatorio.'; END IF;
  IF p_monto_solicitado IS NULL OR p_monto_solicitado <= 0 THEN RAISE EXCEPTION 'El monto solicitado debe ser mayor a cero.'; END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_solicitado_por THEN RAISE EXCEPTION 'El usuario autenticado no coincide con el solicitante.'; END IF;
  INSERT INTO public.clientes(nombre, nit_dpi, telefono, direccion, es_mayorista, activo, monto_solicitado)
  VALUES (btrim(p_nombre), NULLIF(btrim(p_nit_dpi), ''), NULLIF(btrim(p_telefono), ''), NULLIF(btrim(p_direccion), ''), true, true, p_monto_solicitado)
  RETURNING id INTO v_id;
  PERFORM public.solicitar_credito_cliente(v_id, p_monto_solicitado, p_solicitado_por);
  RETURN v_id;
END;
$$;

-- Metas de sucursal: las metas_vendedor derivadas conservan el snapshot histórico.
CREATE TABLE IF NOT EXISTS public.metas_sucursal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE RESTRICT,
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  objetivo_ventas NUMERIC(12,2) NOT NULL CHECK (objetivo_ventas >= 0),
  activa BOOLEAN NOT NULL DEFAULT true,
  creado_por UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (periodo_fin >= periodo_inicio)
);
ALTER TABLE public.metas_vendedor ADD COLUMN IF NOT EXISTS meta_sucursal_id UUID REFERENCES public.metas_sucursal(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_metas_sucursal_periodo ON public.metas_sucursal(sucursal_id, periodo_inicio, periodo_fin, activa);
ALTER TABLE public.metas_sucursal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin lee metas de sucursal" ON public.metas_sucursal;
CREATE POLICY "Admin lee metas de sucursal" ON public.metas_sucursal FOR SELECT TO authenticated USING (public.altix_is_admin());
DROP POLICY IF EXISTS "Admin gestiona metas de sucursal" ON public.metas_sucursal;
CREATE POLICY "Admin gestiona metas de sucursal" ON public.metas_sucursal FOR ALL TO authenticated USING (public.altix_is_admin()) WITH CHECK (public.altix_is_admin());

CREATE OR REPLACE FUNCTION public.configurar_meta_sucursal(
  p_meta_id UUID DEFAULT NULL,
  p_sucursal_id UUID DEFAULT NULL,
  p_periodo_inicio DATE DEFAULT NULL,
  p_periodo_fin DATE DEFAULT NULL,
  p_objetivo_ventas NUMERIC DEFAULT NULL,
  p_activa BOOLEAN DEFAULT true,
  p_admin_id UUID DEFAULT auth.uid()
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_meta UUID;
  v_sellers UUID[];
  v_count INTEGER;
  v_target NUMERIC;
  v_seller UUID;
BEGIN
  PERFORM public.altix_require_admin(p_admin_id);
  IF p_sucursal_id IS NULL OR p_periodo_inicio IS NULL OR p_periodo_fin IS NULL OR p_periodo_fin < p_periodo_inicio OR p_objetivo_ventas IS NULL OR p_objetivo_ventas < 0 THEN
    RAISE EXCEPTION 'Sucursal, periodo y meta total son obligatorios y válidos.';
  END IF;
  IF p_meta_id IS NULL THEN
    INSERT INTO public.metas_sucursal(sucursal_id, periodo_inicio, periodo_fin, objetivo_ventas, activa, creado_por)
    VALUES (p_sucursal_id, p_periodo_inicio, p_periodo_fin, p_objetivo_ventas, p_activa, p_admin_id)
    RETURNING id INTO v_meta;
  ELSE
    UPDATE public.metas_sucursal SET sucursal_id = p_sucursal_id, periodo_inicio = p_periodo_inicio, periodo_fin = p_periodo_fin, objetivo_ventas = p_objetivo_ventas, activa = p_activa WHERE id = p_meta_id RETURNING id INTO v_meta;
    IF v_meta IS NULL THEN RAISE EXCEPTION 'La meta de sucursal no existe.'; END IF;
  END IF;
  SELECT array_agg(us.user_id ORDER BY us.user_id), count(*) INTO v_sellers, v_count
  FROM public.usuario_sucursal us JOIN public.profiles pr ON pr.id = us.user_id
  WHERE us.sucursal_id = p_sucursal_id AND pr.role = 'vendedor' AND pr.activo = true;
  IF COALESCE(v_count, 0) > 0 THEN
    v_target := ROUND(p_objetivo_ventas / v_count, 2);
    FOREACH v_seller IN ARRAY v_sellers LOOP
      INSERT INTO public.metas_vendedor(meta_sucursal_id, vendedor_id, periodo_inicio, periodo_fin, objetivo_ventas, activa, creado_por)
      VALUES (v_meta, v_seller, p_periodo_inicio, p_periodo_fin, v_target, p_activa, p_admin_id);
    END LOOP;
  END IF;
  RETURN v_meta;
END;
$$;

-- El producto vendible de un diseño se conserva en la misma operación de diseño.
DROP FUNCTION IF EXISTS public.guardar_diseno(UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT, UUID, NUMERIC, BOOLEAN, TEXT, JSONB);
CREATE OR REPLACE FUNCTION public.guardar_diseno(
  p_diseno_id UUID DEFAULT NULL,
  p_sku TEXT DEFAULT NULL,
  p_nombre TEXT DEFAULT NULL,
  p_descripcion TEXT DEFAULT NULL,
  p_categoria_id UUID DEFAULT NULL,
  p_cliente_id UUID DEFAULT NULL,
  p_archivo_url TEXT DEFAULT NULL,
  p_archivo_id UUID DEFAULT NULL,
  p_precio NUMERIC DEFAULT 0,
  p_activo BOOLEAN DEFAULT true,
  p_observaciones TEXT DEFAULT NULL,
  p_extra_ids JSONB DEFAULT '[]'::jsonb,
  p_producto_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  PERFORM public.altix_require_admin(auth.uid());
  IF length(btrim(COALESCE(p_nombre, ''))) = 0 THEN RAISE EXCEPTION 'El nombre del diseño es obligatorio.'; END IF;
  IF p_precio IS NULL OR p_precio < 0 OR jsonb_typeof(p_extra_ids) <> 'array' THEN RAISE EXCEPTION 'Datos de diseño inválidos.'; END IF;
  IF p_producto_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.productos WHERE id = p_producto_id AND activo) THEN RAISE EXCEPTION 'El SKU vinculado no existe o está inactivo.'; END IF;
  IF p_diseno_id IS NULL THEN
    INSERT INTO public.disenos(sku,nombre,descripcion,categoria_id,cliente_id,archivo_url,archivo_id,precio,activo,observaciones,producto_id)
    VALUES(NULLIF(btrim(p_sku),''),btrim(p_nombre),NULLIF(btrim(p_descripcion),''),p_categoria_id,p_cliente_id,p_archivo_url,p_archivo_id,p_precio,p_activo,NULLIF(btrim(p_observaciones),''),p_producto_id)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.disenos SET sku=NULLIF(btrim(p_sku),''), nombre=btrim(p_nombre), descripcion=NULLIF(btrim(p_descripcion),''), categoria_id=p_categoria_id, cliente_id=p_cliente_id, archivo_url=p_archivo_url, archivo_id=p_archivo_id, precio=p_precio, activo=p_activo, observaciones=NULLIF(btrim(p_observaciones),''), producto_id=p_producto_id WHERE id=p_diseno_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'El diseño no existe.'; END IF;
  END IF;
  DELETE FROM public.diseno_extras WHERE diseno_id=v_id;
  INSERT INTO public.diseno_extras(diseno_id,extra_id)
  SELECT v_id, value::UUID FROM jsonb_array_elements_text(p_extra_ids) WHERE EXISTS (SELECT 1 FROM public.extras e WHERE e.id=value::UUID);
  RETURN v_id;
END;
$$;

-- Los vendedores pueden registrar pagos de sus propias cuentas por cobrar.
-- El administrador conserva la vista y operación consolidada.
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
BEGIN
  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto del pago debe ser mayor a cero.';
  END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO v_pago FROM public.pagos_credito WHERE operation_id = p_operation_id;
    IF FOUND THEN
      IF v_pago.cuenta_cobrar_id <> p_cuenta_cobrar_id OR v_pago.monto <> p_monto OR v_pago.forma_pago <> p_forma_pago THEN
        RAISE EXCEPTION 'El operation_id del pago ya fue usado con otro payload.';
      END IF;
      RETURN v_pago.id;
    END IF;
  END IF;
  SELECT c.*, v.sucursal_id, v.id AS venta_ref, v.vendedor_id
  INTO v_cuenta
  FROM public.cuentas_cobrar c
  JOIN public.ventas v ON v.id = c.venta_id
  WHERE c.id = p_cuenta_cobrar_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cuenta por cobrar no existe.'; END IF;
  IF public.altix_is_admin(p_registrado_por) THEN
    PERFORM public.altix_require_admin(p_registrado_por);
  ELSE
    PERFORM public.altix_require_actor(p_registrado_por, v_cuenta.sucursal_id);
    IF v_cuenta.vendedor_id <> p_registrado_por THEN
      RAISE EXCEPTION 'Solo el vendedor responsable puede registrar este pago.';
    END IF;
  END IF;
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
  UPDATE public.cuentas_cobrar
  SET saldo_pendiente = v_nuevo,
      estado = CASE WHEN v_nuevo = 0 THEN 'pagada'::estado_cuenta WHEN fecha_vencimiento < CURRENT_DATE THEN 'vencida'::estado_cuenta ELSE 'parcial'::estado_cuenta END
  WHERE id = p_cuenta_cobrar_id;
  IF p_forma_pago = 'efectivo' THEN
    INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id)
    VALUES (p_sesion_caja_id, 'ingreso', p_monto, 'Pago a crédito', v_pago_id, p_operation_id);
  END IF;
  INSERT INTO public.bitacora_auditoria (usuario_id, accion, tabla_afectada, registro_id, datos_nuevos)
  VALUES (p_registrado_por, 'PAGO_CREDITO', 'cuentas_cobrar', p_cuenta_cobrar_id, jsonb_build_object('monto', p_monto, 'saldo_restante', v_nuevo));
  PERFORM public.generar_comision(v_cuenta.venta_ref);
  RETURN v_pago_id;
END;
$$;
