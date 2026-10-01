-- Completa sucursal en auditoría para operaciones cuyo registro usa una relación.

CREATE OR REPLACE FUNCTION public.audit_critical_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_old JSONB;
  v_new JSONB;
  v_branch UUID;
  v_related UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_id := OLD.id;
    v_old := to_jsonb(OLD);
  ELSE
    v_id := NEW.id;
    v_new := to_jsonb(NEW);
    IF TG_OP = 'UPDATE' THEN v_old := to_jsonb(OLD); END IF;
  END IF;
  v_branch := NULLIF(COALESCE(v_new->>'sucursal_id', v_old->>'sucursal_id'), '')::UUID;
  IF v_branch IS NULL AND TG_TABLE_NAME IN ('anticipos', 'entregas') THEN
    v_related := NULLIF(COALESCE(v_new->>'pedido_id', v_old->>'pedido_id'), '')::UUID;
    SELECT sucursal_id INTO v_branch FROM public.pedidos WHERE id = v_related;
  ELSIF v_branch IS NULL AND TG_TABLE_NAME = 'movimientos_caja' THEN
    v_related := NULLIF(COALESCE(v_new->>'sesion_caja_id', v_old->>'sesion_caja_id'), '')::UUID;
    SELECT sucursal_id INTO v_branch FROM public.sesiones_caja WHERE id = v_related;
  ELSIF v_branch IS NULL AND TG_TABLE_NAME = 'pagos_credito' THEN
    v_related := NULLIF(COALESCE(v_new->>'cuenta_cobrar_id', v_old->>'cuenta_cobrar_id'), '')::UUID;
    SELECT COALESCE(v.sucursal_id, p.sucursal_id) INTO v_branch
    FROM public.cuentas_cobrar c
    LEFT JOIN public.ventas v ON v.id = c.venta_id
    LEFT JOIN public.pedidos p ON p.id = c.pedido_id
    WHERE c.id = v_related;
  END IF;
  INSERT INTO public.bitacora_auditoria(
    usuario_id, sucursal_id, accion, tabla_afectada, registro_id,
    datos_anteriores, datos_nuevos
  ) VALUES (
    auth.uid(), v_branch, TG_OP, TG_TABLE_NAME, v_id, v_old, v_new
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
