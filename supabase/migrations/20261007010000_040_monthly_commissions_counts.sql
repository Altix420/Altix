-- 040: comisión mensual acumulada y lectura operativa de conteos.
-- El ledger existente se conserva; las diferencias se registran en ajustes.

CREATE OR REPLACE FUNCTION public.obtener_comision_mensual_vendedor(
  p_vendedor_id UUID DEFAULT auth.uid(),
  p_periodo TEXT DEFAULT to_char(timezone('America/Guatemala', now()), 'YYYY-MM')
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inicio DATE := to_date(p_periodo || '-01', 'YYYY-MM-DD');
  v_fin DATE := (v_inicio + INTERVAL '1 month')::date;
  v_final NUMERIC := 0;
  v_mayorista NUMERIC := 0;
  v_devoluciones NUMERIC := 0;
  v_porcentaje NUMERIC := 0;
  v_siguiente NUMERIC;
  v_siguiente_porcentaje NUMERIC;
  v_ledger NUMERIC := 0;
  v_objetivo NUMERIC := 0;
  v_comision_id UUID;
BEGIN
  IF p_vendedor_id IS NULL OR (NOT public.altix_is_admin(auth.uid()) AND auth.uid() <> p_vendedor_id) THEN
    RAISE EXCEPTION 'No autorizado para consultar la comisión mensual.';
  END IF;
  SELECT COALESCE(SUM(CASE WHEN COALESCE(c.es_mayorista, false) THEN v.total ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN NOT COALESCE(c.es_mayorista, false) THEN v.total ELSE 0 END), 0)
  INTO v_mayorista, v_final
  FROM public.ventas v
  LEFT JOIN public.clientes c ON c.id = v.cliente_id
  WHERE v.vendedor_id = p_vendedor_id AND v.entregada
    AND (v.created_at AT TIME ZONE 'America/Guatemala')::date >= v_inicio
    AND (v.created_at AT TIME ZONE 'America/Guatemala')::date < v_fin
    AND NOT EXISTS (SELECT 1 FROM public.cuentas_cobrar cc WHERE cc.venta_id = v.id AND cc.saldo_pendiente > 0);

  SELECT COALESCE(SUM(d.monto_total), 0) INTO v_devoluciones
  FROM public.devoluciones d JOIN public.ventas v ON v.id = d.venta_id
  WHERE v.vendedor_id = p_vendedor_id AND d.fecha_operativa >= v_inicio AND d.fecha_operativa < v_fin;
  v_final := GREATEST(v_final - v_devoluciones, 0);

  SELECT porcentaje, monto_min INTO v_porcentaje, v_siguiente
  FROM public.reglas_comision
  WHERE tipo_cliente = 'cliente_final' AND activa AND v_final >= monto_min AND v_final <= monto_max
  ORDER BY monto_min DESC LIMIT 1;
  SELECT monto_min, porcentaje INTO v_siguiente, v_siguiente_porcentaje
  FROM public.reglas_comision
  WHERE tipo_cliente = 'cliente_final' AND activa AND monto_min > v_final
  ORDER BY monto_min LIMIT 1;

  SELECT COALESCE(SUM(c.monto_comision), 0) + COALESCE((SELECT SUM(a.monto_ajuste) FROM public.ajustes_comision a JOIN public.comisiones c2 ON c2.id = a.comision_id WHERE c2.vendedor_id = p_vendedor_id AND c2.periodo = p_periodo), 0)
  INTO v_ledger FROM public.comisiones c WHERE c.vendedor_id = p_vendedor_id AND c.periodo = p_periodo;
  v_objetivo := ROUND(v_final * COALESCE(v_porcentaje, 0) / 100.0, 2) + ROUND(v_mayorista * COALESCE((SELECT porcentaje FROM public.reglas_comision WHERE tipo_cliente = 'mayorista' AND activa ORDER BY monto_min DESC LIMIT 1), 1) / 100.0, 2);
  SELECT c.id INTO v_comision_id FROM public.comisiones c WHERE c.vendedor_id = p_vendedor_id AND c.periodo = p_periodo ORDER BY c.created_at LIMIT 1;

  RETURN jsonb_build_object(
    'periodo', p_periodo,
    'ventas_elegibles', v_final + v_devoluciones,
    'devoluciones', v_devoluciones,
    'ventas_finales_elegibles', v_final,
    'ventas_mayoristas_elegibles', v_mayorista,
    'porcentaje_actual', COALESCE(v_porcentaje, 0),
    'comision_teorica', v_objetivo,
    'comision_ledger', v_ledger,
    'siguiente_umbral', v_siguiente,
    'siguiente_porcentaje', v_siguiente_porcentaje,
    'faltante_siguiente', CASE WHEN v_siguiente IS NULL THEN 0 ELSE GREATEST(v_siguiente - v_final, 0) END,
    'comision_base_id', v_comision_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.actualizar_comision_mensual(
  p_vendedor_id UUID,
  p_periodo TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_summary JSONB;
  v_base UUID;
  v_target NUMERIC;
  v_ledger NUMERIC;
  v_delta NUMERIC;
  v_operation TEXT;
BEGIN
  PERFORM public.altix_require_admin(auth.uid());
  v_summary := public.obtener_comision_mensual_vendedor(p_vendedor_id, p_periodo);
  v_base := NULLIF(v_summary->>'comision_base_id', '')::UUID;
  v_target := COALESCE((v_summary->>'comision_teorica')::NUMERIC, 0);
  v_ledger := COALESCE((v_summary->>'comision_ledger')::NUMERIC, 0);
  v_delta := ROUND(v_target - v_ledger, 2);
  IF v_base IS NOT NULL AND v_delta <> 0 THEN
    v_operation := 'comision-mensual:' || p_vendedor_id::text || ':' || p_periodo || ':' || replace(to_char(v_target, 'FM999999990.00'), '.', '_');
    INSERT INTO public.ajustes_comision(comision_id, monto_ajuste, motivo, aprobado_por, operation_id)
    VALUES (v_base, v_delta, 'Ajuste de cierre mensual por acumulado elegible ' || p_periodo, auth.uid(), v_operation)
    ON CONFLICT (operation_id) DO NOTHING;
  END IF;
  RETURN public.obtener_comision_mensual_vendedor(p_vendedor_id, p_periodo);
END;
$$;

GRANT EXECUTE ON FUNCTION public.obtener_comision_mensual_vendedor(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_comision_mensual(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_actualizar_comision_mensual()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- Seller-originated sales must never fail because an admin-only monthly
  -- adjustment cannot run in the same request. Admin closure invokes the RPC.
  IF public.altix_is_admin(auth.uid()) THEN
    PERFORM public.actualizar_comision_mensual(NEW.vendedor_id, NEW.periodo);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_monthly_commission_on_ledger ON public.comisiones;
CREATE TRIGGER trg_monthly_commission_on_ledger
AFTER INSERT ON public.comisiones
FOR EACH ROW EXECUTE FUNCTION public.trg_actualizar_comision_mensual();
