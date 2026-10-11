# Antigravity Handoff

## Punto de partida

- Branch: `ui/antigravity-redesign`
- Rollback oficial: `pre-visual-redesign`
- Baseline funcional: `683e5b09c9719f933a36560ec635aaf4fed491e4`

## Puede tocar

Revisar `ANTIGRAVITY_SAFE_FILES.md`. Priorizar `src/index.css`, tokens,
componentes puramente presentacionales y clases visuales.

## No puede tocar

Revisar `DO_NOT_TOUCH.md` y `ANTIGRAVITY_RULES.md`. No modificar lógica,
Supabase, Auth, PWA, servicios, queries, handlers, rutas ni contratos.

## Validación final

```bash
npx tsc --noEmit
npm run lint
npm run build
npm audit
git diff --check
```

Antes de entregar, revisar `git diff --name-only` y confirmar que los archivos
funcionales prohibidos no fueron modificados.

No hacer merge a `main` ni desplegar el rediseño sin revisión posterior.
