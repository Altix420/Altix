-- FULL V1: aceptación externa registrada por ALTIX, centro de aprobaciones y auditoría automática.

ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS cliente_acepto BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aceptado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS aceptado_por UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS metodo_aceptacion TEXT,
  ADD COLUMN IF NOT EXISTS nota_aceptacion TEXT,
  ADD COLUMN IF NOT EXISTS aceptacion_operation_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS cotizaciones_aceptacion_operation_uidx
  ON public.cotizaciones(aceptacion_operation_id) WHERE aceptacion_operation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.aprobaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('descuento', 'precio_especial', 'cliente_mayorista', 'credito', 'pedido_especial', 'ajuste_inventario', 'gasto', 'otro')),
  solicitante_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE RESTRICT,
  referencia_tabla TEXT,
  referencia_id UUID,
  valor_solicitado NUMERIC(12,2),
  datos_solicitados JSONB NOT NULL DEFAULT '{}'::jsonb,
  motivo TEXT NOT NULL CHECK (length(btrim(motivo)) > 0),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  revisado_por UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  revisado_at TIMESTAMPTZ,
  nota_resolucion TEXT,
  operation_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aprobaciones_estado_fecha
  ON public.aprobaciones(estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aprobaciones_solicitante
  ON public.aprobaciones(solicitante_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aprobaciones_referencia
  ON public.aprobaciones(referencia_tabla, referencia_id);

ALTER TABLE public.aprobaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura de aprobaciones propias o admin" ON public.aprobaciones;
CREATE POLICY "Lectura de aprobaciones propias o admin" ON public.aprobaciones
  FOR SELECT TO authenticated USING (public.altix_is_admin() OR solicitante_id = auth.uid());

-- No se crean políticas INSERT/UPDATE/DELETE: las mutaciones pasan por RPC o triggers.

CREATE OR REPLACE FUNCTION public.altix_crear_aprobacion(
  p_tipo TEXT,
  p_solicitante_id UUID,
  p_sucursal_id UUID,
  p_referencia_tabla TEXT,
  p_referencia_id UUID,
  p_valor_solicitado NUMERIC,
  p_datos_solicitados JSONB,
  p_motivo TEXT,
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.aprobaciones(
    tipo, solicitante_id, sucursal_id, referencia_tabla, referencia_id,
    valor_solicitado, datos_solicitados, motivo, operation_id
  ) VALUES (
    p_tipo, p_solicitante_id, p_sucursal_id, p_referencia_tabla, p_referencia_id,
    p_valor_solicitado, COALESCE(p_datos_solicitados, '{}'::jsonb), btrim(p_motivo), p_operation_id
  ) ON CONFLICT (operation_id) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL AND p_operation_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.aprobaciones WHERE operation_id = p_operation_id;
  END IF;
  RETURN v_id;
END;
$$;

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
BEGIN
  IF p_tipo NOT IN ('descuento', 'precio_especial', 'cliente_mayorista', 'credito', 'pedido_especial', 'otro') THEN
    RAISE EXCEPTION 'El tipo de aprobación no está soportado por este RPC.';
  END IF;
  PERFORM public.altix_require_actor(p_solicitante_id, p_sucursal_id);
  IF length(btrim(COALESCE(p_motivo, ''))) = 0 THEN RAISE EXCEPTION 'El motivo de aprobación es obligatorio.'; END IF;
  RETURN public.altix_crear_aprobacion(
    p_tipo, p_solicitante_id, p_sucursal_id, p_referencia_tabla, p_referencia_id,
    p_valor_solicitado, p_datos_solicitados, p_motivo, p_operation_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.resolver_aprobacion(
  p_aprobacion_id UUID,
  p_revisado_por UUID,
  p_aprobar BOOLEAN,
  p_nota_resolucion TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_request RECORD;
BEGIN
  PERFORM public.altix_require_admin(p_revisado_por);
  SELECT * INTO v_request FROM public.aprobaciones WHERE id = p_aprobacion_id FOR UPDATE;
  IF NOT FOUND OR v_request.estado <> 'pendiente' THEN RAISE EXCEPTION 'La aprobación no está pendiente.'; END IF;
  IF v_request.tipo IN ('ajuste_inventario', 'gasto') THEN
    RAISE EXCEPTION 'Los ajustes y gastos deben resolverse desde su RPC operativo.';
  END IF;
  UPDATE public.aprobaciones
  SET estado = CASE WHEN p_aprobar THEN 'aprobada' ELSE 'rechazada' END,
      revisado_por = p_revisado_por,
      revisado_at = now(),
      nota_resolucion = NULLIF(btrim(p_nota_resolucion), '')
  WHERE id = p_aprobacion_id;
  RETURN p_aprobacion_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_aceptacion_cotizacion(
  p_cotizacion_id UUID,
  p_registrado_por UUID DEFAULT auth.uid(),
  p_metodo_aceptacion TEXT DEFAULT NULL,
  p_nota_aceptacion TEXT DEFAULT NULL,
  p_operation_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_quote RECORD; v_existing UUID;
BEGIN
  SELECT * INTO v_quote FROM public.cotizaciones WHERE id = p_cotizacion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cotización no existe.'; END IF;
  IF public.altix_is_admin(p_registrado_por) THEN
    PERFORM public.altix_require_admin(p_registrado_por);
  ELSE
    PERFORM public.altix_require_actor(v_quote.vendedor_id, v_quote.sucursal_id);
    IF p_registrado_por IS DISTINCT FROM v_quote.vendedor_id THEN
      RAISE EXCEPTION 'Solo el vendedor responsable puede registrar esta aceptación.';
    END IF;
  END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT id INTO v_existing FROM public.cotizaciones WHERE aceptacion_operation_id = p_operation_id;
    IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  END IF;
  IF v_quote.estado <> 'enviada' THEN RAISE EXCEPTION 'La cotización ya no está disponible para aceptación.'; END IF;
  UPDATE public.cotizaciones
  SET cliente_acepto = true,
      aceptado_at = COALESCE(aceptado_at, now()),
      aceptado_por = COALESCE(aceptado_por, p_registrado_por),
      metodo_aceptacion = NULLIF(btrim(p_metodo_aceptacion), ''),
      nota_aceptacion = NULLIF(btrim(p_nota_aceptacion), ''),
      aceptacion_operation_id = p_operation_id
  WHERE id = p_cotizacion_id;
  RETURN p_cotizacion_id;
END;
$$;

-- La regla no depende de React: cualquier conversión vieja o nueva debe tener aceptación.
CREATE OR REPLACE FUNCTION public.enforce_accepted_quote_before_conversion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado = 'convertida' AND NOT COALESCE(NEW.cliente_acepto, false) THEN
    RAISE EXCEPTION 'La cotización debe tener aceptación del cliente antes de convertirse.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_quote_requires_acceptance ON public.cotizaciones;
CREATE TRIGGER trg_quote_requires_acceptance
BEFORE UPDATE OF estado ON public.cotizaciones
FOR EACH ROW EXECUTE FUNCTION public.enforce_accepted_quote_before_conversion();

CREATE OR REPLACE FUNCTION public.sync_approval_from_controlled_operation()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_type TEXT; v_state TEXT; v_reviewer UUID; v_reviewed_at TIMESTAMPTZ; v_reason TEXT; v_branch UUID; v_requester UUID; v_amount NUMERIC;
BEGIN
  IF TG_TABLE_NAME = 'solicitudes_ajuste_inventario' THEN
    v_type := 'ajuste_inventario'; v_state := NEW.estado; v_reviewer := NEW.revisado_por; v_reviewed_at := NEW.revisado_at;
    v_reason := NEW.motivo; v_branch := NEW.sucursal_id; v_requester := NEW.solicitado_por;
    v_amount := NULL;
  ELSE
    v_type := 'gasto'; v_state := NEW.estado; v_reviewer := NEW.autorizado_por; v_reviewed_at := NEW.autorizado_at;
    v_reason := NEW.descripcion; v_branch := NEW.sucursal_id; v_requester := NEW.registrado_por; v_amount := NEW.monto;
  END IF;
  IF TG_OP = 'INSERT' AND v_state = 'pendiente' THEN
    PERFORM public.altix_crear_aprobacion(v_type, v_requester, v_branch, TG_TABLE_NAME, NEW.id, v_amount, '{}'::jsonb, v_reason, NULL);
  ELSIF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    UPDATE public.aprobaciones
    SET estado = CASE WHEN v_state = 'aprobado' THEN 'aprobada' ELSE 'rechazada' END,
        revisado_por = v_reviewer, revisado_at = v_reviewed_at
    WHERE referencia_tabla = TG_TABLE_NAME AND referencia_id = NEW.id AND estado = 'pendiente';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_approval_adjustment_sync ON public.solicitudes_ajuste_inventario;
CREATE TRIGGER trg_approval_adjustment_sync AFTER INSERT OR UPDATE OF estado ON public.solicitudes_ajuste_inventario
FOR EACH ROW EXECUTE FUNCTION public.sync_approval_from_controlled_operation();
DROP TRIGGER IF EXISTS trg_approval_expense_sync ON public.gastos;
CREATE TRIGGER trg_approval_expense_sync AFTER INSERT OR UPDATE OF estado ON public.gastos
FOR EACH ROW EXECUTE FUNCTION public.sync_approval_from_controlled_operation();

-- Auditoría automática para cambios críticos. La bitácora no es un ledger y no reemplaza movimientos.
CREATE OR REPLACE FUNCTION public.audit_critical_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID; v_old JSONB; v_new JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN v_id := OLD.id; v_old := to_jsonb(OLD); ELSE v_id := NEW.id; v_new := to_jsonb(NEW); IF TG_OP = 'UPDATE' THEN v_old := to_jsonb(OLD); END IF; END IF;
  INSERT INTO public.bitacora_auditoria(usuario_id, accion, tabla_afectada, registro_id, datos_anteriores, datos_nuevos)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, v_id, v_old, v_new);
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'cotizaciones','pedidos','anticipos','entregas','ventas','pagos_credito',
    'solicitudes_ajuste_inventario','gastos','sesiones_caja','movimientos_caja',
    'movimientos_inventario','defectuosos','devoluciones','aprobaciones',
    'productos','reglas_descuento','clientes','profiles'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', v_table, v_table);
    EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_critical_row_change()', v_table, v_table);
  END LOOP;
END;
$$;

-- Bitácora: solo Admin puede leer; no hay políticas mutables para usuarios ni Admin.
