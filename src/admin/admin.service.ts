import { supabase } from "../shared/lib/supabase";
import type { Database, Json } from "../shared/types/database.types";

type FunctionArgs<Name extends keyof Database["public"]["Functions"]> =
  Database["public"]["Functions"][Name]["Args"];

const call = async <Name extends keyof Database["public"]["Functions"]>(
  name: Name,
  args: FunctionArgs<Name>,
) => {
  const { data, error } = await supabase.rpc(name, args as never);
  if (error) throw new Error(error.message);
  return data;
};

export const adminService = {
  abrirCaja: (args: FunctionArgs<"abrir_caja">) => call("abrir_caja", args),
  cerrarCaja: (args: FunctionArgs<"cerrar_caja">) => call("cerrar_caja", args),
  registrarGasto: (args: FunctionArgs<"registrar_gasto">) => call("registrar_gasto", args),
  registrarMovimientoCaja: (args: FunctionArgs<"registrar_movimiento_caja">) =>
    call("registrar_movimiento_caja", args),
  registrarPago: (args: FunctionArgs<"registrar_pago">) => call("registrar_pago", args),
  configurarCredito: (args: FunctionArgs<"configurar_credito_cliente">) =>
    call("configurar_credito_cliente", args),
  marcarVentaEntregada: (args: FunctionArgs<"marcar_venta_entregada">) =>
    call("marcar_venta_entregada", args),
  convertirCotizacion: (args: FunctionArgs<"convertir_cotizacion_pedido">) =>
    call("convertir_cotizacion_pedido", args),
  registrarAnticipo: (args: FunctionArgs<"registrar_anticipo_v1">) =>
    call("registrar_anticipo_v1", args),
  marcarEntrega: (args: FunctionArgs<"marcar_pedido_entregado">) =>
    call("marcar_pedido_entregado", args),
  registrarPedidoVenta: (args: FunctionArgs<"registrar_pedido_venta">) =>
    call("registrar_pedido_venta", args),
  actualizarEstadoPedido: (args: FunctionArgs<"actualizar_estado_pedido">) =>
    call("actualizar_estado_pedido", args),
  registrarEntrada: (args: FunctionArgs<"registrar_entrada_inventario">) =>
    call("registrar_entrada_inventario", args),
  trasladarInventario: (args: FunctionArgs<"trasladar_inventario">) =>
    call("trasladar_inventario", args),
  registrarDefectuoso: (args: FunctionArgs<"registrar_defectuoso">) =>
    call("registrar_defectuoso", args),
  solicitarAjuste: (args: FunctionArgs<"solicitar_ajuste_inventario">) =>
    call("solicitar_ajuste_inventario", args),
  aprobarAjuste: (args: FunctionArgs<"aprobar_ajuste_inventario">) =>
    call("aprobar_ajuste_inventario", args),
  rechazarAjuste: (args: FunctionArgs<"rechazar_ajuste_inventario">) =>
    call("rechazar_ajuste_inventario", args),
  registrarDevolucion: (args: FunctionArgs<"registrar_devolucion">) =>
    call("registrar_devolucion", { ...args, p_items: args.p_items as Json }),
  crearConteo: (args: FunctionArgs<"crear_conteo">) => call("crear_conteo", args),
  guardarConteo: (args: FunctionArgs<"guardar_conteo_batch">) =>
    call("guardar_conteo_batch", { ...args, p_items: args.p_items as Json }),
  resolverGasto: (args: FunctionArgs<"resolver_gasto">) => call("resolver_gasto", args),
  reasignarCartera: (args: FunctionArgs<"reasignar_cartera">) => call("reasignar_cartera", args),
  resolverAprobacion: (args: FunctionArgs<"resolver_aprobacion">) => call("resolver_aprobacion", args),
  registrarAceptacionCotizacion: (args: FunctionArgs<"registrar_aceptacion_cotizacion">) =>
    call("registrar_aceptacion_cotizacion", args),
  guardarDiseno: (args: FunctionArgs<"guardar_diseno">) => call("guardar_diseno", { ...args, p_extra_ids: args.p_extra_ids as Json }),
  guardarSucursal: (args: FunctionArgs<"guardar_sucursal">) => call("guardar_sucursal", args),
  configurarVendedor: (args: FunctionArgs<"configurar_vendedor">) => call("configurar_vendedor", args),
  guardarProducto: (args: FunctionArgs<"guardar_producto">) => call("guardar_producto", args),
  guardarLanzamiento: (args: FunctionArgs<"guardar_lanzamiento">) => call("guardar_lanzamiento", { ...args, p_diseno_ids: args.p_diseno_ids as Json, p_extra_ids: args.p_extra_ids as Json }),
  configurarMeta: (args: FunctionArgs<"configurar_meta_vendedor">) => call("configurar_meta_vendedor", args),
  configurarMetaSucursal: (args: FunctionArgs<"configurar_meta_sucursal">) => call("configurar_meta_sucursal", args),
  configurarCostoProducto: (args: FunctionArgs<"configurar_costo_producto">) => call("configurar_costo_producto", args),
  dashboardAdmin: (args: FunctionArgs<"obtener_dashboard_admin">) => call("obtener_dashboard_admin", args),
  reporteVentas: (args: FunctionArgs<"obtener_reporte_ventas">) => call("obtener_reporte_ventas", args),
  reporteInventarioMensual: (args: FunctionArgs<"obtener_reporte_inventario_mensual">) => call("obtener_reporte_inventario_mensual", args),
};
