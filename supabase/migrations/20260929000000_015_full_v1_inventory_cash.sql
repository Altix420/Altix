-- ALTIX FULL V1: inventario y caja.
-- Todos los cambios de stock y cierre de caja pasan por RPC transaccional.

CREATE TABLE IF NOT EXISTS public.solicitudes_ajuste_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE RESTRICT,
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  stock_anterior NUMERIC(12,2) NOT NULL CHECK (stock_anterior >= 0),
  stock_nuevo NUMERIC(12,2) NOT NULL CHECK (stock_nuevo >= 0),
  motivo TEXT NOT NULL CHECK (length(btrim(motivo)) > 0),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  solicitado_por UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  solicitado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revisado_por UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  revisado_at TIMESTAMPTZ,
  operation_id TEXT UNIQUE,
  CONSTRAINT ajuste_stock_delta CHECK (stock_nuevo - stock_anterior IS NOT NULL)
);

ALTER TABLE public.solicitudes_ajuste_inventario
  ADD COLUMN IF NOT EXISTS delta NUMERIC(12,2)
  GENERATED ALWAYS AS (stock_nuevo - stock_anterior) STORED;

ALTER TABLE public.sesiones_caja
  ADD COLUMN IF NOT EXISTS monto_esperado NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS diferencia NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS conteo_denominaciones JSONB,
  ADD COLUMN IF NOT EXISTS cerrado_por UUID REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS observacion TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS autorizado_por UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS autorizado_at TIMESTAMPTZ;

ALTER TABLE public.defectuosos
  ADD COLUMN IF NOT EXISTS operation_id TEXT UNIQUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'gastos_estado_check'
      AND conrelid = 'public.gastos'::regclass
  ) THEN
    ALTER TABLE public.gastos
      ADD CONSTRAINT gastos_estado_check CHECK (estado IN ('pendiente', 'aprobado', 'rechazado'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conteos_detalle_conteo_producto_key'
      AND conrelid = 'public.conteos_detalle'::regclass
  ) THEN
    ALTER TABLE public.conteos_detalle
      ADD CONSTRAINT conteos_detalle_conteo_producto_key UNIQUE (conteo_id, producto_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_ajustes_inventario_estado
  ON public.solicitudes_ajuste_inventario (estado, solicitado_at DESC);
CREATE INDEX IF NOT EXISTS idx_mov_inv_sucursal_fecha
  ON public.movimientos_inventario (sucursal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mov_caja_sesion_fecha
  ON public.movimientos_caja (sesion_caja_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sesion_caja_abierta_sucursal
  ON public.sesiones_caja (sucursal_id) WHERE estado = 'abierta';

CREATE OR REPLACE FUNCTION public.altix_role(p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = p_user_id AND activo = true;
$$;

CREATE OR REPLACE FUNCTION public.altix_is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(public.altix_role(p_user_id) = 'administrador', false);
$$;

CREATE OR REPLACE FUNCTION public.altix_can_access_branch(p_sucursal_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.altix_is_admin(p_user_id)
    OR EXISTS (
      SELECT 1 FROM public.usuario_sucursal
      WHERE user_id = p_user_id AND sucursal_id = p_sucursal_id
    );
$$;

CREATE OR REPLACE FUNCTION public.altix_require_actor(p_actor_id UUID, p_sucursal_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_actor_id AND activo = true
  ) THEN
    RAISE EXCEPTION 'El usuario responsable no existe o está inactivo.';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_actor_id THEN
    RAISE EXCEPTION 'El usuario autenticado no coincide con el responsable informado.';
  END IF;
  IF NOT public.altix_can_access_branch(p_sucursal_id, p_actor_id) THEN
    RAISE EXCEPTION 'El usuario no está autorizado para operar en la sucursal.';
  END IF;
END;
$$;

-- Cobertura RLS para las tablas operativas. Las mutaciones siguen pasando por RPC.
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traslados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traslado_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defectuosos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conteos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conteos_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devoluciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devolucion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_ajuste_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de movimientos por sucursal" ON public.movimientos_inventario;
CREATE POLICY "Lectura de movimientos por sucursal" ON public.movimientos_inventario
  FOR SELECT TO authenticated USING (public.altix_can_access_branch(sucursal_id));

DROP POLICY IF EXISTS "Lectura de traslados por sucursal" ON public.traslados;
CREATE POLICY "Lectura de traslados por sucursal" ON public.traslados
  FOR SELECT TO authenticated USING (
    public.altix_can_access_branch(sucursal_origen_id)
    OR public.altix_can_access_branch(sucursal_destino_id)
  );

DROP POLICY IF EXISTS "Lectura de items de traslado por sucursal" ON public.traslado_items;
CREATE POLICY "Lectura de items de traslado por sucursal" ON public.traslado_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.traslados t
      WHERE t.id = traslado_id
        AND (public.altix_can_access_branch(t.sucursal_origen_id)
          OR public.altix_can_access_branch(t.sucursal_destino_id))
    )
  );

DROP POLICY IF EXISTS "Lectura de defectuosos por sucursal" ON public.defectuosos;
CREATE POLICY "Lectura de defectuosos por sucursal" ON public.defectuosos
  FOR SELECT TO authenticated USING (public.altix_can_access_branch(sucursal_id));

DROP POLICY IF EXISTS "Lectura de conteos por sucursal" ON public.conteos;
CREATE POLICY "Lectura de conteos por sucursal" ON public.conteos
  FOR SELECT TO authenticated USING (public.altix_can_access_branch(sucursal_id));

DROP POLICY IF EXISTS "Lectura de detalle de conteos por sucursal" ON public.conteos_detalle;
CREATE POLICY "Lectura de detalle de conteos por sucursal" ON public.conteos_detalle
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conteos c
      WHERE c.id = conteo_id AND public.altix_can_access_branch(c.sucursal_id)
    )
  );

DROP POLICY IF EXISTS "Lectura de movimientos de caja por sucursal" ON public.movimientos_caja;
CREATE POLICY "Lectura de movimientos de caja por sucursal" ON public.movimientos_caja
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.sesiones_caja s
      WHERE s.id = sesion_caja_id AND public.altix_can_access_branch(s.sucursal_id)
    )
  );

