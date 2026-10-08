/* eslint-disable react/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Banknote,
  Check,
  ClipboardCheck,
  CreditCard,
  PackageCheck,
  Plus,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { useAuth } from "../auth/hooks/useAuth";
import { adminService } from "./admin.service";
import { supabase } from "../shared/lib/supabase";
import { friendlyAdminError } from "./admin.errors";
import type { Json } from "../shared/types/database.types";
import { offlineDB } from "../shared/offline/db";
import { createOperationId } from "../shared/operation-id";

export type AdminAction =
  | "cash-open"
  | "cash-close"
  | "cash-expense"
  | "cash-movement"
  | "expense-approve"
  | "expense-reject"
  | "credit-payment"
  | "quote-convert"
  | "order-advance"
  | "order-deliver"
  | "order-finalize"
  | "order-progress"
  | "sale-deliver"
  | "inventory-entry"
  | "inventory-transfer"
  | "inventory-defective"
  | "inventory-adjust-request"
  | "inventory-adjust-approve"
  | "inventory-adjust-reject"
  | "sale-return"
  | "count-create"
  | "count-save"
  | "product-cost";
type Row = Record<string, unknown>;
const isRecord = (value: unknown): value is Row => typeof value === "object" && value !== null;
type Branch = { id: string; nombre: string };
type SaleItem = {
  id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  producto?: { nombre?: string | null; sku?: string | null } | null;
};
type CountProduct = {
  producto_id: string;
  stock: number;
  productos?: { nombre?: string | null; sku?: string | null } | null;
};

const input =
  "w-full border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600";
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/30 p-4">
    <div className="w-full max-w-lg border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <h2 className="font-semibold text-gray-950">{title}</h2>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-900" title="Cerrar">
          <X size={17} />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-medium text-gray-600">{label}</span>
    {children}
  </label>
);

const labels: Record<AdminAction, string> = {
  "cash-open": "Abrir caja",
  "cash-close": "Cerrar caja",
  "cash-expense": "Registrar gasto",
  "cash-movement": "Movimiento autorizado",
  "expense-approve": "Aprobar gasto",
  "expense-reject": "Rechazar gasto",
  "credit-payment": "Registrar pago",
  "quote-convert": "Convertir a pedido",
  "order-advance": "Registrar anticipo",
  "order-deliver": "Marcar entrega",
  "order-finalize": "Cerrar pedido como venta",
  "order-progress": "Actualizar preparación",
  "sale-deliver": "Marcar venta entregada",
  "inventory-entry": "Registrar entrada",
  "inventory-transfer": "Trasladar inventario",
  "inventory-defective": "Registrar defectuoso",
  "inventory-adjust-request": "Solicitar ajuste",
  "inventory-adjust-approve": "Aprobar ajuste",
  "inventory-adjust-reject": "Rechazar ajuste",
  "sale-return": "Registrar devolución",
  "count-create": "Crear conteo",
  "count-save": "Guardar conteo",
  "product-cost": "Configurar costo",
};

export const AdminActionButton: React.FC<{
  action: AdminAction;
  row?: Row;
  onDone: (message: string) => void;
}> = ({ action, row = {}, onDone }) => {
  const { profile, sucursalActiva } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [openSessions, setOpenSessions] = useState<Array<{ id: string; sucursal_id: string }>>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [returnedByProduct, setReturnedByProduct] = useState<Record<string, number>>({});
  const [countProducts, setCountProducts] = useState<CountProduct[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  // Modal data is synchronized from Supabase when an action opens.
  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    if (!open) return;
    if (action === "inventory-transfer" || action === "cash-open" || action === "count-create" || action === "cash-expense")
      void supabase
        .from("sucursales")
        .select("id,nombre")
        .eq("activa", true)
        .order("nombre")
        .then((result) => setBranches((result.data ?? []) as Branch[]));
    if (action === "cash-expense" && !row.id)
      void supabase
        .from("sesiones_caja")
        .select("id,sucursal_id")
        .eq("estado", "abierta")
        .order("fecha_apertura", { ascending: false })
        .then((result) => setOpenSessions((result.data ?? []) as Array<{ id: string; sucursal_id: string }>));
    // The modal fetch must expose progress immediately while the selected row is loading.
    // eslint-disable-next-line react/set-state-in-effect
    if (action === "sale-return" && row.id) {
      setLoadingItems(true);
      void Promise.all([
        supabase.from("venta_items").select("id,producto_id,cantidad,precio_unitario,productos(nombre,sku)").eq("venta_id", String(row.id)),
        supabase.from("devoluciones").select("id").eq("venta_id", String(row.id)),
      ]).then(async ([itemsResult, returnsResult]) => {
        const totals: Record<string, number> = {};
        const returnIds = (returnsResult.data ?? []).map((item) => item.id);
        if (returnIds.length > 0) {
          const detail = await supabase.from("devolucion_items").select("producto_id,cantidad").in("devolucion_id", returnIds);
          (detail.data ?? []).forEach((item) => { if (item.producto_id) totals[item.producto_id] = (totals[item.producto_id] ?? 0) + Number(item.cantidad); });
        }
        setReturnedByProduct(totals);
        setSaleItems((itemsResult.data ?? []) as unknown as SaleItem[]);
        setLoadingItems(false);
      });
    }
    if (action === "count-save" && row.sucursal_id) {
      setLoadingItems(true);
      void supabase
        .from("inventarios")
        .select("producto_id,stock,productos(nombre,sku)")
        .eq("sucursal_id", String(row.sucursal_id))
        .order("producto_id")
        .then((result) => {
          setCountProducts((result.data ?? []) as unknown as CountProduct[]);
          setLoadingItems(false);
        });
    }
    if (action === "credit-payment" || action === "order-advance") {
      const branchId = isRecord(row.ventas)
        ? String(row.ventas.sucursal_id ?? "")
        : String(row.sucursal_id ?? "");
      if (branchId)
        void supabase
          .from("sesiones_caja")
          .select("id,sucursal_id")
          .eq("sucursal_id", branchId)
          .eq("estado", "abierta")
          .order("fecha_apertura", { ascending: false })
          .then((result) =>
            setOpenSessions((result.data ?? []) as Array<{ id: string; sucursal_id: string }>),
          );
    }
  }, [action, open, row.id, row.sucursal_id, row.ventas]);
  const close = () => {
    setOpen(false);
    setError(null);
    setSaleItems([]);
    setReturnedByProduct({});
    setCountProducts([]);
    setOpenSessions([]);
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const number = (name: string) => Number(form.get(name) ?? 0);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    try {
      if (!profile?.id) throw new Error("No hay un usuario administrativo autenticado.");
      if (action === "cash-open") {
        const branchId =
          profile.role === "administrador"
            ? text("sucursal_id")
            : (sucursalActiva?.id ?? text("sucursal_id"));
        if (!branchId) throw new Error("Selecciona una sucursal.");
        await adminService.abrirCaja({
          p_sucursal_id: branchId,
          p_usuario_id: profile.id,
          p_monto_apertura: number("monto"),
        });
      }
      if (action === "product-cost")
        await adminService.configurarCostoProducto({
          p_producto_id: String(row.id),
          p_costo_unitario: number("costo_unitario"),
          p_admin_id: profile.id,
        });
      if (action === "cash-close")
        await adminService.cerrarCaja({
          p_sesion_caja_id: String(row.id),
          p_denominaciones: {
            q200: number("q200"),
            q100: number("q100"),
            q50: number("q50"),
            q20: number("q20"),
            q10: number("q10"),
            q5: number("q5"),
            monedas: number("monedas"),
          } as Json,
        });
      if (action === "cash-expense")
        await (async () => {
          const sessionId = text("sesion_caja_id") || String(row.id ?? "");
          const sourceBranch = openSessions.find((session) => session.id === sessionId)?.sucursal_id || String(row.sucursal_id ?? sucursalActiva?.id ?? "");
          if (!sessionId || !sourceBranch) throw new Error("Selecciona una caja abierta de origen.");
          return adminService.registrarGasto({
            p_sesion_caja_id: sessionId,
            p_sucursal_id: sourceBranch,
            p_categoria: text("categoria"),
            p_monto: number("monto"),
            p_descripcion: text("descripcion"),
            p_comprobante_url: text("comprobante_url"),
            p_registrado_por: profile.id,
            p_observacion: text("observacion") || undefined,
            p_operation_id: createOperationId("gasto"),
            p_sucursal_imputada_id: text("sucursal_imputada_id") || sourceBranch,
          } as never);
        })();
      if (action === "cash-movement")
        await adminService.registrarMovimientoCaja({
          p_sesion_caja_id: String(row.id),
          p_tipo: text("tipo"),
          p_monto: number("monto"),
          p_concepto: text("concepto"),
          p_autorizado_por: profile.id,
        });
      if (action === "expense-approve")
        await adminService.resolverGasto({
          p_gasto_id: String(row.id),
          p_aprobador_id: profile.id,
          p_aprobar: true,
        });
      if (action === "expense-reject")
        await adminService.resolverGasto({
          p_gasto_id: String(row.id),
          p_aprobador_id: profile.id,
          p_aprobar: false,
        });
      if (action === "credit-payment") {
        const forma = text("forma_pago") as
          | "efectivo"
          | "tarjeta"
          | "transferencia"
          | "saldo_favor";
        const sessionId = text("sesion_caja_id");
        if (forma === "efectivo" && !sessionId)
          throw new Error("Selecciona una sesión de caja abierta para pagos en efectivo.");
        await adminService.registrarPago({
          p_cuenta_cobrar_id: String(row.id),
          p_monto: number("monto"),
          p_forma_pago: forma,
          p_referencia: text("referencia"),
          p_registrado_por: profile.id,
          ...(sessionId ? { p_sesion_caja_id: sessionId } : {}),
          p_operation_id: createOperationId("pago-credito"),
        });
      }
      if (action === "quote-convert")
        await adminService.convertirCotizacion({ p_cotizacion_id: String(row.id) });
      if (action === "order-advance")
        if (text("forma_pago") === "efectivo" && !text("sesion_caja_id"))
          throw new Error("Selecciona una sesión de caja abierta para un anticipo en efectivo.");
      if (action === "order-advance")
        await adminService.registrarAnticipo({
          p_pedido_id: String(row.id),
          p_cliente_id: String(row.cliente_id),
          p_monto: number("monto"),
          p_forma_pago: text("forma_pago") as "efectivo" | "tarjeta" | "transferencia" | "saldo_favor",
          p_comprobante_ref: text("referencia"),
          p_registrado_por: profile.id,
          ...(text("sesion_caja_id") ? { p_sesion_caja_id: text("sesion_caja_id") } : {}),
          p_operation_id: createOperationId("anticipo"),
        });
      if (action === "order-deliver")
        await adminService.marcarEntrega({
          p_pedido_id: String(row.id),
          p_recibido_por: text("recibido_por"),
          p_observaciones: text("observaciones") || undefined,
          p_entregado_por: profile.id,
          p_operation_id: createOperationId("entrega-pedido"),
        });
      if (action === "order-finalize")
        await adminService.registrarPedidoVenta({
          p_pedido_id: String(row.id),
          p_registrado_por: profile.id,
          p_operation_id: createOperationId("pedido-venta"),
        });
      if (action === "order-progress")
        await adminService.actualizarEstadoPedido({
          p_pedido_id: String(row.id),
          p_estado: text("estado_pedido") as "en_produccion" | "listo",
          p_actualizado_por: profile.id,
        });
      if (action === "sale-deliver")
        await adminService.marcarVentaEntregada({
          p_venta_id: String(row.id),
          p_entregada_por: profile.id,
        });
      if (action === "inventory-entry")
        await adminService.registrarEntrada({
          p_sucursal_id: String(row.sucursal_id ?? sucursalActiva?.id ?? ""),
          p_producto_id: String(row.producto_id),
          p_cantidad: number("cantidad"),
          p_motivo: text("motivo"),
          p_usuario_id: profile.id,
        });
      if (action === "inventory-transfer")
        await adminService.trasladarInventario({
          p_sucursal_origen_id: String(row.sucursal_id ?? ""),
          p_sucursal_destino_id: text("sucursal_destino_id"),
          p_producto_id: String(row.producto_id),
          p_cantidad: number("cantidad"),
          p_solicitado_por: profile.id,
        });
      if (action === "inventory-defective")
        await adminService.registrarDefectuoso({
          p_sucursal_id: String(row.sucursal_id ?? sucursalActiva?.id ?? ""),
          p_producto_id: String(row.producto_id),
          p_cantidad: number("cantidad"),
          p_motivo: text("motivo"),
          p_reportado_por: profile.id,
        });
      if (action === "inventory-adjust-request")
        await adminService.solicitarAjuste({
          p_sucursal_id: String(row.sucursal_id ?? sucursalActiva?.id ?? ""),
          p_producto_id: String(row.producto_id),
          p_stock_nuevo: number("stock_nuevo"),
          p_motivo: text("motivo"),
          p_solicitado_por: profile.id,
        });
      if (action === "inventory-adjust-approve")
        await adminService.aprobarAjuste({
          p_ajuste_id: String(row.id),
          p_aprobado_por: profile.id,
        });
      if (action === "inventory-adjust-reject")
        await adminService.rechazarAjuste({
          p_ajuste_id: String(row.id),
          p_rechazado_por: profile.id,
        });
      if (action === "sale-return") {
        const items = saleItems
          .map((item) => ({
            producto_id: item.producto_id,
            cantidad: number(`item_${item.id}`),
            precio_unitario: item.precio_unitario,
          }))
          .filter((item) => item.cantidad > 0);
        if (items.length === 0) throw new Error("Selecciona al menos un producto para devolver.");
        await adminService.registrarDevolucion({
          p_venta_id: String(row.id),
          p_motivo: text("motivo"),
          p_autorizado_por: profile.id,
          p_items: items as unknown as Json,
          p_operation_id: createOperationId("devolucion"),
          p_fecha_operativa: text("fecha_operativa") || undefined,
        });
      }
      if (action === "count-create") {
        const branchId =
          profile.role === "administrador"
            ? text("sucursal_id")
            : (sucursalActiva?.id ?? text("sucursal_id"));
        if (!branchId) throw new Error("Selecciona una sucursal.");
        await adminService.crearConteo({ p_sucursal_id: branchId, p_realizado_por: profile.id });
      }
      if (action === "count-save") {
        const items = countProducts.map((product) => ({
          producto_id: product.producto_id,
          stock_sistema: product.stock,
          stock_fisico: number(`count_${product.producto_id}`),
        }));
        if (!items.some((item) => item.stock_fisico >= 0 && form.has(`count_${item.producto_id}`)))
          throw new Error("Captura al menos una cantidad física.");
        await offlineDB.conteos.put({
          id: String(row.id),
          conteo_id: String(row.id),
          items,
          updated_at: new Date().toISOString(),
        });
        await adminService.guardarConteo({
          p_conteo_id: String(row.id),
          p_items: items as unknown as Json,
          p_finalizar: form.get("finalizar") === "on",
        });
        await offlineDB.conteos.delete(String(row.id));
      }
      close();
      setSubmitting(false);
      onDone(`${labels[action]} completado correctamente.`);
    } catch (err) {
      setSubmitting(false);
      setError(friendlyAdminError(err));
    }
  };
  const icon = action.startsWith("cash") ? (
    <Banknote size={15} />
  ) : action === "credit-payment" ? (
    <CreditCard size={15} />
  ) : action === "quote-convert" ? (
    <Check size={15} />
  ) : action === "order-deliver" || action === "sale-deliver" ? (
    <Truck size={15} />
  ) : action === "inventory-transfer" ? (
    <ArrowRightLeft size={15} />
  ) : action === "sale-return" ? (
    <RotateCcw size={15} />
  ) : action.startsWith("inventory-adjust") || action.startsWith("expense-") ? (
    <ShieldCheck size={15} />
  ) : action === "inventory-defective" ? (
    <PackageCheck size={15} />
  ) : action.startsWith("count-") ? (
    <ClipboardCheck size={15} />
  ) : action === "order-advance" ? (
    <Receipt size={15} />
  ) : (
    <Plus size={15} />
  );
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-blue-500 hover:text-blue-700"
      >
        {icon}
        {labels[action]}
      </button>
      {open && (
        <Modal
          title={labels[action]}
          onClose={() => {
            if (!submitting) close();
          }}
        >
          <form onSubmit={submit} className="space-y-4">
            {["cash-open", "count-create"].includes(action) &&
              (profile?.role === "administrador" || !sucursalActiva) && (
                <Field label="Sucursal *">
                  <select name="sucursal_id" required className={input}>
                    <option value="">Selecciona una sucursal</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.nombre}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            {action === "cash-open" && (
              <Field label="Saldo inicial *">
                <input name="monto" required min="0" step="0.01" type="number" className={input} />
              </Field>
            )}
            {action === "cash-close" && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["q200", "Billetes Q200"],
                  ["q100", "Billetes Q100"],
                  ["q50", "Billetes Q50"],
                  ["q20", "Billetes Q20"],
                  ["q10", "Billetes Q10"],
                  ["q5", "Billetes Q5"],
                  ["monedas", "Monedas (monto total Q)"],
                ].map(([name, label]) => (
                  <Field key={name} label={label}>
                    <input
                      name={name}
                      required
                      min="0"
                      step="0.01"
                      type="number"
                      defaultValue="0"
                      className={input}
                    />
                  </Field>
                ))}
              </div>
            )}
            {action === "cash-expense" && (
              <>
                {!row.id && <Field label="Caja de origen *"><select name="sesion_caja_id" required className={input}><option value="">Selecciona una caja abierta</option>{openSessions.map((session) => <option key={session.id} value={session.id}>{branches.find((branch) => branch.id === session.sucursal_id)?.nombre ?? "Sucursal"} · sesión abierta</option>)}</select></Field>}
                {profile?.role === "administrador" && <Field label="Sucursal imputada *"><select name="sucursal_imputada_id" required defaultValue={String(row.sucursal_imputada_id ?? row.sucursal_id ?? "")} className={input}><option value="">Selecciona una sucursal</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.nombre}</option>)}</select></Field>}
                <Field label="Categoría *">
                  <input name="categoria" required className={input} />
                </Field>
                <Field label="Monto *">
                  <input
                    name="monto"
                    required
                    min="0.01"
                    step="0.01"
                    type="number"
                    className={input}
                  />
                </Field>
                <Field label="Concepto *">
                  <textarea name="descripcion" required className={input} rows={2} />
                </Field>
                <Field label="Observación">
                  <textarea name="observacion" className={input} rows={2} />
                </Field>
                <Field label="Comprobante URL">
                  <input name="comprobante_url" type="url" className={input} />
                </Field>
              </>
            )}
            {action === "cash-movement" && (
              <>
                <Field label="Tipo *">
                  <select name="tipo" required className={input}>
                    <option value="ingreso">Ingreso autorizado</option>
                    <option value="egreso">Egreso autorizado</option>
                  </select>
                </Field>
                <Field label="Monto *">
                  <input
                    name="monto"
                    required
                    min="0.01"
                    step="0.01"
                    type="number"
                    className={input}
                  />
                </Field>
                <Field label="Concepto *">
                  <textarea name="concepto" required className={input} rows={2} />
                </Field>
              </>
            )}
            {["credit-payment", "order-advance"].includes(action) && (
              <>
                <Field label="Monto *">
                  <input
                    name="monto"
                    required
                    min="0.01"
                    step="0.01"
                    type="number"
                    max={String(row.saldo_pendiente ?? "")}
                    className={input}
                  />
                </Field>
                <Field label="Forma de pago *">
                  <select name="forma_pago" required className={input}>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="saldo_favor">Saldo a favor</option>
                  </select>
                </Field>
                {action === "credit-payment" || action === "order-advance" ? (
                  <Field label="Caja para efectivo">
                    <select name="sesion_caja_id" className={input}>
                      <option value="">No aplica</option>
                      {openSessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          Sesión abierta · {session.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}
                <Field label="Referencia">
                  <input name="referencia" className={input} />
                </Field>
              </>
            )}
            {action === "order-deliver" && (
              <>
                <Field label="Recibido por *">
                  <input name="recibido_por" required className={input} />
                </Field>
                <Field label="Observaciones">
                  <textarea name="observaciones" className={input} rows={3} />
                </Field>
              </>
            )}
            {action === "order-finalize" && (
              <p className="text-sm text-gray-600">
                Esta operación descuenta inventario, crea la venta relacionada y habilita la comisión según las reglas de PostgreSQL.
              </p>
            )}
            {action === "product-cost" && (
              <Field label="Costo unitario *">
                <input
                  name="costo_unitario"
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  defaultValue={String(row.costo_unitario ?? 0)}
                  className={input}
                />
              </Field>
            )}
            {action === "order-progress" && (
              <Field label="Siguiente estado *">
                <select name="estado_pedido" required className={input}>
                  {String(row.estado) === "pendiente" && <option value="en_produccion">En producción</option>}
                  {String(row.estado) === "en_produccion" && <option value="listo">Listo</option>}
                </select>
              </Field>
            )}
            {["inventory-entry", "inventory-defective"].includes(action) && (
              <>
                <Field label="Cantidad *">
                  <input
                    name="cantidad"
                    required
                    min="0.01"
                    step="0.01"
                    type="number"
                    className={input}
                  />
                </Field>
                <Field label="Motivo *">
                  <textarea name="motivo" required className={input} rows={2} />
                </Field>
              </>
            )}
            {action === "inventory-transfer" && (
              <>
                <p className="border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                  Origen: <strong>{isRecord(row.sucursales) ? String(row.sucursales.nombre) : "Sucursal seleccionada"}</strong>
                  <span className="ml-2 text-blue-700">Stock disponible: {String(row.stock ?? 0)}</span>
                </p>
                <Field label="Sucursal destino *">
                  <select name="sucursal_destino_id" required className={input}>
                    <option value="">Selecciona una sucursal</option>
                    {branches
                      .filter((branch) => branch.id !== row.sucursal_id)
                      .map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.nombre}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Cantidad *">
                  <input
                    name="cantidad"
                    required
                    min="0.01"
                    step="0.01"
                    type="number"
                    className={input}
                  />
                </Field>
              </>
            )}
            {action === "inventory-adjust-request" && (
              <>
                <Field label="Nuevo stock *">
                  <input
                    name="stock_nuevo"
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    defaultValue={String(row.stock ?? 0)}
                    className={input}
                  />
                </Field>
                <Field label="Motivo obligatorio *">
                  <textarea name="motivo" required className={input} rows={3} />
                </Field>
              </>
            )}
            {["inventory-adjust-approve", "inventory-adjust-reject"].includes(action) && (
              <p className="text-sm text-gray-600">
                {action === "inventory-adjust-approve"
                  ? "La aprobación aplicará el nuevo stock de forma atómica."
                  : "La solicitud quedará rechazada y el stock no cambiará."}
              </p>
            )}
            {["expense-approve", "expense-reject"].includes(action) && (
              <p className="text-sm text-gray-600">
                {action === "expense-approve"
                  ? "El gasto aprobado generará el egreso de caja."
                  : "El gasto quedará rechazado y no se eliminará."}
              </p>
            )}
            {action === "sale-return" && (
              <>
                {loadingItems ? (
                  <p className="text-sm text-gray-500">Cargando productos de la venta...</p>
                ) : (
                  saleItems.map((item) => (
                    <Field
                      key={item.id}
                      label={`${item.producto?.nombre ?? item.producto?.sku ?? item.producto_id} · vendido ${item.cantidad}`}
                    >
                      <input
                        name={`item_${item.id}`}
                        min="0"
                        max={Math.max(0, item.cantidad - (returnedByProduct[item.producto_id] ?? 0))}
                        step="0.01"
                        type="number"
                        defaultValue="0"
                        className={input}
                    />
                    <span className="text-xs text-gray-500">Disponible para devolución: {Math.max(0, item.cantidad - (returnedByProduct[item.producto_id] ?? 0))}</span>
                  </Field>
                ))
              )}
                <Field label="Fecha operativa *"><input name="fecha_operativa" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} max={new Date().toISOString().slice(0, 10)} className={input} /></Field>
                <Field label="Motivo obligatorio *">
                  <textarea name="motivo" required className={input} rows={2} />
                </Field>
              </>
            )}
            {action === "count-save" && (
              <>
                {loadingItems ? (
                  <p className="text-sm text-gray-500">Cargando productos de la sucursal...</p>
                ) : (
                  countProducts.map((product) => (
                    <Field
                      key={product.producto_id}
                      label={`${product.productos?.nombre ?? product.productos?.sku ?? product.producto_id} · sistema ${product.stock}`}
                    >
                      <input
                        name={`count_${product.producto_id}`}
                        min="0"
                        step="0.01"
                        type="number"
                        className={input}
                      />
                    </Field>
                  ))
                )}
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input name="finalizar" type="checkbox" /> Finalizar conteo
                </label>
              </>
            )}
            {error && (
              <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={close}
                className="border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || loadingItems}
                className="bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-800"
              >
                {submitting ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};
