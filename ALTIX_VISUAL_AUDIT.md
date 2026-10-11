# ALTIX Visual Audit

Estado: auditoría de referencia antes de cambios de pantalla. No se cambió
comportamiento.

## Hallazgos transversales

- La base usa Inter/system, Tailwind y CSS global con tokens parciales.
- La paleta actual es clara, con azul como acción principal y gris cálido de
  fondo; debe conservarse semánticamente durante la primera iteración.
- Existen patrones repetidos de cards, botones, tablas, formularios y estados,
  pero no todos usan las mismas clases visuales.
- Los bordes y radios son consistentes en las primitivas `altix-*`, mientras
  que varias pantallas aún usan utilidades Tailwind directamente.
- Los estados de carga, error y vacío aparecen como texto o superficies
  simples; pueden unificarse visualmente sin cambiar sus condiciones.

## Admin

- Login: composición centrada y compacta; mejorar jerarquía, foco y feedback.
- Dashboard: KPIs y contenedores requieren escala tipográfica y ritmo común.
- Catálogo, Productos y Diseños: priorizar densidad, filtros, cards e imágenes.
- Inventario, Ventas, Cotizaciones y Pedidos: tablas necesitan encabezados,
  estados y overflow móvil consistentes.
- Clientes y Mayoristas: formularios y tablas pueden compartir agrupación
  visual.
- Gastos, Aprobaciones y Caja: distinguir mejor estados, importes y acciones;
  no alterar reglas ni botones existentes.
- Comisiones, Reportes y Auditoría: mejorar lectura de métricas, tablas y
  estados vacíos.

## Vendor

- Dashboard: jerarquía de KPI, meta y acciones principales.
- Venta y Cotizaciones: formularios largos necesitan agrupación y responsive
  más claro sin cambiar campos ni payloads.
- Pedidos, Clientes, Catálogo, Inventario y Comisiones: unificar cards,
  tablas, badges y empty states.
- Más y navegación móvil: conservar rutas y acciones; mejorar separación,
  safe area, activo/inactivo y legibilidad.
- Estado “sin sucursal”: mantenerlo como pantalla estable con logout visible.

## Responsive

- Validar 360, 390 y 430 px, tablet y desktop.
- Revisar overflow horizontal de tablas y formularios.
- Mantener acciones críticas accesibles; no ocultarlas por estética.

## Estados

- Definir una familia visual para loading, error, vacío, éxito y disabled.
- Mantener exactamente las condiciones, textos de negocio y callbacks actuales.
