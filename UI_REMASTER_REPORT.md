# ALTIX UI Remaster Report

## Alcance

- Se conservó la lógica de negocio, rutas, servicios y acciones existentes.
- El dashboard administrativo ahora muestra gráficas reales de ventas por sucursal, vendedor, día, tipo de cliente y ventas/costo/utilidad.
- Se mejoró la jerarquía visual de KPIs, paneles, filtros, botones, formularios y estados de foco.
- Se mantuvieron las descargas CSV y los filtros conectados al backend.

## Móvil y navegación

- La navegación administrativa móvil pasó a una barra inferior fija con acceso a Dashboard, Ventas, Inventario, Clientes y un menú de módulos secundarios.
- Se respetó el área segura inferior y se añadió espacio para evitar que contenido o controles queden debajo de la barra del navegador o de overlays externos.
- La navegación móvil del vendedor conserva su flujo y recibió el mismo tratamiento de espacio seguro.
- Las gráficas permiten desplazamiento horizontal interno únicamente cuando la cantidad de categorías lo requiere; no fuerzan scroll horizontal de la página.

## Netlify

El badge/HUD de Netlify es inyectado externamente por la plataforma y no pertenece a la aplicación. No se ocultó desde CSS ni se alteró la integración; la interfaz se adaptó con espacio inferior y capas visuales seguras.

## Diagnóstico de gráficas vacías

Era un bug real del backend, no un estado esperado de la interfaz. La migración 035 redefinía `obtener_dashboard_admin` y devolvía todas las series como `[]`, aunque sus KPIs sí tenían valores. La migración 038 conserva el cálculo financiero de 035, incluyendo devoluciones y comisiones, y completa las series usando los mismos filtros de fecha y sucursal.

## Validación

- TypeScript: PASS (`npx tsc --noEmit`)
- Lint: PASS (`npm run lint`)
- Build: PASS (`npm run build`)
- `git diff --check`: PASS
- Reset/lint de base local: pendiente de ejecutar porque Docker no estaba iniciado en el entorno de trabajo.
- Migración remota 038: aplicada y confirmada en Supabase PROD.

## Estado de despliegue

- Implementado localmente: sí.
- Publicado en GitHub/Netlify: pendiente de commit y push de esta pasada.
- Verificado en producción: pendiente.

## URL

Producción existente: https://altixv1.netlify.app/
