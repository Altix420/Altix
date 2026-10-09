-- Limpieza PROD ALTIX previa a operación.
-- Este archivo es deliberadamente bloqueante: no contiene IDs aprobados y no
-- ejecuta borrados hasta que se rellene una lista explícita de candidatos.
-- Ejecutar solo con revisión humana y una copia cifrada post-042 verificada.

BEGIN;

CREATE TEMP TABLE cleanup_candidates (
  user_id UUID PRIMARY KEY,
  approved_marker TEXT NOT NULL
) ON COMMIT DROP;

-- INSERT INTO cleanup_candidates(user_id, approved_marker)
-- VALUES ('UUID-VERIFICADO', 'TEST-USER-EXACTO');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cleanup_candidates) THEN
    RAISE EXCEPTION 'Limpieza bloqueada: no hay candidatos explícitos aprobados.';
  END IF;
END;
$$;

-- La lista anterior debe ampliarse con referencias comprobadas antes de borrar.
-- Nunca usar DELETE genérico por fecha, nombre, rol o texto.
SELECT 'profiles' AS tabla, count(*) AS candidatos
FROM public.profiles p JOIN cleanup_candidates c ON c.user_id = p.id;
SELECT 'usuario_sucursal' AS tabla, count(*) AS candidatos
FROM public.usuario_sucursal us JOIN cleanup_candidates c ON c.user_id = us.user_id;

-- El bloque de borrado se mantiene explícito y debe cubrir primero referencias
-- dependientes, con conteos revisados, antes del usuario Auth.
ROLLBACK;
