# ALTIX POS / Caja: Análisis De Raíz

Fecha: 2026-10-11

## Síntoma

El Vendor con sucursal asignada recibe `No se puede cargar el punto de venta` y no puede continuar con la operación de caja.

## Causa comprobada en código

`src/vendor/VendorPages.tsx` cargaba productos, inventario y clientes dentro de un único `Promise.all`. Una falla aislada en cualquiera de esas lecturas activaba el error global del POS, aunque la caja y las otras consultas pudieran funcionar. Una respuesta válida con cero filas no es un error.

## Corrección aplicada

La carga ahora procesa cada resultado por separado:

- catálogo: mantiene un estado independiente;
- inventario: si falla, el catálogo puede mostrarse con stock cero y se informa el problema específico;
- clientes: una respuesta vacía es válida y una falla no oculta caja;
- caja: continúa siendo una consulta independiente;
- `abrir_caja` conserva su RPC, parámetros y validaciones sin cambios.

No se creó migración 046 y no se modificó SQL, RLS, Auth, servicios ni contratos backend.

## Reproducción local

Con la base local reiniciada y el usuario Vendor seed:

- profile: PASS
- asignación de sucursal: PASS
- catálogo: PASS
- inventario: PASS
- clientes: PASS
- caja abierta previa: 0 filas, correctamente tratado como estado cerrado
- `abrir_caja`: PASS

La prueba PROD del usuario afectado aún es necesaria para identificar cuál lectura concreta devuelve el error remoto.

## Estado

Corrección de resiliencia frontend: FIXED localmente.  
Confirmación de causa exacta PROD y prueba con nueva sucursal: PENDING.  
No se ejecutó ninguna operación destructiva ni se creó una migración.