DROP POLICY IF EXISTS "Lectura de gastos por sucursal" ON public.gastos;
CREATE POLICY "Lectura de gastos por sucursal" ON public.gastos
  FOR SELECT TO authenticated USING (public.altix_can_access_branch(sucursal_id));

DROP POLICY IF EXISTS "Lectura de devoluciones por sucursal" ON public.devoluciones;
CREATE POLICY "Lectura de devoluciones por sucursal" ON public.devoluciones
  FOR SELECT TO authenticated USING (public.altix_can_access_branch(sucursal_id));

DROP POLICY IF EXISTS "Lectura de items de devolucion por sucursal" ON public.devolucion_items;
CREATE POLICY "Lectura de items de devolucion por sucursal" ON public.devolucion_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.devoluciones d
      WHERE d.id = devolucion_id AND public.altix_can_access_branch(d.sucursal_id)
    )
  );

DROP POLICY IF EXISTS "Lectura de ajustes por sucursal" ON public.solicitudes_ajuste_inventario;
CREATE POLICY "Lectura de ajustes por sucursal" ON public.solicitudes_ajuste_inventario
  FOR SELECT TO authenticated USING (public.altix_can_access_branch(sucursal_id));

-- Sustituir las lecturas generales heredadas por alcance real de sucursal.
DROP POLICY IF EXISTS "Permitir lectura de inventario" ON public.inventarios;
CREATE POLICY "Permitir lectura de inventario por sucursal" ON public.inventarios
  FOR SELECT TO authenticated USING (public.altix_can_access_branch(sucursal_id));

DROP POLICY IF EXISTS "Permitir lectura de sesiones de caja" ON public.sesiones_caja;
CREATE POLICY "Permitir lectura de sesiones de caja por sucursal" ON public.sesiones_caja
  FOR SELECT TO authenticated USING (public.altix_can_access_branch(sucursal_id));

DROP POLICY IF EXISTS "Permitir lectura de ventas" ON public.ventas;
CREATE POLICY "Permitir lectura de ventas por sucursal" ON public.ventas
  FOR SELECT TO authenticated USING (public.altix_can_access_branch(sucursal_id));

DROP POLICY IF EXISTS "Permitir lectura de cotizaciones" ON public.cotizaciones;
CREATE POLICY "Permitir lectura de cotizaciones por sucursal" ON public.cotizaciones
  FOR SELECT TO authenticated USING (public.altix_can_access_branch(sucursal_id));

DROP POLICY IF EXISTS "Permitir lectura de pedidos" ON public.pedidos;
CREATE POLICY "Permitir lectura de pedidos por sucursal" ON public.pedidos
  FOR SELECT TO authenticated USING (public.altix_can_access_branch(sucursal_id));

DROP POLICY IF EXISTS "Permitir insercion/edicion de cotizaciones" ON public.cotizaciones;
CREATE POLICY "Permitir insercion de cotizaciones por sucursal" ON public.cotizaciones
  FOR INSERT TO authenticated WITH CHECK (public.altix_can_access_branch(sucursal_id));

DROP POLICY IF EXISTS "Permitir insercion/edicion de pedidos" ON public.pedidos;
CREATE POLICY "Permitir insercion de pedidos por sucursal" ON public.pedidos
  FOR INSERT TO authenticated WITH CHECK (public.altix_can_access_branch(sucursal_id));

DROP POLICY IF EXISTS "Permitir lectura de asignaciones de sucursal" ON public.usuario_sucursal;
CREATE POLICY "Permitir lectura de asignaciones propias o admin" ON public.usuario_sucursal
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.altix_is_admin());

