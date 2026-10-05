-- 038: reconstruye las series del dashboard con la misma fuente y filtros que los KPI.
-- No cambia reglas financieras; solo completa la respuesta visual del RPC existente.

CREATE OR REPLACE FUNCTION public.obtener_dashboard_admin(
  p_desde DATE DEFAULT date_trunc('month', timezone('America/Guatemala', now()))::date,
  p_hasta DATE DEFAULT timezone('America/Guatemala', now())::date,
  p_sucursal_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
  v_sales NUMERIC := 0;
  v_returns NUMERIC := 0;
  v_cost NUMERIC := 0;
  v_commissions NUMERIC := 0;
BEGIN
  PERFORM public.altix_require_admin(auth.uid());

  -- Preserve the financial KPI contract from migration 035, including returns.
  SELECT COALESCE(SUM(v.total), 0) INTO v_sales
  FROM public.ventas v
  WHERE v.entregada
    AND (v.created_at AT TIME ZONE 'America/Guatemala')::date BETWEEN p_desde AND p_hasta
    AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id);

  SELECT COALESCE(SUM(d.monto_total), 0) INTO v_returns
  FROM public.devoluciones d
  WHERE d.fecha_operativa BETWEEN p_desde AND p_hasta
    AND (p_sucursal_id IS NULL OR d.sucursal_id = p_sucursal_id);

  SELECT COALESCE(SUM(vc.cantidad * vc.costo_unitario), 0) INTO v_cost
  FROM public.venta_costos vc
  JOIN public.venta_items vi ON vi.id = vc.venta_item_id
  JOIN public.ventas v ON v.id = vi.venta_id
  WHERE v.entregada
    AND (v.created_at AT TIME ZONE 'America/Guatemala')::date BETWEEN p_desde AND p_hasta
    AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id);

  SELECT COALESCE((
    SELECT SUM(c.monto_comision)
    FROM public.comisiones c
    JOIN public.ventas v ON v.id = c.venta_id
    WHERE v.entregada
      AND (v.created_at AT TIME ZONE 'America/Guatemala')::date BETWEEN p_desde AND p_hasta
      AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id)
  ), 0) + COALESCE((
    SELECT SUM(a.monto_ajuste)
    FROM public.ajustes_comision a
    JOIN public.comisiones c ON c.id = a.comision_id
    JOIN public.ventas v ON v.id = c.venta_id
    WHERE (v.created_at AT TIME ZONE 'America/Guatemala')::date BETWEEN p_desde AND p_hasta
      AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id)
  ), 0) INTO v_commissions;

  WITH filtered_sales AS (
    SELECT v.*
    FROM public.ventas v
    WHERE v.entregada
      AND (v.created_at AT TIME ZONE 'America/Guatemala')::date BETWEEN p_desde AND p_hasta
      AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id)
  ),
  sales_daily AS (
    SELECT (v.created_at AT TIME ZONE 'America/Guatemala')::date AS sales_day, SUM(v.total) AS sales
    FROM filtered_sales v
    GROUP BY 1
  ),
  cost_daily AS (
    SELECT (v.created_at AT TIME ZONE 'America/Guatemala')::date AS sales_day, SUM(vc.cantidad * vc.costo_unitario) AS cost
    FROM filtered_sales v
    JOIN public.venta_items vi ON vi.venta_id = v.id
    JOIN public.venta_costos vc ON vc.venta_item_id = vi.id
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'sales_period', v_sales - v_returns,
      'net_sales', v_sales - v_returns,
      'cost_of_sales', v_cost,
      'gross_profit', v_sales - v_returns - v_cost,
      'commissions', v_commissions,
      'profit_after_commissions', v_sales - v_returns - v_cost - v_commissions,
      'cash', COALESCE((SELECT SUM(s.monto_apertura + COALESCE((SELECT SUM(CASE WHEN mc.tipo = 'ingreso' THEN mc.monto ELSE -mc.monto END) FROM public.movimientos_caja mc WHERE mc.sesion_caja_id = s.id), 0)) FROM public.sesiones_caja s WHERE s.estado = 'abierta' AND (p_sucursal_id IS NULL OR s.sucursal_id = p_sucursal_id)), 0),
      'pending_approvals', COALESCE((SELECT COUNT(*) FROM public.aprobaciones a WHERE a.estado = 'pendiente' AND (p_sucursal_id IS NULL OR a.sucursal_id = p_sucursal_id)), 0),
      'orders', COALESCE((SELECT COUNT(*) FROM public.pedidos p WHERE (p.created_at AT TIME ZONE 'America/Guatemala')::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR p.sucursal_id = p_sucursal_id)), 0),
      'quotes', COALESCE((SELECT COUNT(*) FROM public.cotizaciones q WHERE (q.created_at AT TIME ZONE 'America/Guatemala')::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR q.sucursal_id = p_sucursal_id)), 0)
    ),
    'sales_over_time', COALESCE((SELECT jsonb_agg(jsonb_build_object('sales_day', sales_day, 'sales', sales) ORDER BY sales_day) FROM sales_daily), '[]'::jsonb),
    'cost_profit_over_time', COALESCE((SELECT jsonb_agg(jsonb_build_object('sales_day', s.sales_day, 'sales', s.sales, 'cost', COALESCE(c.cost, 0), 'gross_profit', s.sales - COALESCE(c.cost, 0)) ORDER BY s.sales_day) FROM sales_daily s LEFT JOIN cost_daily c USING (sales_day)), '[]'::jsonb),
    'sales_by_branch', COALESCE((SELECT jsonb_agg(x ORDER BY x.sales DESC) FROM (SELECT COALESCE(s.nombre, 'Sin sucursal') AS branch, SUM(v.total) AS sales FROM filtered_sales v LEFT JOIN public.sucursales s ON s.id = v.sucursal_id GROUP BY 1) x), '[]'::jsonb),
    'sales_by_seller', COALESCE((SELECT jsonb_agg(x ORDER BY x.sales DESC) FROM (SELECT COALESCE(pr.nombre_completo, 'Sin vendedor') AS seller, SUM(v.total) AS sales FROM filtered_sales v LEFT JOIN public.profiles pr ON pr.id = v.vendedor_id GROUP BY 1) x), '[]'::jsonb),
    'customer_type', COALESCE((SELECT jsonb_agg(x ORDER BY x.sales DESC) FROM (SELECT CASE WHEN COALESCE(c.es_mayorista, false) THEN 'mayorista' ELSE 'final' END AS customer_type, SUM(v.total) AS sales, COUNT(*) AS sales_count FROM filtered_sales v LEFT JOIN public.clientes c ON c.id = v.cliente_id GROUP BY 1) x), '[]'::jsonb),
    'products_sold', COALESCE((SELECT SUM(vi.cantidad) FROM filtered_sales v JOIN public.venta_items vi ON vi.venta_id = v.id), 0)
  ) INTO v_result;
  RETURN v_result;
END;
$$;
