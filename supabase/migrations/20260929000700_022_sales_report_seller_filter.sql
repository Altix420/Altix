-- Reporte de ventas con filtro de vendedor aplicado en PostgreSQL.

CREATE OR REPLACE FUNCTION public.obtener_reporte_ventas(p_desde DATE,p_hasta DATE,p_sucursal_id UUID DEFAULT NULL,p_vendedor_id UUID DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_result JSONB;
BEGIN
  PERFORM public.altix_require_admin(auth.uid());
  SELECT jsonb_build_object(
    'kpis',jsonb_build_object(
      'sales_period',COALESCE(sum(v.total),0),
      'sales_count',count(v.id),
      'amount_pending',COALESCE(sum(CASE WHEN c.id IS NOT NULL THEN c.saldo_pendiente ELSE 0 END),0),
      'amount_collected',COALESCE(sum(v.total-COALESCE(c.saldo_pendiente,0)),0),
      'products_sold',COALESCE((SELECT sum(vi.cantidad) FROM venta_items vi JOIN ventas vf ON vf.id=vi.venta_id WHERE vf.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR vf.sucursal_id=p_sucursal_id) AND (p_vendedor_id IS NULL OR vf.vendedor_id=p_vendedor_id)),0)
    ),
    'sales_over_time',COALESCE((SELECT jsonb_agg(x ORDER BY x.sales_day) FROM (SELECT v2.created_at::date AS sales_day,sum(v2.total) sales FROM ventas v2 WHERE v2.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v2.sucursal_id=p_sucursal_id) AND (p_vendedor_id IS NULL OR v2.vendedor_id=p_vendedor_id) GROUP BY 1) x),'[]'::jsonb),
    'sales_by_branch',COALESCE((SELECT jsonb_agg(x ORDER BY x.sales DESC) FROM (SELECT s.nombre branch,sum(v2.total) sales FROM ventas v2 JOIN sucursales s ON s.id=v2.sucursal_id WHERE v2.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v2.sucursal_id=p_sucursal_id) AND (p_vendedor_id IS NULL OR v2.vendedor_id=p_vendedor_id) GROUP BY s.nombre) x),'[]'::jsonb),
    'sales_by_seller',COALESCE((SELECT jsonb_agg(x ORDER BY x.sales DESC) FROM (SELECT pr.nombre_completo seller,sum(v2.total) sales FROM ventas v2 JOIN profiles pr ON pr.id=v2.vendedor_id WHERE v2.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v2.sucursal_id=p_sucursal_id) AND (p_vendedor_id IS NULL OR v2.vendedor_id=p_vendedor_id) GROUP BY pr.nombre_completo) x),'[]'::jsonb),
    'customer_type',COALESCE((SELECT jsonb_agg(x ORDER BY x.sales DESC) FROM (SELECT CASE WHEN cl.es_mayorista THEN 'mayorista' ELSE 'final' END customer_type,sum(v2.total) sales,count(*) sales_count FROM ventas v2 JOIN clientes cl ON cl.id=v2.cliente_id WHERE v2.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v2.sucursal_id=p_sucursal_id) AND (p_vendedor_id IS NULL OR v2.vendedor_id=p_vendedor_id) GROUP BY 1) x),'[]'::jsonb)
  ) INTO v_result
  FROM ventas v LEFT JOIN cuentas_cobrar c ON c.venta_id=v.id
  WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id=p_sucursal_id) AND (p_vendedor_id IS NULL OR v.vendedor_id=p_vendedor_id);
  RETURN v_result;
END; $$;