-- Detalles financieros y comerciales: lectura limitada a la sucursal, vendedor o Admin.
ALTER TABLE public.venta_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizacion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_cobrar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anticipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ajustes_comision ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disenos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reglas_comision ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reglas_descuento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saldos_favor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_saldo_favor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura de detalle de ventas por sucursal" ON public.venta_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = venta_id AND public.altix_can_access_branch(v.sucursal_id)));
CREATE POLICY "Lectura de detalle de cotizaciones por sucursal" ON public.cotizacion_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.cotizaciones c WHERE c.id = cotizacion_id AND public.altix_can_access_branch(c.sucursal_id)));
CREATE POLICY "Lectura de detalle de pedidos por sucursal" ON public.pedido_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND public.altix_can_access_branch(p.sucursal_id)));
CREATE POLICY "Lectura de cuentas por sucursal" ON public.cuentas_cobrar FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = venta_id AND public.altix_can_access_branch(v.sucursal_id)) OR public.altix_is_admin());
CREATE POLICY "Lectura de pagos de credito por sucursal" ON public.pagos_credito FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.cuentas_cobrar c JOIN public.ventas v ON v.id = c.venta_id WHERE c.id = cuenta_cobrar_id AND public.altix_can_access_branch(v.sucursal_id)) OR public.altix_is_admin());
CREATE POLICY "Lectura de pagos por sucursal" ON public.pagos FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = venta_id AND public.altix_can_access_branch(v.sucursal_id)) OR public.altix_is_admin());
CREATE POLICY "Lectura de anticipos por sucursal" ON public.anticipos FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND public.altix_can_access_branch(p.sucursal_id)) OR public.altix_is_admin());
CREATE POLICY "Lectura de entregas por sucursal" ON public.entregas FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND public.altix_can_access_branch(p.sucursal_id)) OR public.altix_is_admin());
CREATE POLICY "Lectura de comisiones propias o admin" ON public.comisiones FOR SELECT TO authenticated USING (vendedor_id = auth.uid() OR public.altix_is_admin());
CREATE POLICY "Lectura de ajustes de comision admin" ON public.ajustes_comision FOR SELECT TO authenticated USING (public.altix_is_admin());
CREATE POLICY "Lectura de auditoria admin" ON public.bitacora_auditoria FOR SELECT TO authenticated USING (public.altix_is_admin());
CREATE POLICY "Lectura autenticada de disenos" ON public.disenos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lectura autenticada de extras" ON public.extras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lectura autenticada de reglas de comision" ON public.reglas_comision FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lectura autenticada de reglas de descuento" ON public.reglas_descuento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lectura de recordatorios admin" ON public.recordatorios FOR SELECT TO authenticated USING (public.altix_is_admin());
CREATE POLICY "Lectura de saldos admin" ON public.saldos_favor FOR SELECT TO authenticated USING (public.altix_is_admin());
CREATE POLICY "Lectura de movimientos de saldo admin" ON public.movimientos_saldo_favor FOR SELECT TO authenticated USING (public.altix_is_admin());

