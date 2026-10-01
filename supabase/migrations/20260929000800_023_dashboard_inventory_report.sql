-- Correcciones finales de agregados para dashboard y reporte mensual.

CREATE OR REPLACE FUNCTION public.obtener_dashboard_admin(
  p_desde DATE DEFAULT date_trunc('month', current_date)::date,
  p_hasta DATE DEFAULT current_date,
  p_sucursal_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  PERFORM public.altix_require_admin(auth.uid());

  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'sales_period', COALESCE((SELECT sum(v.total) FROM ventas v WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id)), 0),
      'gross_profit', COALESCE((SELECT sum(v.total - COALESCE((SELECT sum(vc.cantidad * vc.costo_unitario) FROM venta_items vi JOIN venta_costos vc ON vc.venta_item_id = vi.id WHERE vi.venta_id = v.id), 0)) FROM ventas v WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id)), 0),
      'cash', COALESCE((SELECT sum(s.monto_apertura + COALESCE((SELECT sum(CASE WHEN mc.tipo = 'ingreso' THEN mc.monto ELSE -mc.monto END) FROM movimientos_caja mc WHERE mc.sesion_caja_id = s.id), 0)) FROM sesiones_caja s WHERE s.estado = 'abierta' AND (p_sucursal_id IS NULL OR s.sucursal_id = p_sucursal_id)), 0),
      'pending_credit', COALESCE((SELECT sum(c.saldo_pendiente) FROM cuentas_cobrar c LEFT JOIN ventas v ON v.id = c.venta_id LEFT JOIN pedidos p ON p.id = c.pedido_id WHERE c.saldo_pendiente > 0 AND (p_sucursal_id IS NULL OR COALESCE(v.sucursal_id, p.sucursal_id) = p_sucursal_id)), 0),
      'overdue_credit', COALESCE((SELECT sum(c.saldo_pendiente) FROM cuentas_cobrar c LEFT JOIN ventas v ON v.id = c.venta_id LEFT JOIN pedidos p ON p.id = c.pedido_id WHERE c.saldo_pendiente > 0 AND c.fecha_vencimiento < current_date AND (p_sucursal_id IS NULL OR COALESCE(v.sucursal_id, p.sucursal_id) = p_sucursal_id)), 0),
      'due_soon_credit', COALESCE((SELECT sum(c.saldo_pendiente) FROM cuentas_cobrar c LEFT JOIN ventas v ON v.id = c.venta_id LEFT JOIN pedidos p ON p.id = c.pedido_id WHERE c.saldo_pendiente > 0 AND c.fecha_vencimiento BETWEEN current_date AND current_date + 7 AND (p_sucursal_id IS NULL OR COALESCE(v.sucursal_id, p.sucursal_id) = p_sucursal_id)), 0),
      'commissions', COALESCE((SELECT sum(co.monto_comision) FROM comisiones co JOIN ventas v ON v.id = co.venta_id WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id)), 0),
      'low_stock', COALESCE((SELECT count(*) FROM inventarios i WHERE i.stock <= i.stock_minimo AND (p_sucursal_id IS NULL OR i.sucursal_id = p_sucursal_id)), 0),
      'pending_approvals', COALESCE((SELECT count(*) FROM aprobaciones a WHERE a.estado = 'pendiente' AND (p_sucursal_id IS NULL OR a.sucursal_id = p_sucursal_id)), 0),
      'orders', COALESCE((SELECT count(*) FROM pedidos p WHERE p.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR p.sucursal_id = p_sucursal_id)), 0),
      'quotes', COALESCE((SELECT count(*) FROM cotizaciones q WHERE q.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR q.sucursal_id = p_sucursal_id)), 0)
    ),
    'sales_over_time', COALESCE((SELECT jsonb_agg(x ORDER BY x.sales_day) FROM (SELECT v.created_at::date AS sales_day, sum(v.total) sales FROM ventas v WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id) GROUP BY 1) x), '[]'::jsonb),
    'cost_profit_over_time', COALESCE((WITH sales_daily AS (
      SELECT v.created_at::date AS sales_day, sum(v.total) AS sales
      FROM ventas v
      WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id)
      GROUP BY v.created_at::date
    ), cost_daily AS (
      SELECT v.created_at::date AS sales_day, sum(vc.cantidad * vc.costo_unitario) AS cost
      FROM ventas v JOIN venta_items vi ON vi.venta_id = v.id JOIN venta_costos vc ON vc.venta_item_id = vi.id
      WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id)
      GROUP BY v.created_at::date
    ) SELECT jsonb_agg(jsonb_build_object('sales_day', s.sales_day, 'sales', s.sales, 'cost', COALESCE(c.cost, 0), 'gross_profit', s.sales - COALESCE(c.cost, 0)) ORDER BY s.sales_day) FROM sales_daily s LEFT JOIN cost_daily c USING (sales_day)), '[]'::jsonb),
    'sales_by_branch', COALESCE((SELECT jsonb_agg(x ORDER BY x.sales DESC) FROM (SELECT s.nombre branch, sum(v.total) sales FROM ventas v JOIN sucursales s ON s.id = v.sucursal_id WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id) GROUP BY s.nombre) x), '[]'::jsonb),
    'sales_by_seller', COALESCE((SELECT jsonb_agg(x ORDER BY x.sales DESC) FROM (SELECT pr.nombre_completo seller, sum(v.total) sales FROM ventas v JOIN profiles pr ON pr.id = v.vendedor_id WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id) GROUP BY pr.nombre_completo) x), '[]'::jsonb),
    'customer_type', COALESCE((SELECT jsonb_agg(x ORDER BY x.sales DESC) FROM (SELECT CASE WHEN c.es_mayorista THEN 'mayorista' ELSE 'final' END customer_type, sum(v.total) sales, count(*) sales_count FROM ventas v JOIN clientes c ON c.id = v.cliente_id WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id) GROUP BY 1) x), '[]'::jsonb),
    'products_sold', COALESCE((SELECT sum(vi.cantidad) FROM venta_items vi JOIN ventas v ON v.id = vi.venta_id WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id)), 0)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_reporte_inventario_mensual(
  p_mes DATE,
  p_sucursal_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  PERFORM public.altix_require_admin(auth.uid());
  WITH ranked AS (
    SELECT c.*, row_number() OVER (PARTITION BY c.sucursal_id ORDER BY c.created_at DESC) AS row_number
    FROM conteos c
    WHERE c.created_at::date BETWEEN date_trunc('month', p_mes)::date AND (date_trunc('month', p_mes) + interval '1 month' - interval '1 day')::date
      AND c.estado = 'finalizado'
      AND (p_sucursal_id IS NULL OR c.sucursal_id = p_sucursal_id)
  ), latest AS (
    SELECT * FROM ranked WHERE row_number = 1
  )
  SELECT jsonb_build_object(
    'status', CASE WHEN count(l.id) = 0 THEN 'pendiente' ELSE 'ok' END,
    'counts', COALESCE(jsonb_agg(jsonb_build_object(
      'sucursal_id', l.sucursal_id,
      'estado', l.estado,
      'fecha', l.created_at,
      'responsable', pr.nombre_completo,
      'productos', (SELECT count(*) FROM conteos_detalle cd WHERE cd.conteo_id = l.id),
      'teorico', COALESCE((SELECT sum(cd.stock_sistema) FROM conteos_detalle cd WHERE cd.conteo_id = l.id), 0),
      'fisico', COALESCE((SELECT sum(cd.stock_fisico) FROM conteos_detalle cd WHERE cd.conteo_id = l.id), 0),
      'diferencia', COALESCE((SELECT sum(cd.diferencia) FROM conteos_detalle cd WHERE cd.conteo_id = l.id), 0),
      'pendientes', COALESCE((SELECT count(*) FROM inventarios i WHERE i.sucursal_id = l.sucursal_id AND NOT EXISTS (SELECT 1 FROM conteos_detalle cd WHERE cd.conteo_id = l.id AND cd.producto_id = i.producto_id)), 0)
    ) ORDER BY l.created_at DESC), '[]'::jsonb)
  ) INTO v_result
  FROM latest l
  LEFT JOIN profiles pr ON pr.id = l.realizado_por;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_reporte_ventas(
  p_desde DATE,
  p_hasta DATE,
  p_sucursal_id UUID DEFAULT NULL,
  p_vendedor_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  PERFORM public.altix_require_admin(auth.uid());
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'sales_period', COALESCE(sum(v.total), 0),
      'sales_count', count(v.id),
      'gross_profit', COALESCE(sum(v.total - COALESCE((SELECT sum(vc.cantidad * vc.costo_unitario) FROM venta_items vi JOIN venta_costos vc ON vc.venta_item_id = vi.id WHERE vi.venta_id = v.id), 0)), 0),
      'amount_pending', COALESCE(sum(CASE WHEN c.id IS NOT NULL THEN c.saldo_pendiente ELSE 0 END), 0),
      'amount_collected', COALESCE(sum(v.total - COALESCE(c.saldo_pendiente, 0)), 0),
      'orders', COALESCE((SELECT count(*) FROM pedidos p WHERE p.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR p.sucursal_id = p_sucursal_id) AND (p_vendedor_id IS NULL OR p.vendedor_id = p_vendedor_id)), 0),
      'quotes', COALESCE((SELECT count(*) FROM cotizaciones q WHERE q.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR q.sucursal_id = p_sucursal_id) AND (p_vendedor_id IS NULL OR q.vendedor_id = p_vendedor_id)), 0),
      'products_sold', COALESCE((SELECT sum(vi.cantidad) FROM venta_items vi JOIN ventas vf ON vf.id = vi.venta_id WHERE vf.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR vf.sucursal_id = p_sucursal_id) AND (p_vendedor_id IS NULL OR vf.vendedor_id = p_vendedor_id)), 0)
    ),
    'sales_over_time', COALESCE((SELECT jsonb_agg(x ORDER BY x.sales_day) FROM (SELECT v2.created_at::date AS sales_day, sum(v2.total) sales FROM ventas v2 WHERE v2.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v2.sucursal_id = p_sucursal_id) AND (p_vendedor_id IS NULL OR v2.vendedor_id = p_vendedor_id) GROUP BY 1) x), '[]'::jsonb),
    'cost_profit_over_time', COALESCE((WITH sales_daily AS (
      SELECT v2.created_at::date AS sales_day, sum(v2.total) AS sales
      FROM ventas v2
      WHERE v2.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v2.sucursal_id = p_sucursal_id) AND (p_vendedor_id IS NULL OR v2.vendedor_id = p_vendedor_id)
      GROUP BY v2.created_at::date
    ), cost_daily AS (
      SELECT v2.created_at::date AS sales_day, sum(vc.cantidad * vc.costo_unitario) AS cost
      FROM ventas v2 JOIN venta_items vi ON vi.venta_id = v2.id JOIN venta_costos vc ON vc.venta_item_id = vi.id
      WHERE v2.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v2.sucursal_id = p_sucursal_id) AND (p_vendedor_id IS NULL OR v2.vendedor_id = p_vendedor_id)
      GROUP BY v2.created_at::date
    ) SELECT jsonb_agg(jsonb_build_object('sales_day', s.sales_day, 'sales', s.sales, 'cost', COALESCE(c.cost, 0), 'gross_profit', s.sales - COALESCE(c.cost, 0)) ORDER BY s.sales_day) FROM sales_daily s LEFT JOIN cost_daily c USING (sales_day)), '[]'::jsonb),
    'sales_by_branch', COALESCE((SELECT jsonb_agg(x ORDER BY x.sales DESC) FROM (SELECT s.nombre branch, sum(v2.total) sales FROM ventas v2 JOIN sucursales s ON s.id = v2.sucursal_id WHERE v2.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v2.sucursal_id = p_sucursal_id) AND (p_vendedor_id IS NULL OR v2.vendedor_id = p_vendedor_id) GROUP BY s.nombre) x), '[]'::jsonb),
    'sales_by_seller', COALESCE((SELECT jsonb_agg(x ORDER BY x.sales DESC) FROM (SELECT pr.nombre_completo seller, sum(v2.total) sales FROM ventas v2 JOIN profiles pr ON pr.id = v2.vendedor_id WHERE v2.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v2.sucursal_id = p_sucursal_id) AND (p_vendedor_id IS NULL OR v2.vendedor_id = p_vendedor_id) GROUP BY pr.nombre_completo) x), '[]'::jsonb),
    'customer_type', COALESCE((SELECT jsonb_agg(x ORDER BY x.sales DESC) FROM (SELECT CASE WHEN cl.es_mayorista THEN 'mayorista' ELSE 'final' END customer_type, sum(v2.total) sales, count(*) sales_count FROM ventas v2 JOIN clientes cl ON cl.id = v2.cliente_id WHERE v2.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v2.sucursal_id = p_sucursal_id) AND (p_vendedor_id IS NULL OR v2.vendedor_id = p_vendedor_id) GROUP BY 1) x), '[]'::jsonb)
  ) INTO v_result
  FROM ventas v
  LEFT JOIN cuentas_cobrar c ON c.venta_id = v.id
  WHERE v.created_at::date BETWEEN p_desde AND p_hasta
    AND (p_sucursal_id IS NULL OR v.sucursal_id = p_sucursal_id)
    AND (p_vendedor_id IS NULL OR v.vendedor_id = p_vendedor_id);
  RETURN v_result;
END;
$$;
