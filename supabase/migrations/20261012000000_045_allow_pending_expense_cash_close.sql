-- 045: pending expenses do not block a cash-session close.
-- Only approved expenses have a movimientos_caja row and affect the ledger.
-- The 044 cash, authorization and denomination contracts remain unchanged.

CREATE OR REPLACE FUNCTION public.cerrar_caja(
  p_sesion_caja_id UUID,
  p_denominaciones JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sesion RECORD;
  v_input JSONB := COALESCE(p_denominaciones, '{}'::jsonb);
  v_counts JSONB;
  v_esperado NUMERIC(12,2);
  v_fisico NUMERIC(12,2);
  v_diferencia NUMERIC(12,2);
  v_actor UUID := auth.uid();
BEGIN
  SELECT * INTO v_sesion FROM public.sesiones_caja WHERE id = p_sesion_caja_id FOR UPDATE;
  IF NOT FOUND OR v_sesion.estado <> 'abierta' THEN
    RAISE EXCEPTION 'La sesión de caja no existe o ya está cerrada.';
  END IF;
  IF v_actor IS NULL OR (NOT public.altix_is_admin(v_actor) AND v_actor <> v_sesion.usuario_id) THEN
    RAISE EXCEPTION 'No estás autorizado para cerrar esta sesión de caja.';
  END IF;
  IF jsonb_typeof(v_input) <> 'object' THEN
    RAISE EXCEPTION 'El conteo de denominaciones no es válido.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_each_text(v_input) j
    WHERE j.key IN ('q200', 'q100', 'q50', 'q20', 'q10', 'q5')
      AND j.value <> ''
      AND j.value !~ '^[0-9]+$'
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_each_text(v_input) j
    WHERE j.key = 'monedas'
      AND j.value <> ''
      AND j.value !~ '^[0-9]+([.][0-9]+)?$'
  ) THEN
    RAISE EXCEPTION 'Las cantidades de efectivo deben ser números no negativos.';
  END IF;

  v_counts := jsonb_build_object(
    'q200', COALESCE(NULLIF(v_input->>'q200', '')::NUMERIC, 0),
    'q100', COALESCE(NULLIF(v_input->>'q100', '')::NUMERIC, 0),
    'q50', COALESCE(NULLIF(v_input->>'q50', '')::NUMERIC, 0),
    'q20', COALESCE(NULLIF(v_input->>'q20', '')::NUMERIC, 0),
    'q10', COALESCE(NULLIF(v_input->>'q10', '')::NUMERIC, 0),
    'q5', COALESCE(NULLIF(v_input->>'q5', '')::NUMERIC, 0),
    'monedas', COALESCE(NULLIF(v_input->>'monedas', '')::NUMERIC, 0)
  );
  v_fisico :=
    (v_counts->>'q200')::NUMERIC * 200
    + (v_counts->>'q100')::NUMERIC * 100
    + (v_counts->>'q50')::NUMERIC * 50
    + (v_counts->>'q20')::NUMERIC * 20
    + (v_counts->>'q10')::NUMERIC * 10
    + (v_counts->>'q5')::NUMERIC * 5
    + (v_counts->>'monedas')::NUMERIC;
  v_esperado := public.calcular_efectivo_esperado(p_sesion_caja_id);
  IF v_esperado IS NULL THEN RAISE EXCEPTION 'No se pudo calcular el efectivo esperado.'; END IF;
  v_diferencia := ROUND(v_fisico - v_esperado, 2);
  UPDATE public.sesiones_caja
  SET monto_cierre = v_fisico,
      monto_esperado = v_esperado,
      diferencia = v_diferencia,
      conteo_denominaciones = v_counts,
      cerrado_por = v_actor,
      fecha_cierre = now(),
      estado = 'cerrada'
  WHERE id = p_sesion_caja_id;
  RETURN jsonb_build_object('monto_fisico', v_fisico, 'monto_esperado', v_esperado, 'diferencia', v_diferencia);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cerrar_caja(UUID, JSONB) TO authenticated;