-- Apertura: una sesión abierta por sucursal, con saldo inicial no negativo.
CREATE OR REPLACE FUNCTION public.abrir_caja(
  p_sucursal_id UUID,
  p_usuario_id UUID,
  p_monto_apertura NUMERIC
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sesion_id UUID;
BEGIN
  PERFORM public.altix_require_actor(p_usuario_id, p_sucursal_id);
  IF p_monto_apertura IS NULL OR p_monto_apertura < 0 THEN
    RAISE EXCEPTION 'El saldo de apertura no puede ser negativo.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sesiones_caja WHERE sucursal_id = p_sucursal_id AND estado = 'abierta') THEN
    RAISE EXCEPTION 'La sucursal ya tiene una sesión de caja abierta.';
  END IF;
  INSERT INTO public.sesiones_caja (sucursal_id, usuario_id, monto_apertura)
  VALUES (p_sucursal_id, p_usuario_id, p_monto_apertura)
  RETURNING id INTO v_sesion_id;
  RETURN v_sesion_id;
END;
$$;

-- Cierre: el monto físico se calcula únicamente desde las denominaciones recibidas.
DROP FUNCTION IF EXISTS public.cerrar_caja(UUID, NUMERIC);
CREATE OR REPLACE FUNCTION public.cerrar_caja(
  p_sesion_caja_id UUID,
  p_denominaciones JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
  SELECT * INTO v_sesion FROM public.sesiones_caja
  WHERE id = p_sesion_caja_id FOR UPDATE;
  IF NOT FOUND OR v_sesion.estado <> 'abierta' THEN
    RAISE EXCEPTION 'La sesión de caja no existe o ya está cerrada.';
  END IF;
  IF v_actor IS NULL OR (NOT public.altix_is_admin(v_actor) AND v_actor <> v_sesion.usuario_id) THEN
    RAISE EXCEPTION 'No estás autorizado para cerrar esta sesión de caja.';
  END IF;
  IF jsonb_typeof(v_counts) <> 'object' THEN
    RAISE EXCEPTION 'El conteo de denominaciones no es válido.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_each_text(v_counts) j
    WHERE j.key <> 'monedas' AND (j.value !~ '^[0-9]+([.][0-9]+)?$' OR j.value::NUMERIC < 0)
  ) OR (v_counts ? 'monedas' AND ((v_counts->>'monedas') !~ '^[0-9]+([.][0-9]+)?$' OR (v_counts->>'monedas')::NUMERIC < 0)) THEN
    RAISE EXCEPTION 'Las cantidades de efectivo deben ser números no negativos.';
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

-- Entrada atómica de inventario.
CREATE OR REPLACE FUNCTION public.registrar_entrada_inventario(
  p_sucursal_id UUID,
  p_producto_id UUID,
  p_cantidad NUMERIC,
  p_motivo TEXT,
  p_usuario_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stock NUMERIC := 0;
BEGIN
  PERFORM public.altix_require_actor(p_usuario_id, p_sucursal_id);
  IF p_cantidad IS NULL OR p_cantidad <= 0 OR length(btrim(COALESCE(p_motivo, ''))) = 0 THEN
    RAISE EXCEPTION 'Cantidad y motivo son obligatorios.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.productos WHERE id = p_producto_id AND activo = true) THEN
    RAISE EXCEPTION 'El producto no existe o está inactivo.';
  END IF;
  SELECT stock INTO v_stock FROM public.inventarios
  WHERE sucursal_id = p_sucursal_id AND producto_id = p_producto_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.inventarios (sucursal_id, producto_id, stock)
    VALUES (p_sucursal_id, p_producto_id, p_cantidad);
  ELSE
    UPDATE public.inventarios SET stock = stock + p_cantidad
    WHERE sucursal_id = p_sucursal_id AND producto_id = p_producto_id;
  END IF;
  INSERT INTO public.movimientos_inventario (sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
  VALUES (p_sucursal_id, p_producto_id, 'entrada', p_cantidad, v_stock, v_stock + p_cantidad, btrim(p_motivo), p_usuario_id);
END;
$$;

-- Traslado atómico con movimientos de kardex en ambas sucursales.
CREATE OR REPLACE FUNCTION public.trasladar_inventario(
  p_sucursal_origen_id UUID,
  p_sucursal_destino_id UUID,
  p_producto_id UUID,
  p_cantidad NUMERIC,
  p_solicitado_por UUID,
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_origen NUMERIC;
  v_destino NUMERIC := 0;
  v_traslado_id UUID;
BEGIN
  IF p_sucursal_origen_id = p_sucursal_destino_id OR p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'El traslado requiere sucursales distintas y una cantidad positiva.';
  END IF;
  PERFORM public.altix_require_actor(p_solicitado_por, p_sucursal_origen_id);
  IF NOT public.altix_can_access_branch(p_sucursal_destino_id, p_solicitado_por) THEN
    RAISE EXCEPTION 'El usuario no está autorizado para la sucursal destino.';
  END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT id INTO v_traslado_id FROM public.traslados WHERE operation_id = p_operation_id;
    IF v_traslado_id IS NOT NULL THEN RETURN v_traslado_id; END IF;
  END IF;
  IF p_sucursal_origen_id::TEXT < p_sucursal_destino_id::TEXT THEN
    PERFORM 1 FROM public.inventarios WHERE sucursal_id = p_sucursal_origen_id AND producto_id = p_producto_id FOR UPDATE;
    PERFORM 1 FROM public.inventarios WHERE sucursal_id = p_sucursal_destino_id AND producto_id = p_producto_id FOR UPDATE;
  ELSE
    PERFORM 1 FROM public.inventarios WHERE sucursal_id = p_sucursal_destino_id AND producto_id = p_producto_id FOR UPDATE;
    PERFORM 1 FROM public.inventarios WHERE sucursal_id = p_sucursal_origen_id AND producto_id = p_producto_id FOR UPDATE;
  END IF;
  SELECT stock INTO v_origen FROM public.inventarios
  WHERE sucursal_id = p_sucursal_origen_id AND producto_id = p_producto_id FOR UPDATE;
  IF v_origen IS NULL OR v_origen < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente en la sucursal de origen.';
  END IF;
  SELECT stock INTO v_destino FROM public.inventarios
  WHERE sucursal_id = p_sucursal_destino_id AND producto_id = p_producto_id FOR UPDATE;
  IF NOT FOUND OR v_destino IS NULL THEN v_destino := 0; END IF;
  UPDATE public.inventarios SET stock = stock - p_cantidad
  WHERE sucursal_id = p_sucursal_origen_id AND producto_id = p_producto_id;
  INSERT INTO public.inventarios (sucursal_id, producto_id, stock)
  VALUES (p_sucursal_destino_id, p_producto_id, p_cantidad)
  ON CONFLICT (sucursal_id, producto_id) DO UPDATE SET stock = public.inventarios.stock + EXCLUDED.stock;
  INSERT INTO public.traslados (sucursal_origen_id, sucursal_destino_id, estado, solicitado_por, operation_id)
  VALUES (p_sucursal_origen_id, p_sucursal_destino_id, 'recibido', p_solicitado_por, p_operation_id)
  RETURNING id INTO v_traslado_id;
  INSERT INTO public.traslado_items (traslado_id, producto_id, cantidad)
  VALUES (v_traslado_id, p_producto_id, p_cantidad);
  INSERT INTO public.movimientos_inventario (sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
  VALUES
    (p_sucursal_origen_id, p_producto_id, 'traslado_salida', p_cantidad, v_origen, v_origen - p_cantidad, 'Traslado ' || v_traslado_id, p_solicitado_por),
    (p_sucursal_destino_id, p_producto_id, 'traslado_entrada', p_cantidad, v_destino, v_destino + p_cantidad, 'Traslado ' || v_traslado_id, p_solicitado_por);
  RETURN v_traslado_id;
END;
$$;

-- Defectuoso es control histórico: no toca inventario disponible ni kardex.
CREATE OR REPLACE FUNCTION public.registrar_defectuoso(
  p_sucursal_id UUID,
  p_producto_id UUID,
  p_cantidad NUMERIC,
  p_motivo TEXT,
  p_reportado_por UUID,
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  PERFORM public.altix_require_actor(p_reportado_por, p_sucursal_id);
  IF p_cantidad IS NULL OR p_cantidad <= 0 OR length(btrim(COALESCE(p_motivo, ''))) = 0 THEN
    RAISE EXCEPTION 'Cantidad y motivo son obligatorios.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.productos WHERE id = p_producto_id AND activo = true) THEN
    RAISE EXCEPTION 'El producto no existe o está inactivo.';
  END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.defectuosos WHERE operation_id = p_operation_id;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;
  INSERT INTO public.defectuosos (sucursal_id, producto_id, cantidad, motivo, reportado_por)
  VALUES (p_sucursal_id, p_producto_id, p_cantidad, btrim(p_motivo), p_reportado_por)
  RETURNING id INTO v_id;
  UPDATE public.defectuosos SET operation_id = p_operation_id WHERE id = v_id;
  RETURN v_id;
END;
$$;

-- Solicitud y resolución de ajustes: el stock solo cambia al aprobar.
CREATE OR REPLACE FUNCTION public.solicitar_ajuste_inventario(
  p_sucursal_id UUID,
  p_producto_id UUID,
  p_stock_nuevo NUMERIC,
  p_motivo TEXT,
  p_solicitado_por UUID,
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID; v_stock NUMERIC;
BEGIN
  PERFORM public.altix_require_actor(p_solicitado_por, p_sucursal_id);
  IF p_stock_nuevo IS NULL OR p_stock_nuevo < 0 OR length(btrim(COALESCE(p_motivo, ''))) = 0 THEN
    RAISE EXCEPTION 'Nuevo stock y motivo son obligatorios.';
  END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.solicitudes_ajuste_inventario WHERE operation_id = p_operation_id;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;
  SELECT stock INTO v_stock FROM public.inventarios
  WHERE sucursal_id = p_sucursal_id AND producto_id = p_producto_id FOR UPDATE;
  IF v_stock IS NULL THEN RAISE EXCEPTION 'El producto no está configurado en la sucursal.'; END IF;
  INSERT INTO public.solicitudes_ajuste_inventario
    (sucursal_id, producto_id, stock_anterior, stock_nuevo, motivo, solicitado_por, operation_id)
  VALUES (p_sucursal_id, p_producto_id, v_stock, p_stock_nuevo, btrim(p_motivo), p_solicitado_por, p_operation_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.aprobar_ajuste_inventario(
  p_ajuste_id UUID,
  p_aprobado_por UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_ajuste RECORD; v_stock NUMERIC;
BEGIN
  IF NOT public.altix_is_admin(p_aprobado_por) OR (auth.uid() IS NOT NULL AND auth.uid() <> p_aprobado_por) THEN
    RAISE EXCEPTION 'Solo un administrador autenticado puede aprobar ajustes.';
  END IF;
  SELECT * INTO v_ajuste FROM public.solicitudes_ajuste_inventario WHERE id = p_ajuste_id FOR UPDATE;
  IF NOT FOUND OR v_ajuste.estado <> 'pendiente' THEN RAISE EXCEPTION 'La solicitud no está pendiente.'; END IF;
  SELECT stock INTO v_stock FROM public.inventarios
  WHERE sucursal_id = v_ajuste.sucursal_id AND producto_id = v_ajuste.producto_id FOR UPDATE;
  IF v_stock IS DISTINCT FROM v_ajuste.stock_anterior THEN
    RAISE EXCEPTION 'El stock cambió desde la solicitud; requiere una nueva solicitud.';
  END IF;
  UPDATE public.inventarios SET stock = v_ajuste.stock_nuevo
  WHERE sucursal_id = v_ajuste.sucursal_id AND producto_id = v_ajuste.producto_id;
  INSERT INTO public.movimientos_inventario (sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
  VALUES (v_ajuste.sucursal_id, v_ajuste.producto_id, 'ajuste', abs(v_ajuste.stock_nuevo - v_ajuste.stock_anterior), v_ajuste.stock_anterior, v_ajuste.stock_nuevo, v_ajuste.motivo, p_aprobado_por);
  UPDATE public.solicitudes_ajuste_inventario
  SET estado = 'aprobado', revisado_por = p_aprobado_por, revisado_at = now()
  WHERE id = p_ajuste_id;
  RETURN p_ajuste_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rechazar_ajuste_inventario(
  p_ajuste_id UUID,
  p_rechazado_por UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.altix_is_admin(p_rechazado_por) OR (auth.uid() IS NOT NULL AND auth.uid() <> p_rechazado_por) THEN
    RAISE EXCEPTION 'Solo un administrador autenticado puede rechazar ajustes.';
  END IF;
  UPDATE public.solicitudes_ajuste_inventario
  SET estado = 'rechazado', revisado_por = p_rechazado_por, revisado_at = now()
  WHERE id = p_ajuste_id AND estado = 'pendiente';
  IF NOT FOUND THEN RAISE EXCEPTION 'La solicitud no está pendiente.'; END IF;
  RETURN p_ajuste_id;
END;
$$;

-- Conteo físico: se guarda parcialmente y nunca modifica stock ni bloquea ventas.
CREATE OR REPLACE FUNCTION public.crear_conteo(
  p_sucursal_id UUID,
  p_realizado_por UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  PERFORM public.altix_require_actor(p_realizado_por, p_sucursal_id);
  INSERT INTO public.conteos (sucursal_id, estado, realizado_por)
  VALUES (p_sucursal_id, 'en_proceso', p_realizado_por) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

DROP FUNCTION IF EXISTS public.guardar_conteo_batch(UUID, JSONB);
CREATE OR REPLACE FUNCTION public.guardar_conteo_batch(
  p_conteo_id UUID,
  p_items JSONB,
  p_finalizar BOOLEAN DEFAULT false
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_conteo RECORD; v_item JSONB; v_stock NUMERIC;
BEGIN
  SELECT * INTO v_conteo FROM public.conteos WHERE id = p_conteo_id FOR UPDATE;
  IF NOT FOUND OR v_conteo.estado <> 'en_proceso' THEN RAISE EXCEPTION 'El conteo no está disponible.'; END IF;
  PERFORM public.altix_require_actor(v_conteo.realizado_por, v_conteo.sucursal_id);
  IF jsonb_typeof(p_items) <> 'array' THEN RAISE EXCEPTION 'El lote de conteo no es válido.'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF (v_item->>'stock_fisico')::NUMERIC < 0 THEN RAISE EXCEPTION 'El conteo físico no puede ser negativo.'; END IF;
    SELECT stock INTO v_stock FROM public.inventarios
    WHERE sucursal_id = v_conteo.sucursal_id AND producto_id = (v_item->>'producto_id')::UUID;
    INSERT INTO public.conteos_detalle (conteo_id, producto_id, stock_sistema, stock_fisico)
    VALUES (p_conteo_id, (v_item->>'producto_id')::UUID, COALESCE((v_item->>'stock_sistema')::NUMERIC, v_stock, 0), (v_item->>'stock_fisico')::NUMERIC)
    ON CONFLICT (conteo_id, producto_id) DO UPDATE SET stock_sistema = EXCLUDED.stock_sistema, stock_fisico = EXCLUDED.stock_fisico;
  END LOOP;
  IF p_finalizar THEN UPDATE public.conteos SET estado = 'finalizado' WHERE id = p_conteo_id; END IF;
END;
$$;

-- Defectuosos y ajustes tienen contratos auditables; los gastos tienen aprobación no destructiva.
DROP FUNCTION IF EXISTS public.registrar_gasto(UUID, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.registrar_gasto(
  p_sesion_caja_id UUID,
  p_sucursal_id UUID,
  p_categoria TEXT,
  p_monto NUMERIC,
  p_descripcion TEXT,
  p_comprobante_url TEXT,
  p_registrado_por UUID,
  p_observacion TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_gasto_id UUID; v_estado TEXT;
BEGIN
  PERFORM public.altix_require_actor(p_registrado_por, p_sucursal_id);
  IF p_monto IS NULL OR p_monto <= 0 OR length(btrim(COALESCE(p_categoria, ''))) = 0 OR length(btrim(COALESCE(p_descripcion, ''))) = 0 THEN
    RAISE EXCEPTION 'Categoría, descripción y monto son obligatorios.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sesiones_caja WHERE id = p_sesion_caja_id AND sucursal_id = p_sucursal_id AND estado = 'abierta') THEN
    RAISE EXCEPTION 'La sesión de caja no existe o no está abierta.';
  END IF;
  v_estado := CASE WHEN public.altix_is_admin(p_registrado_por) THEN 'aprobado' ELSE 'pendiente' END;
  INSERT INTO public.gastos (sesion_caja_id, sucursal_id, categoria, monto, descripcion, comprobante_url, registrado_por, observacion, estado, autorizado_por, autorizado_at)
  VALUES (p_sesion_caja_id, p_sucursal_id, btrim(p_categoria), p_monto, btrim(p_descripcion), NULLIF(btrim(p_comprobante_url), ''), p_registrado_por, NULLIF(btrim(p_observacion), ''), v_estado, CASE WHEN v_estado = 'aprobado' THEN p_registrado_por END, CASE WHEN v_estado = 'aprobado' THEN now() END)
  RETURNING id INTO v_gasto_id;
  IF v_estado = 'aprobado' THEN
    INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id)
    VALUES (p_sesion_caja_id, 'egreso', p_monto, 'Gasto: ' || btrim(p_descripcion), v_gasto_id);
  END IF;
  RETURN v_gasto_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolver_gasto(
  p_gasto_id UUID,
  p_aprobador_id UUID,
  p_aprobar BOOLEAN
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_gasto RECORD;
BEGIN
  IF NOT public.altix_is_admin(p_aprobador_id) OR (auth.uid() IS NOT NULL AND auth.uid() <> p_aprobador_id) THEN
    RAISE EXCEPTION 'Solo un administrador autenticado puede resolver gastos.';
  END IF;
  SELECT * INTO v_gasto FROM public.gastos WHERE id = p_gasto_id FOR UPDATE;
  IF NOT FOUND OR v_gasto.estado <> 'pendiente' THEN RAISE EXCEPTION 'El gasto no está pendiente.'; END IF;
  UPDATE public.gastos SET estado = CASE WHEN p_aprobar THEN 'aprobado' ELSE 'rechazado' END, autorizado_por = p_aprobador_id, autorizado_at = now() WHERE id = p_gasto_id;
  IF p_aprobar THEN
    INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id)
    VALUES (v_gasto.sesion_caja_id, 'egreso', v_gasto.monto, 'Gasto: ' || v_gasto.descripcion, p_gasto_id);
  END IF;
  RETURN p_gasto_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_movimiento_caja(
  p_sesion_caja_id UUID,
  p_tipo TEXT,
  p_monto NUMERIC,
  p_concepto TEXT,
  p_autorizado_por UUID,
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID; v_sesion RECORD;
BEGIN
  IF NOT public.altix_is_admin(p_autorizado_por) OR (auth.uid() IS NOT NULL AND auth.uid() <> p_autorizado_por) THEN
    RAISE EXCEPTION 'Solo un administrador autenticado puede autorizar movimientos de caja.';
  END IF;
  SELECT * INTO v_sesion FROM public.sesiones_caja WHERE id = p_sesion_caja_id FOR UPDATE;
  IF NOT FOUND OR v_sesion.estado <> 'abierta' THEN RAISE EXCEPTION 'La sesión de caja no está abierta.'; END IF;
  IF p_tipo NOT IN ('ingreso', 'egreso') OR p_monto IS NULL OR p_monto <= 0 OR length(btrim(COALESCE(p_concepto, ''))) = 0 THEN
    RAISE EXCEPTION 'Tipo, monto y concepto son obligatorios.';
  END IF;
  IF p_operation_id IS NOT NULL THEN SELECT id INTO v_id FROM public.movimientos_caja WHERE operation_id = p_operation_id; IF v_id IS NOT NULL THEN RETURN v_id; END IF; END IF;
  INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, monto, concepto, operation_id)
  VALUES (p_sesion_caja_id, p_tipo, p_monto, btrim(p_concepto), p_operation_id) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Devolución: valida la venta, restaura stock y escribe kardex en la misma transacción.
CREATE OR REPLACE FUNCTION public.registrar_devolucion(
  p_venta_id UUID,
  p_motivo TEXT,
  p_autorizado_por UUID,
  p_items JSONB,
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_venta RECORD; v_id UUID; v_item JSONB; v_producto UUID; v_cantidad NUMERIC; v_precio NUMERIC; v_stock NUMERIC; v_vendido NUMERIC; v_devuelto NUMERIC; v_total NUMERIC := 0;
BEGIN
  SELECT * INTO v_venta FROM public.ventas WHERE id = p_venta_id FOR SHARE;
  IF NOT FOUND OR v_venta.cliente_id IS NULL THEN RAISE EXCEPTION 'La venta no existe o no tiene cliente para devolución.'; END IF;
  PERFORM public.altix_require_actor(p_autorizado_por, v_venta.sucursal_id);
  IF length(btrim(COALESCE(p_motivo, ''))) = 0 OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Motivo e items son obligatorios.'; END IF;
  IF p_operation_id IS NOT NULL THEN SELECT id INTO v_id FROM public.devoluciones WHERE operation_id = p_operation_id; IF v_id IS NOT NULL THEN RETURN v_id; END IF; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_producto := (v_item->>'producto_id')::UUID; v_cantidad := (v_item->>'cantidad')::NUMERIC; v_precio := (v_item->>'precio_unitario')::NUMERIC;
    IF v_cantidad <= 0 OR v_precio < 0 THEN RAISE EXCEPTION 'Cantidad o precio inválido en devolución.'; END IF;
    SELECT COALESCE(SUM(cantidad), 0) INTO v_vendido FROM public.venta_items WHERE venta_id = p_venta_id AND producto_id = v_producto;
    SELECT COALESCE(SUM(di.cantidad), 0) INTO v_devuelto FROM public.devolucion_items di JOIN public.devoluciones d ON d.id = di.devolucion_id WHERE d.venta_id = p_venta_id AND di.producto_id = v_producto;
    IF v_vendido = 0 OR v_devuelto + v_cantidad > v_vendido THEN RAISE EXCEPTION 'La cantidad devuelta excede la venta original.'; END IF;
    v_total := v_total + v_cantidad * v_precio;
  END LOOP;
  INSERT INTO public.devoluciones (venta_id, sucursal_id, cliente_id, monto_total, motivo, autorizado_por, operation_id)
  VALUES (p_venta_id, v_venta.sucursal_id, v_venta.cliente_id, v_total, btrim(p_motivo), p_autorizado_por, p_operation_id) RETURNING id INTO v_id;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_producto := (v_item->>'producto_id')::UUID; v_cantidad := (v_item->>'cantidad')::NUMERIC; v_precio := (v_item->>'precio_unitario')::NUMERIC;
    SELECT stock INTO v_stock FROM public.inventarios WHERE sucursal_id = v_venta.sucursal_id AND producto_id = v_producto FOR UPDATE;
    IF v_stock IS NULL THEN INSERT INTO public.inventarios (sucursal_id, producto_id, stock) VALUES (v_venta.sucursal_id, v_producto, v_cantidad); v_stock := 0; ELSE UPDATE public.inventarios SET stock = stock + v_cantidad WHERE sucursal_id = v_venta.sucursal_id AND producto_id = v_producto; END IF;
    INSERT INTO public.devolucion_items (devolucion_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (v_id, v_producto, v_cantidad, v_precio, v_cantidad * v_precio);
    INSERT INTO public.movimientos_inventario (sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id) VALUES (v_venta.sucursal_id, v_producto, 'devolucion', v_cantidad, v_stock, v_stock + v_cantidad, 'Devolución ' || v_id, p_autorizado_por);
  END LOOP;
  INSERT INTO public.saldos_favor (cliente_id, saldo_disponible) VALUES (v_venta.cliente_id, v_total) ON CONFLICT (cliente_id) DO UPDATE SET saldo_disponible = public.saldos_favor.saldo_disponible + EXCLUDED.saldo_disponible;
  RETURN v_id;
END;
$$;

-- Solo una venta en efectivo incrementa el efectivo físico de la sesión.
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
  v_venta_id UUID; v_venta_total NUMERIC; v_venta_cliente UUID; v_venta_sucursal UUID; v_venta_vendedor UUID; v_venta_pedido UUID;
  v_item JSONB; v_prod_id UUID; v_cant NUMERIC; v_precio NUMERIC; v_sum_calculated NUMERIC := 0; v_stock_actual NUMERIC; v_sesion_estado TEXT; v_sesion_sucursal UUID;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'La venta debe contener al menos un producto.'; END IF;
  IF p_tipo_pago NOT IN ('efectivo', 'tarjeta', 'transferencia', 'credito') THEN RAISE EXCEPTION 'Tipo de pago % no permitido.', p_tipo_pago; END IF;
  IF p_total IS NULL OR p_total <= 0 THEN RAISE EXCEPTION 'El total de la venta debe ser mayor a cero.'; END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_vendedor_id AND NOT public.altix_is_admin() THEN RAISE EXCEPTION 'El vendedor autenticado no coincide con la venta.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.usuario_sucursal WHERE user_id = p_vendedor_id AND sucursal_id = p_sucursal_id) THEN RAISE EXCEPTION 'El vendedor no está autorizado para operar en la sucursal.'; END IF;
  IF p_cliente_id IS NULL AND p_tipo_pago = 'credito' THEN RAISE EXCEPTION 'Las ventas a crédito requieren un cliente.'; END IF;
  IF p_cliente_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.clientes WHERE id = p_cliente_id AND activo = true) THEN RAISE EXCEPTION 'El cliente no existe o está inactivo.'; END IF;
  IF p_sesion_caja_id IS NOT NULL THEN
    SELECT estado, sucursal_id INTO v_sesion_estado, v_sesion_sucursal FROM public.sesiones_caja WHERE id = p_sesion_caja_id FOR UPDATE;
    IF v_sesion_estado IS DISTINCT FROM 'abierta' THEN RAISE EXCEPTION 'La sesión de caja no existe o no está abierta.'; END IF;
    IF v_sesion_sucursal IS DISTINCT FROM p_sucursal_id THEN RAISE EXCEPTION 'La sesión de caja no pertenece a la sucursal.'; END IF;
  ELSIF p_tipo_pago <> 'credito' THEN RAISE EXCEPTION 'Se requiere una sesión de caja para este tipo de pago.'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF v_item->>'producto_id' IS NULL OR v_item->>'cantidad' IS NULL OR v_item->>'precio_unitario' IS NULL THEN RAISE EXCEPTION 'Cada item debe incluir producto_id, cantidad y precio_unitario.'; END IF;
    v_cant := (v_item->>'cantidad')::NUMERIC; v_precio := (v_item->>'precio_unitario')::NUMERIC;
    IF v_cant <= 0 OR v_precio < 0 THEN RAISE EXCEPTION 'Cantidad o precio inválido en los items.'; END IF;
    v_sum_calculated := v_sum_calculated + v_cant * v_precio;
  END LOOP;
  IF ABS(v_sum_calculated - p_total) > 0.01 THEN RAISE EXCEPTION 'El total no coincide con la suma de los items.'; END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT id, total, cliente_id, sucursal_id, vendedor_id, pedido_id INTO v_venta_id, v_venta_total, v_venta_cliente, v_venta_sucursal, v_venta_vendedor, v_venta_pedido FROM public.ventas WHERE operation_id = p_operation_id;
    IF v_venta_id IS NOT NULL THEN
      IF v_venta_total <> p_total OR v_venta_cliente IS DISTINCT FROM p_cliente_id OR v_venta_sucursal IS DISTINCT FROM p_sucursal_id OR v_venta_vendedor IS DISTINCT FROM p_vendedor_id OR v_venta_pedido IS DISTINCT FROM p_pedido_id THEN RAISE EXCEPTION 'El operation_id ya fue usado con otro payload.'; END IF;
      RETURN v_venta_id;
    END IF;
  END IF;
  INSERT INTO public.ventas (sucursal_id, cliente_id, vendedor_id, total, operation_id, pedido_id) VALUES (p_sucursal_id, p_cliente_id, p_vendedor_id, p_total, p_operation_id, p_pedido_id) ON CONFLICT (operation_id) DO NOTHING RETURNING id INTO v_venta_id;
  IF v_venta_id IS NULL AND p_operation_id IS NOT NULL THEN SELECT id INTO v_venta_id FROM public.ventas WHERE operation_id = p_operation_id; RETURN v_venta_id; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_prod_id := (v_item->>'producto_id')::UUID; v_cant := (v_item->>'cantidad')::NUMERIC; v_precio := (v_item->>'precio_unitario')::NUMERIC;
    SELECT stock INTO v_stock_actual FROM public.inventarios WHERE sucursal_id = p_sucursal_id AND producto_id = v_prod_id FOR UPDATE;
    IF v_stock_actual IS NULL OR v_stock_actual < v_cant THEN RAISE EXCEPTION 'Stock insuficiente o producto no configurado en la sucursal.'; END IF;
    INSERT INTO public.venta_items (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (v_venta_id, v_prod_id, v_cant, v_precio, v_cant * v_precio);
    UPDATE public.inventarios SET stock = stock - v_cant WHERE sucursal_id = p_sucursal_id AND producto_id = v_prod_id;
    INSERT INTO public.movimientos_inventario (sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id) VALUES (p_sucursal_id, v_prod_id, 'salida', v_cant, v_stock_actual, v_stock_actual - v_cant, 'Venta ' || v_venta_id, p_vendedor_id);
  END LOOP;
  IF p_sesion_caja_id IS NOT NULL AND p_tipo_pago = 'efectivo' THEN
    INSERT INTO public.movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id) VALUES (p_sesion_caja_id, 'ingreso', p_total, 'Venta ' || substring(v_venta_id::text, 1, 8), v_venta_id, p_operation_id);
  END IF;
  PERFORM public.generar_comision(v_venta_id);
  RETURN v_venta_id;
END;
$$;
