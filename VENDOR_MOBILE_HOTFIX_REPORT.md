# ALTIX Vendor Mobile Hotfix

## Cambios aplicados

- Inicio Vendor: KPIs compactos en dos columnas móviles, header reducido y botón Actualizar con estado de carga.
- Catálogo e inventario: tarjetas móviles más densas, imágenes de 64–80 px, nombre/SKU/stock y acciones conservadas.
- POS: selección de producto, carrito, total y Confirmar venta con jerarquía visual consistente.
- Layout Vendor: bottom navigation con tap targets de 44 px, safe-area, estado activo por rutas anidadas y padding inferior.
- Más: bottom sheet con Cotizaciones, Clientes, Inventario, Crédito, Comisiones, Gastos y Solicitudes; cierre por botón, overlay o Escape.
- Botones y estados: estilos primario/secundario, hover, pressed, focus-visible y disabled sin cambiar acciones.

## Badge de Netlify

El badge “Powered by Netlify” se inyecta en un frame aislado por Netlify y no debe ocultarse con CSS de la aplicación. No hay sesión autenticada de Netlify disponible desde este entorno. Para desactivarlo manualmente: **Netlify → Project configuration → General → Powered by Netlify badge → OFF**.

## Validación

- TypeScript: PASS
- Lint: PASS
- Build: PASS
- `git diff --check`: PASS
- Netlify PROD: HTTP 200 y bundle público verificado con el hotfix (`altix-vendor-primary`, `Más opciones`).
- Commit: `3a33ddd fix: polish vendor mobile experience`
- URL: https://altixv1.netlify.app/

La validación autenticada de las vistas a 360×800, 390×844 y 430×932 requiere una sesión Vendor válida; la ruta local quedó en estado de carga al no existir una sesión autenticada en el navegador de prueba.
