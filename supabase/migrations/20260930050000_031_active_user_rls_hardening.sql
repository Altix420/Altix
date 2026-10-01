-- Production hardening: inactive profiles must not operate through direct table access.
-- Sensitive mutations remain behind the existing SECURITY DEFINER RPC contracts.

CREATE OR REPLACE FUNCTION public.altix_is_active_user(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND activo = true
  );
$$;

DROP POLICY IF EXISTS "Permitir lectura a usuarios autenticados" ON public.profiles;
CREATE POLICY "Lectura de perfiles por usuario activo o admin"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user() AND (id = auth.uid() OR public.altix_is_admin()));

DROP POLICY IF EXISTS "Permitir lectura de sucursales" ON public.sucursales;
CREATE POLICY "Lectura de sucursales por usuario activo"
  ON public.sucursales
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user());

DROP POLICY IF EXISTS "Permitir lectura de asignaciones propias o admin" ON public.usuario_sucursal;
DROP POLICY IF EXISTS "Permitir lectura de asignaciones de sucursal" ON public.usuario_sucursal;
CREATE POLICY "Lectura de asignaciones por usuario activo"
  ON public.usuario_sucursal
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user() AND (user_id = auth.uid() OR public.altix_is_admin()));

DROP POLICY IF EXISTS "Permitir lectura de clientes" ON public.clientes;
CREATE POLICY "Lectura de clientes por usuario activo"
  ON public.clientes
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user());

DROP POLICY IF EXISTS "Permitir insercion de clientes" ON public.clientes;
CREATE POLICY "Insercion de clientes por usuario activo"
  ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (public.altix_is_active_user());

DROP POLICY IF EXISTS "Permitir lectura de categorias" ON public.categorias;
CREATE POLICY "Lectura de categorias por usuario activo"
  ON public.categorias
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user());

DROP POLICY IF EXISTS "Permitir lectura de productos" ON public.productos;
CREATE POLICY "Lectura de productos por usuario activo"
  ON public.productos
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user());

DROP POLICY IF EXISTS "Lectura autenticada de disenos" ON public.disenos;
CREATE POLICY "Lectura de disenos por usuario activo"
  ON public.disenos
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user());

DROP POLICY IF EXISTS "Lectura autenticada de extras" ON public.extras;
CREATE POLICY "Lectura de extras por usuario activo"
  ON public.extras
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user());

DROP POLICY IF EXISTS "Lectura autenticada de reglas de comision" ON public.reglas_comision;
CREATE POLICY "Lectura de reglas de comision por usuario activo"
  ON public.reglas_comision
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user());

DROP POLICY IF EXISTS "Lectura autenticada de reglas de descuento" ON public.reglas_descuento;
CREATE POLICY "Lectura de reglas de descuento por usuario activo"
  ON public.reglas_descuento
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user());

DROP POLICY IF EXISTS "Lectura autenticada de archivos" ON public.archivos;
CREATE POLICY "Lectura de archivos por usuario activo"
  ON public.archivos
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user());

DROP POLICY IF EXISTS "Lectura autenticada de diseno extras" ON public.diseno_extras;
CREATE POLICY "Lectura de relaciones de diseno por usuario activo"
  ON public.diseno_extras
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user());

DROP POLICY IF EXISTS "Lectura autenticada de lanzamientos" ON public.lanzamientos;
CREATE POLICY "Lectura de lanzamientos por usuario activo"
  ON public.lanzamientos
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user());

DROP POLICY IF EXISTS "Lectura autenticada de lanzamiento disenos" ON public.lanzamiento_disenos;
CREATE POLICY "Lectura de relaciones de lanzamiento por usuario activo"
  ON public.lanzamiento_disenos
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user());

DROP POLICY IF EXISTS "Lectura autenticada de lanzamiento extras" ON public.lanzamiento_extras;
CREATE POLICY "Lectura de extras de lanzamiento por usuario activo"
  ON public.lanzamiento_extras
  FOR SELECT TO authenticated
  USING (public.altix_is_active_user());
