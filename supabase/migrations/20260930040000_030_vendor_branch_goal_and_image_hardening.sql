-- Vendor dashboard reads the real branch goal while retaining seller-only progress.
CREATE OR REPLACE FUNCTION public.obtener_dashboard_vendedor(p_vendedor_id UUID DEFAULT auth.uid()) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
  v_today DATE := timezone('America/Guatemala', now())::date;
  v_branch_id UUID;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_vendedor_id OR public.altix_role(p_vendedor_id) <> 'vendedor' THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;
  SELECT us.sucursal_id INTO v_branch_id
  FROM public.usuario_sucursal us
  WHERE us.user_id = p_vendedor_id
  ORDER BY us.sucursal_id
  LIMIT 1;
  SELECT jsonb_build_object(
    'sales_today', COALESCE((SELECT sum(total) FROM public.ventas WHERE vendedor_id = p_vendedor_id AND created_at::date = v_today), 0),
    'sales_month', COALESCE((SELECT sum(total) FROM public.ventas WHERE vendedor_id = p_vendedor_id AND created_at::date BETWEEN date_trunc('month', v_today)::date AND v_today), 0),
    'commission_month', COALESCE((SELECT sum(monto_comision) FROM public.comisiones WHERE vendedor_id = p_vendedor_id AND periodo = to_char(v_today, 'YYYY-MM')), 0),
    'quotes', COALESCE((SELECT count(*) FROM public.cotizaciones WHERE vendedor_id = p_vendedor_id), 0),
    'orders', COALESCE((SELECT count(*) FROM public.pedidos WHERE vendedor_id = p_vendedor_id), 0),
    'clients', COALESCE((SELECT count(DISTINCT cliente_id) FROM public.ventas WHERE vendedor_id = p_vendedor_id), 0),
    'wholesale_clients', COALESCE((SELECT count(DISTINCT v.cliente_id) FROM public.ventas v JOIN public.clientes c ON c.id = v.cliente_id WHERE v.vendedor_id = p_vendedor_id AND c.es_mayorista), 0),
    'goal', COALESCE((
      SELECT jsonb_build_object(
        'id', m.id,
        'objetivo', m.objetivo_ventas,
        'inicio', m.periodo_inicio,
        'fin', m.periodo_fin,
        'progreso', COALESCE((SELECT sum(v.total) FROM public.ventas v WHERE v.vendedor_id = p_vendedor_id AND v.created_at::date BETWEEN m.periodo_inicio AND m.periodo_fin), 0),
        'alcance', 'sucursal'
      )
      FROM public.metas_sucursal m
      WHERE m.sucursal_id = v_branch_id AND m.activa AND v_today BETWEEN m.periodo_inicio AND m.periodo_fin
      ORDER BY m.created_at DESC
      LIMIT 1
    ), 'null'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

