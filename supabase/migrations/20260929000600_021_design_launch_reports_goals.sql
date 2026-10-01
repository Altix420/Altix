-- FULL V1: diseños, extras relacionados, lanzamientos opcionales, metas y agregados.

ALTER TABLE public.disenos
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS descripcion TEXT,
  ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS precio NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS archivo_id UUID REFERENCES public.archivos(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS disenos_sku_uidx ON public.disenos(sku) WHERE sku IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.diseno_extras (
  diseno_id UUID NOT NULL REFERENCES public.disenos(id) ON DELETE CASCADE,
  extra_id UUID NOT NULL REFERENCES public.extras(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (diseno_id, extra_id)
);

CREATE TABLE IF NOT EXISTS public.lanzamientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL CHECK (length(btrim(nombre)) > 0),
  descripcion TEXT,
  archivo_id UUID REFERENCES public.archivos(id) ON DELETE SET NULL,
  imagen_path TEXT,
  fecha_lanzamiento DATE,
  precio NUMERIC(12,2) CHECK (precio >= 0),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.lanzamiento_disenos (
  lanzamiento_id UUID NOT NULL REFERENCES public.lanzamientos(id) ON DELETE CASCADE,
  diseno_id UUID NOT NULL REFERENCES public.disenos(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (lanzamiento_id, diseno_id)
);
CREATE TABLE IF NOT EXISTS public.lanzamiento_extras (
  lanzamiento_id UUID NOT NULL REFERENCES public.lanzamientos(id) ON DELETE CASCADE,
  extra_id UUID NOT NULL REFERENCES public.extras(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (lanzamiento_id, extra_id)
);

CREATE TABLE IF NOT EXISTS public.metas_vendedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  objetivo_ventas NUMERIC(12,2) NOT NULL CHECK (objetivo_ventas >= 0),
  activa BOOLEAN NOT NULL DEFAULT true,
  creado_por UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (periodo_fin >= periodo_inicio)
);
CREATE INDEX IF NOT EXISTS idx_metas_vendedor_periodo ON public.metas_vendedor(vendedor_id, periodo_inicio, periodo_fin, activa);

-- Costos restringidos a Admin. El vendedor nunca consulta estas tablas.
CREATE TABLE IF NOT EXISTS public.productos_costos (
  producto_id UUID PRIMARY KEY REFERENCES public.productos(id) ON DELETE CASCADE,
  costo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
  actualizado_por UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.productos_costos(producto_id) SELECT id FROM public.productos ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.venta_costos (
  venta_item_id UUID PRIMARY KEY REFERENCES public.venta_items(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  cantidad NUMERIC(12,2) NOT NULL CHECK (cantidad > 0),
  costo_unitario NUMERIC(12,2) NOT NULL CHECK (costo_unitario >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diseno_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lanzamientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lanzamiento_disenos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lanzamiento_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_vendedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos_costos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_costos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura autenticada de diseno extras" ON public.diseno_extras;
CREATE POLICY "Lectura autenticada de diseno extras" ON public.diseno_extras FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin gestiona disenos" ON public.disenos;
CREATE POLICY "Admin gestiona disenos" ON public.disenos FOR ALL TO authenticated USING (public.altix_is_admin()) WITH CHECK (public.altix_is_admin());
DROP POLICY IF EXISTS "Admin gestiona extras" ON public.extras;
CREATE POLICY "Admin gestiona extras" ON public.extras FOR ALL TO authenticated USING (public.altix_is_admin()) WITH CHECK (public.altix_is_admin());
DROP POLICY IF EXISTS "Lectura autenticada de lanzamientos" ON public.lanzamientos;
CREATE POLICY "Lectura autenticada de lanzamientos" ON public.lanzamientos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin gestiona lanzamientos" ON public.lanzamientos;
CREATE POLICY "Admin gestiona lanzamientos" ON public.lanzamientos FOR ALL TO authenticated USING (public.altix_is_admin()) WITH CHECK (public.altix_is_admin());
DROP POLICY IF EXISTS "Lectura autenticada de lanzamiento disenos" ON public.lanzamiento_disenos;
CREATE POLICY "Lectura autenticada de lanzamiento disenos" ON public.lanzamiento_disenos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin gestiona lanzamiento disenos" ON public.lanzamiento_disenos;
CREATE POLICY "Admin gestiona lanzamiento disenos" ON public.lanzamiento_disenos FOR ALL TO authenticated USING (public.altix_is_admin()) WITH CHECK (public.altix_is_admin());
DROP POLICY IF EXISTS "Lectura autenticada de lanzamiento extras" ON public.lanzamiento_extras;
CREATE POLICY "Lectura autenticada de lanzamiento extras" ON public.lanzamiento_extras FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin gestiona lanzamiento extras" ON public.lanzamiento_extras;
CREATE POLICY "Admin gestiona lanzamiento extras" ON public.lanzamiento_extras FOR ALL TO authenticated USING (public.altix_is_admin()) WITH CHECK (public.altix_is_admin());
DROP POLICY IF EXISTS "Lectura de metas propias o admin" ON public.metas_vendedor;
CREATE POLICY "Lectura de metas propias o admin" ON public.metas_vendedor FOR SELECT TO authenticated USING (public.altix_is_admin() OR vendedor_id = auth.uid());
DROP POLICY IF EXISTS "Admin gestiona metas" ON public.metas_vendedor;
CREATE POLICY "Admin gestiona metas" ON public.metas_vendedor FOR ALL TO authenticated USING (public.altix_is_admin()) WITH CHECK (public.altix_is_admin());
DROP POLICY IF EXISTS "Admin lee costos de productos" ON public.productos_costos;
CREATE POLICY "Admin lee costos de productos" ON public.productos_costos FOR SELECT TO authenticated USING (public.altix_is_admin());
DROP POLICY IF EXISTS "Admin lee costos congelados" ON public.venta_costos;
CREATE POLICY "Admin lee costos congelados" ON public.venta_costos FOR SELECT TO authenticated USING (public.altix_is_admin());

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
  p_extra_ids JSONB DEFAULT '[]'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  PERFORM public.altix_require_admin(auth.uid());
  IF length(btrim(COALESCE(p_nombre, ''))) = 0 THEN RAISE EXCEPTION 'El nombre del diseño es obligatorio.'; END IF;
  IF p_precio IS NULL OR p_precio < 0 OR jsonb_typeof(p_extra_ids) <> 'array' THEN RAISE EXCEPTION 'Datos de diseño inválidos.'; END IF;
  IF p_diseno_id IS NULL THEN
    INSERT INTO public.disenos(sku,nombre,descripcion,categoria_id,cliente_id,archivo_url,archivo_id,precio,activo,observaciones)
    VALUES(NULLIF(btrim(p_sku),''),btrim(p_nombre),NULLIF(btrim(p_descripcion),''),p_categoria_id,p_cliente_id,p_archivo_url,p_archivo_id,p_precio,p_activo,NULLIF(btrim(p_observaciones),''))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.disenos SET sku=NULLIF(btrim(p_sku),''), nombre=btrim(p_nombre), descripcion=NULLIF(btrim(p_descripcion),''), categoria_id=p_categoria_id, cliente_id=p_cliente_id, archivo_url=p_archivo_url, archivo_id=p_archivo_id, precio=p_precio, activo=p_activo, observaciones=NULLIF(btrim(p_observaciones),'') WHERE id=p_diseno_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'El diseño no existe.'; END IF;
  END IF;
  DELETE FROM public.diseno_extras WHERE diseno_id=v_id;
  INSERT INTO public.diseno_extras(diseno_id,extra_id)
  SELECT v_id, value::UUID FROM jsonb_array_elements_text(p_extra_ids) WHERE EXISTS (SELECT 1 FROM public.extras e WHERE e.id=value::UUID);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.guardar_lanzamiento(
  p_lanzamiento_id UUID DEFAULT NULL,
  p_nombre TEXT DEFAULT NULL,
  p_descripcion TEXT DEFAULT NULL,
  p_fecha_lanzamiento DATE DEFAULT NULL,
  p_precio NUMERIC DEFAULT NULL,
  p_imagen_path TEXT DEFAULT NULL,
  p_archivo_id UUID DEFAULT NULL,
  p_diseno_ids JSONB DEFAULT '[]'::jsonb,
  p_extra_ids JSONB DEFAULT '[]'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  PERFORM public.altix_require_admin(auth.uid());
  IF length(btrim(COALESCE(p_nombre,'')))=0 OR jsonb_typeof(p_diseno_ids)<>'array' OR jsonb_typeof(p_extra_ids)<>'array' THEN RAISE EXCEPTION 'Datos de lanzamiento inválidos.'; END IF;
  IF p_lanzamiento_id IS NULL THEN
    INSERT INTO public.lanzamientos(nombre,descripcion,fecha_lanzamiento,precio,imagen_path,archivo_id,created_by) VALUES(btrim(p_nombre),NULLIF(btrim(p_descripcion),''),p_fecha_lanzamiento,p_precio,p_imagen_path,p_archivo_id,auth.uid()) RETURNING id INTO v_id;
  ELSE
    UPDATE public.lanzamientos SET nombre=btrim(p_nombre),descripcion=NULLIF(btrim(p_descripcion),''),fecha_lanzamiento=p_fecha_lanzamiento,precio=p_precio,imagen_path=p_imagen_path,archivo_id=p_archivo_id WHERE id=p_lanzamiento_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'El lanzamiento no existe.'; END IF;
  END IF;
  DELETE FROM public.lanzamiento_disenos WHERE lanzamiento_id=v_id;
  DELETE FROM public.lanzamiento_extras WHERE lanzamiento_id=v_id;
  INSERT INTO public.lanzamiento_disenos SELECT v_id,value::UUID FROM jsonb_array_elements_text(p_diseno_ids) WHERE EXISTS(SELECT 1 FROM public.disenos d WHERE d.id=value::UUID);
  INSERT INTO public.lanzamiento_extras SELECT v_id,value::UUID FROM jsonb_array_elements_text(p_extra_ids) WHERE EXISTS(SELECT 1 FROM public.extras e WHERE e.id=value::UUID);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.configurar_costo_producto(p_producto_id UUID,p_costo_unitario NUMERIC,p_admin_id UUID DEFAULT auth.uid()) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM public.altix_require_admin(p_admin_id);
  IF p_costo_unitario IS NULL OR p_costo_unitario < 0 THEN RAISE EXCEPTION 'El costo debe ser mayor o igual a cero.'; END IF;
  INSERT INTO public.productos_costos(producto_id,costo_unitario,actualizado_por,updated_at) VALUES(p_producto_id,p_costo_unitario,p_admin_id,now()) ON CONFLICT(producto_id) DO UPDATE SET costo_unitario=EXCLUDED.costo_unitario,actualizado_por=EXCLUDED.actualizado_por,updated_at=now();
END; $$;

CREATE OR REPLACE FUNCTION public.configurar_meta_vendedor(p_meta_id UUID DEFAULT NULL,p_vendedor_id UUID DEFAULT NULL,p_periodo_inicio DATE DEFAULT NULL,p_periodo_fin DATE DEFAULT NULL,p_objetivo_ventas NUMERIC DEFAULT NULL,p_activa BOOLEAN DEFAULT true,p_admin_id UUID DEFAULT auth.uid()) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id UUID;
BEGIN
  PERFORM public.altix_require_admin(p_admin_id);
  IF p_periodo_fin < p_periodo_inicio OR p_objetivo_ventas < 0 THEN RAISE EXCEPTION 'Periodo u objetivo inválido.'; END IF;
  IF p_meta_id IS NULL THEN INSERT INTO public.metas_vendedor(vendedor_id,periodo_inicio,periodo_fin,objetivo_ventas,activa,creado_por) VALUES(p_vendedor_id,p_periodo_inicio,p_periodo_fin,p_objetivo_ventas,p_activa,p_admin_id) RETURNING id INTO v_id;
  ELSE UPDATE public.metas_vendedor SET vendedor_id=p_vendedor_id,periodo_inicio=p_periodo_inicio,periodo_fin=p_periodo_fin,objetivo_ventas=p_objetivo_ventas,activa=p_activa WHERE id=p_meta_id RETURNING id INTO v_id; END IF;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.snapshot_venta_cost()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  INSERT INTO public.venta_costos(venta_item_id,producto_id,cantidad,costo_unitario)
  SELECT NEW.id,NEW.producto_id,NEW.cantidad,COALESCE(pc.costo_unitario,0) FROM public.productos_costos pc WHERE pc.producto_id=NEW.producto_id
  ON CONFLICT(venta_item_id) DO NOTHING;
  IF NOT FOUND THEN INSERT INTO public.venta_costos(venta_item_id,producto_id,cantidad,costo_unitario) VALUES(NEW.id,NEW.producto_id,NEW.cantidad,0) ON CONFLICT DO NOTHING; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_snapshot_venta_cost ON public.venta_items;
CREATE TRIGGER trg_snapshot_venta_cost AFTER INSERT ON public.venta_items FOR EACH ROW EXECUTE FUNCTION public.snapshot_venta_cost();

CREATE OR REPLACE FUNCTION public.obtener_dashboard_admin(p_desde DATE DEFAULT date_trunc('month',current_date)::date,p_hasta DATE DEFAULT current_date,p_sucursal_id UUID DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_result JSONB;
BEGIN
  PERFORM public.altix_require_admin(auth.uid());
  SELECT jsonb_build_object(
    'kpis',jsonb_build_object(
      'sales_period',COALESCE((SELECT sum(v.total) FROM ventas v WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id=p_sucursal_id)),0),
      'gross_profit',COALESCE((SELECT sum(v.total-COALESCE((SELECT sum(vc.cantidad*vc.costo_unitario) FROM venta_items vi JOIN venta_costos vc ON vc.venta_item_id=vi.id WHERE vi.venta_id=v.id),0)) FROM ventas v WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id=p_sucursal_id)),0),
      'pending_credit',COALESCE((SELECT sum(c.saldo_pendiente) FROM cuentas_cobrar c LEFT JOIN ventas v ON v.id=c.venta_id LEFT JOIN pedidos p ON p.id=c.pedido_id WHERE c.saldo_pendiente>0 AND (p_sucursal_id IS NULL OR COALESCE(v.sucursal_id,p.sucursal_id)=p_sucursal_id)),0),
      'overdue_credit',COALESCE((SELECT sum(c.saldo_pendiente) FROM cuentas_cobrar c LEFT JOIN ventas v ON v.id=c.venta_id LEFT JOIN pedidos p ON p.id=c.pedido_id WHERE c.saldo_pendiente>0 AND c.fecha_vencimiento<current_date AND (p_sucursal_id IS NULL OR COALESCE(v.sucursal_id,p.sucursal_id)=p_sucursal_id)),0),
      'due_soon_credit',COALESCE((SELECT sum(c.saldo_pendiente) FROM cuentas_cobrar c LEFT JOIN ventas v ON v.id=c.venta_id LEFT JOIN pedidos p ON p.id=c.pedido_id WHERE c.saldo_pendiente>0 AND c.fecha_vencimiento BETWEEN current_date AND current_date+7 AND (p_sucursal_id IS NULL OR COALESCE(v.sucursal_id,p.sucursal_id)=p_sucursal_id)),0),
      'commissions',COALESCE((SELECT sum(co.monto_comision) FROM comisiones co JOIN ventas v ON v.id=co.venta_id WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id=p_sucursal_id)),0),
      'low_stock',COALESCE((SELECT count(*) FROM inventarios i WHERE i.stock<=i.stock_minimo AND (p_sucursal_id IS NULL OR i.sucursal_id=p_sucursal_id)),0),
      'pending_approvals',COALESCE((SELECT count(*) FROM aprobaciones a WHERE a.estado='pendiente' AND (p_sucursal_id IS NULL OR a.sucursal_id=p_sucursal_id)),0),
      'orders',COALESCE((SELECT count(*) FROM pedidos p WHERE p.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR p.sucursal_id=p_sucursal_id)),0),
      'quotes',COALESCE((SELECT count(*) FROM cotizaciones q WHERE q.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR q.sucursal_id=p_sucursal_id)),0)
    ),
    'sales_over_time',COALESCE((SELECT jsonb_agg(x ORDER BY x.sales_day) FROM (SELECT v.created_at::date AS sales_day,sum(v.total) sales FROM ventas v WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id=p_sucursal_id) GROUP BY 1) x),'[]'::jsonb),
    'sales_by_branch',COALESCE((SELECT jsonb_agg(x ORDER BY x.sales DESC) FROM (SELECT s.nombre branch,sum(v.total) sales FROM ventas v JOIN sucursales s ON s.id=v.sucursal_id WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id=p_sucursal_id) GROUP BY s.nombre) x),'[]'::jsonb),
    'sales_by_seller',COALESCE((SELECT jsonb_agg(x ORDER BY x.sales DESC) FROM (SELECT pr.nombre_completo seller,sum(v.total) sales FROM ventas v JOIN profiles pr ON pr.id=v.vendedor_id WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id=p_sucursal_id) GROUP BY pr.nombre_completo) x),'[]'::jsonb),
    'customer_type',COALESCE((SELECT jsonb_agg(x ORDER BY x.sales DESC) FROM (SELECT CASE WHEN c.es_mayorista THEN 'mayorista' ELSE 'final' END customer_type,sum(v.total) sales,count(*) sales_count FROM ventas v JOIN clientes c ON c.id=v.cliente_id WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id=p_sucursal_id) GROUP BY 1) x),'[]'::jsonb),
    'products_sold',COALESCE((SELECT sum(vi.cantidad) FROM venta_items vi JOIN ventas v ON v.id=vi.venta_id WHERE v.created_at::date BETWEEN p_desde AND p_hasta AND (p_sucursal_id IS NULL OR v.sucursal_id=p_sucursal_id)),0)
  ) INTO v_result;
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.obtener_reporte_ventas(p_desde DATE,p_hasta DATE,p_sucursal_id UUID DEFAULT NULL,p_vendedor_id UUID DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM public.altix_require_admin(auth.uid());
  RETURN public.obtener_dashboard_admin(p_desde,p_hasta,p_sucursal_id) || jsonb_build_object('seller_filter',p_vendedor_id);
END; $$;

CREATE OR REPLACE FUNCTION public.obtener_reporte_inventario_mensual(p_mes DATE,p_sucursal_id UUID DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_result JSONB;
BEGIN
  PERFORM public.altix_require_admin(auth.uid());
  SELECT jsonb_build_object('status',CASE WHEN count(c.id)=0 THEN 'pendiente' ELSE 'ok' END,'counts',COALESCE(jsonb_agg(jsonb_build_object('sucursal_id',c.sucursal_id,'estado',c.estado,'fecha',c.created_at,'responsable',pr.nombre_completo,'productos',COALESCE((SELECT count(*) FROM conteos_detalle cd WHERE cd.conteo_id=c.id),0))),'[]'::jsonb)) INTO v_result
  FROM conteos c LEFT JOIN profiles pr ON pr.id=c.realizado_por
  WHERE c.created_at::date BETWEEN date_trunc('month',p_mes)::date AND (date_trunc('month',p_mes)+interval '1 month-1 day')::date AND (p_sucursal_id IS NULL OR c.sucursal_id=p_sucursal_id) AND c.estado='finalizado';
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.obtener_dashboard_vendedor(p_vendedor_id UUID DEFAULT auth.uid()) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_result JSONB;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_vendedor_id OR public.altix_role(p_vendedor_id)<>'vendedor' THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  SELECT jsonb_build_object(
    'sales_today',COALESCE((SELECT sum(total) FROM ventas WHERE vendedor_id=p_vendedor_id AND created_at::date=current_date),0),
    'sales_month',COALESCE((SELECT sum(total) FROM ventas WHERE vendedor_id=p_vendedor_id AND created_at::date BETWEEN date_trunc('month',current_date)::date AND current_date),0),
    'commission_month',COALESCE((SELECT sum(monto_comision) FROM comisiones WHERE vendedor_id=p_vendedor_id AND periodo=to_char(current_date,'YYYY-MM')),0),
    'quotes',COALESCE((SELECT count(*) FROM cotizaciones WHERE vendedor_id=p_vendedor_id),0),
    'orders',COALESCE((SELECT count(*) FROM pedidos WHERE vendedor_id=p_vendedor_id),0),
    'clients',COALESCE((SELECT count(DISTINCT cliente_id) FROM ventas WHERE vendedor_id=p_vendedor_id),0),
    'wholesale_clients',COALESCE((SELECT count(DISTINCT v.cliente_id) FROM ventas v JOIN clientes c ON c.id=v.cliente_id WHERE v.vendedor_id=p_vendedor_id AND c.es_mayorista),0),
    'goal',COALESCE((SELECT jsonb_build_object('id',m.id,'objetivo',m.objetivo_ventas,'inicio',m.periodo_inicio,'fin',m.periodo_fin,'progreso',COALESCE((SELECT sum(v.total) FROM ventas v WHERE v.vendedor_id=p_vendedor_id AND v.created_at::date BETWEEN m.periodo_inicio AND m.periodo_fin),0)) FROM metas_vendedor m WHERE m.vendedor_id=p_vendedor_id AND m.activa AND current_date BETWEEN m.periodo_inicio AND m.periodo_fin ORDER BY m.created_at DESC LIMIT 1),'null'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END; $$;
