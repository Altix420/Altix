-- An inactive profile must lose branch access and own-record reads immediately.

CREATE OR REPLACE FUNCTION public.altix_can_access_branch(
  p_sucursal_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.altix_is_active_user(p_user_id)
    AND (
      public.altix_is_admin(p_user_id)
      OR EXISTS (
        SELECT 1
        FROM public.usuario_sucursal
        WHERE user_id = p_user_id
          AND sucursal_id = p_sucursal_id
      )
    );
$$;

DROP POLICY IF EXISTS "Lectura de aprobaciones propias o admin" ON public.aprobaciones;
CREATE POLICY "Lectura de aprobaciones propias o admin"
  ON public.aprobaciones
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user() AND (public.altix_is_admin() OR solicitante_id = auth.uid()));

DROP POLICY IF EXISTS "Lectura de comisiones propias o admin" ON public.comisiones;
CREATE POLICY "Lectura de comisiones propias o admin"
  ON public.comisiones
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user() AND (vendedor_id = auth.uid() OR public.altix_is_admin()));

DROP POLICY IF EXISTS "Lectura de metas propias o admin" ON public.metas_vendedor;
CREATE POLICY "Lectura de metas propias o admin"
  ON public.metas_vendedor
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user() AND (public.altix_is_admin() OR vendedor_id = auth.uid()));

DROP POLICY IF EXISTS "Lectura de cuentas por vendedor o admin" ON public.cuentas_cobrar;
CREATE POLICY "Lectura de cuentas por vendedor o admin"
  ON public.cuentas_cobrar
  FOR SELECT TO authenticated
  USING (
    public.altix_is_active_user()
    AND (
      public.altix_is_admin()
      OR EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = venta_id AND v.vendedor_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND p.vendedor_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Lectura de pagos de credito por vendedor o admin" ON public.pagos_credito;
CREATE POLICY "Lectura de pagos de credito por vendedor o admin"
  ON public.pagos_credito
  FOR SELECT TO authenticated
  USING (
    public.altix_is_active_user()
    AND (
      public.altix_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.cuentas_cobrar c
        LEFT JOIN public.ventas v ON v.id = c.venta_id
        LEFT JOIN public.pedidos p ON p.id = c.pedido_id
        WHERE c.id = cuenta_cobrar_id
          AND (v.vendedor_id = auth.uid() OR p.vendedor_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Vendedor cancela cotizacion rechazada" ON public.cotizaciones;
CREATE POLICY "Vendedor cancela cotizacion rechazada"
  ON public.cotizaciones
  FOR UPDATE TO authenticated
  USING (
    public.altix_is_active_user()
    AND vendedor_id = auth.uid()
    AND estado = 'enviada'
    AND EXISTS (
      SELECT 1
      FROM public.aprobaciones a
      WHERE a.tipo = 'descuento'
        AND a.referencia_tabla = 'cotizaciones'
        AND a.referencia_id = cotizaciones.id
        AND a.estado = 'rechazada'
    )
  )
  WITH CHECK (public.altix_is_active_user() AND vendedor_id = auth.uid() AND estado = 'cancelada');
