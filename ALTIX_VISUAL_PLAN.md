# ALTIX Visual Plan

## 1. Design system

Centralizar tokens de color, superficie, borde, radio, sombra, spacing y
tipografía en `src/index.css`. Mantener la semántica actual de azul, éxito,
advertencia y error.

## 2. App shell y navegación

Normalizar sidebar, header, breadcrumbs existentes, bottom navigation y menú
Más. Solo estilos y composición; no rutas ni condiciones de acceso.

## 3. Componentes comunes

Evaluar primitivas visuales para Button, Card, Badge, PageHeader,
SectionHeader, EmptyState, LoadingState, ErrorState, KpiCard y wrapper de
tabla. Extraer solo markup/clases; no mover handlers, estados ni queries.

## 4. Admin

Aplicar jerarquía, densidad, tablas, formularios, modales y estados a los
módulos existentes sin cambiar columnas, acciones ni payloads.

## 5. Vendor

Aplicar el mismo lenguaje visual al dashboard, POS, cotizaciones, pedidos,
clientes, catálogo, inventario, comisiones y estado sin sucursal.

## 6. Mobile/responsive

Revisar 360/390/430 px, tablet y desktop; corregir solo layout, overflow,
safe-area y legibilidad.

## 7. Regresión

Revisar diff, ejecutar TypeScript, lint, build, audit y `git diff --check`.

## Seguro vs no permitido

Seguro: clases, tokens, markup presentacional, spacing, colores, responsive y
estados visuales.

No permitido: cualquier cambio que requiera lógica, backend, Auth, queries,
RPC, permisos, rutas, cálculos o contratos.
