-- R2 metadata and signed URL hardening.
-- Binary objects stay outside PostgreSQL; only controlled metadata is persisted.

DROP POLICY IF EXISTS "Insercion autenticada de archivos" ON public.archivos;
CREATE POLICY "Solo Admin registra archivos" ON public.archivos
  FOR INSERT TO authenticated
  WITH CHECK (public.altix_is_admin() AND created_by = auth.uid());

CREATE OR REPLACE FUNCTION public.registrar_archivo(
  p_path TEXT,
  p_nombre_original TEXT,
  p_mime_type TEXT,
  p_size_bytes BIGINT,
  p_bucket TEXT DEFAULT 'altix-dev'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM public.altix_require_admin(auth.uid());

  IF p_bucket NOT IN ('altix-dev', 'altix-prod') THEN
    RAISE EXCEPTION 'Bucket no autorizado.';
  END IF;
  IF p_path IS NULL OR p_path !~ '^(disenos|lanzamientos|exports|auditoria|backups)/[A-Za-z0-9][A-Za-z0-9/_ .-]*$' OR p_path LIKE '%..%' THEN
    RAISE EXCEPTION 'Path de archivo invalido.';
  END IF;
  IF NULLIF(btrim(COALESCE(p_nombre_original, '')), '') IS NULL THEN
    RAISE EXCEPTION 'El nombre original es obligatorio.';
  END IF;
  IF lower(COALESCE(p_mime_type, '')) NOT IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv') THEN
    RAISE EXCEPTION 'Tipo de archivo no permitido.';
  END IF;
  IF p_size_bytes IS NULL OR p_size_bytes <= 0 OR p_size_bytes > 10485760 THEN
    RAISE EXCEPTION 'El tamaño del archivo no es valido.';
  END IF;

  INSERT INTO public.archivos (
    path, nombre_original, mime_type, size_bytes, bucket, created_by
  ) VALUES (
    p_path, btrim(p_nombre_original), lower(p_mime_type), p_size_bytes, p_bucket, auth.uid()
  )
  ON CONFLICT (path) DO UPDATE SET
    nombre_original = EXCLUDED.nombre_original,
    mime_type = EXCLUDED.mime_type,
    size_bytes = EXCLUDED.size_bytes,
    bucket = EXCLUDED.bucket,
    created_by = EXCLUDED.created_by
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
