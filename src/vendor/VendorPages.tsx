/* eslint-disable react/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Eye,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "../auth/hooks/useAuth";
import { friendlyAdminError } from "../admin/admin.errors";
import { supabase } from "../shared/lib/supabase";
import { vendorService } from "./vendor.service";
import { createOperationId } from "../shared/operation-id";
import { getSignedR2Url } from "../storage/r2.service";
import { PrintDocumentButton } from "../shared/printing/PrintDocumentButton";
import { VendorAnalyticsDashboard } from "./VendorAnalyticsDashboard";
import type { Database } from "../shared/types/database.types";
import { formatQuantity, isValidUnitQuantity, pricePerUnit, unitAllowsFraction, unitStep, type SalesUnit } from "../shared/units";
import { ProductImage, type ProductImageSource } from "../shared/product-images";

type Row = Record<string, unknown>;
type Product = {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  precio_base: number;
  precio_mayorista: number;
  activo: boolean | null;
  stock: number;
  unidad_venta: SalesUnit;
  archivo_id: string | null;
  archivos?: { path?: string | null } | null;
  disenos?: Array<{ archivo_url?: string | null; archivos?: { path?: string | null } | null }> | null;
};
type Client = {
  id: string;
  nombre: string;
  nit_dpi: string | null;
  telefono: string | null;
  direccion: string | null;
  es_mayorista: boolean | null;
  activo: boolean | null;
  monto_solicitado?: number | null;
  monto_autorizado?: number | null;
  dias_credito?: number | null;
};
type CartItem = {
  producto_id: string;
  nombre: string;
  sku: string;
  cantidad: number;
  precio_unitario: number;
  stock: number;
  unidad_venta: SalesUnit;
};
type SaleSuccess = {
  id: string;
  client: string;
  total: number;
  branch: string;
  tipo_pago: "efectivo" | "credito";
};
type CashSession = {
  id: string;
  usuario_id: string;
  monto_apertura: number;
  fecha_apertura: string;
  profiles?: { nombre_completo?: string | null } | null;
};

const input = "altix-input w-full text-sm outline-none transition focus:border-blue-600";
const money = (value: unknown) =>
  typeof value === "number"
    ? `Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`
    : "—";
const date = (value: unknown) =>
  typeof value === "string"
    ? new Date(value).toLocaleDateString("es-GT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const shortId = (value: unknown) =>
  typeof value === "string" ? value.slice(0, 8).toUpperCase() : "—";
const display = (row: Row, key: string) => {
  const item = row[key];
  if (
    key.includes("total") ||
    key.includes("monto") ||
    key.includes("precio") ||
    key.includes("saldo")
  )
    return money(item);
  if (key.includes("created") || key.includes("fecha")) return date(item);
  if (typeof item === "boolean") return item ? "Activo" : "Inactivo";
  if (typeof item === "object" && item !== null) return String((item as Row).nombre ?? "—");
  return String(item ?? "—");
};

const Frame: React.FC<{
  title: string;
  description: string;
  onRefresh?: () => void;
  children: React.ReactNode;
}> = ({ title, description, onRefresh, children }) => (
  <section className="space-y-5">
    <header className="flex items-center justify-between gap-3 border-b border-gray-200 pb-4">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">
          Vendedor
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-gray-950 sm:text-2xl">{title}</h1>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">{description}</p>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          title="Actualizar"
          className="altix-vendor-button altix-vendor-secondary shrink-0 px-3"
        >
          <RefreshCw size={17} />
        </button>
      )}
    </header>
    {children}
  </section>
);
const State: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="altix-vendor-surface p-8 text-center text-sm text-gray-500">
    {children}
  </div>
);
const Notice: React.FC<{ error?: string | null; success?: string | null }> = ({
  error,
  success,
}) => (
  <>
    {error && (
      <p className="flex items-start gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <CircleAlert className="mt-0.5 shrink-0" size={16} />
        {error}
      </p>
    )}
    {success && (
      <p className="flex items-start gap-2 border border-green-200 bg-green-50 p-3 text-sm text-green-700">
        <CheckCircle2 className="mt-0.5 shrink-0" size={16} />
        {success}
      </p>
    )}
  </>
);
const beginningOfDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate()).toISOString();
const beginningOfMonth = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), 1).toISOString();

export const VendorDashboardLegacy: React.FC = () => {
  const { user, profile, sucursalActiva } = useAuth();
  const [data, setData] = useState({
    todaySales: 0,
    monthSales: 0,
    monthCommission: 0,
    clients: 0,
    recent: [] as Row[],
    lowStock: [] as Row[],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!user || !sucursalActiva) return;
    setLoading(true);
    const now = new Date();
    const [today, month, commission, clients, recent, stock] = await Promise.all([
      supabase
        .from("ventas")
        .select("total")
        .eq("vendedor_id", user.id)
        .gte("created_at", beginningOfDay(now)),
      supabase
        .from("ventas")
        .select("total")
        .eq("vendedor_id", user.id)
        .gte("created_at", beginningOfMonth(now)),
      supabase
        .from("comisiones")
        .select("monto_comision")
        .eq("vendedor_id", user.id)
        .eq("periodo", now.toISOString().slice(0, 7)),
      supabase.from("clientes").select("id", { count: "exact", head: true }),
      supabase
        .from("ventas")
        .select("id,total,created_at,clientes(nombre)")
        .eq("vendedor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("inventarios")
        .select("stock,stock_minimo,productos(nombre,sku)")
        .eq("sucursal_id", sucursalActiva.id)
        .order("stock")
        .limit(5),
    ]);
    const failed = [today, month, commission, clients, recent, stock].find(
      (result) => result.error,
    );
    if (failed?.error)
      setError(friendlyAdminError(failed.error, "No se pudieron cargar los indicadores."));
    else {
      const sum = (rows: Array<{ total?: number; monto_comision?: number }> | null) =>
        (rows ?? []).reduce(
          (total, row) => total + Number(row.total ?? row.monto_comision ?? 0),
          0,
        );
      setError(null);
      setData({
        todaySales: sum(today.data),
        monthSales: sum(month.data),
        monthCommission: sum(commission.data),
        clients: clients.count ?? 0,
        recent: (recent.data ?? []) as Row[],
        lowStock: ((stock.data ?? []) as Row[]).filter(
          (row) => Number(row.stock) <= Number(row.stock_minimo),
        ),
      });
    }
    setLoading(false);
  }, [sucursalActiva, user]);
  // Initial remote fetch synchronizes this view with Supabase.
  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <Frame
      title="Inicio"
      description={`${profile?.nombre_completo ?? "Vendedor"} · ${sucursalActiva?.nombre ?? "Sin sucursal"}`}
      onRefresh={() => void load()}
    >
      <Notice error={error} />
      {loading ? (
        <State>Cargando resumen...</State>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Ventas hoy", data.todaySales],
              ["Ventas del mes", money(data.monthSales)],
              ["Comisión del mes", money(data.monthCommission)],
              ["Sucursal activa", sucursalActiva?.nombre ?? "—"],
            ].map(([label, item]) => (
              <div key={String(label)} className="border border-gray-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {label}
                </p>
                <p className="mt-3 truncate text-xl font-semibold text-gray-950">{item}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <h2 className="font-semibold text-gray-950">Ventas recientes</h2>
                <Link to="/vendedor/ventas" className="text-xs font-medium text-blue-700">
                  Ver todas
                </Link>
              </div>
              {data.recent.length === 0 ? (
                <State>Aún no hay ventas.</State>
              ) : (
                <div className="divide-y divide-gray-100">
                  {data.recent.map((row) => (
                    <div
                      key={String(row.id)}
                      className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">
                          {typeof row.clientes === "object" && row.clientes
                            ? String((row.clientes as Row).nombre ?? "Cliente")
                            : "Cliente"}
                        </p>
                        <p className="text-xs text-gray-500">
                          #{shortId(row.id)} · {date(row.created_at)}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold text-gray-900">
                        {money(row.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <h2 className="font-semibold text-gray-950">Stock bajo</h2>
                <Link to="/vendedor/inventario" className="text-xs font-medium text-blue-700">
                  Inventario
                </Link>
              </div>
              {data.lowStock.length === 0 ? (
                <State>Sin alertas de stock.</State>
              ) : (
                <div className="divide-y divide-gray-100">
                  {data.lowStock.map((row, index) => {
                    const product = row.productos as Row | undefined;
                    return (
                      <div
                        key={String(row.id ?? index)}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {String(product?.nombre ?? "Producto")}
                          </p>
                          <p className="text-xs text-gray-500">{String(product?.sku ?? "—")}</p>
                        </div>
                        <span className="font-semibold text-red-700">{row.stock as number}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/vendedor/venta"
              className="flex items-center justify-between bg-blue-700 p-4 text-sm font-medium text-white hover:bg-blue-800"
            >
              Nueva venta <ArrowRight size={16} />
            </Link>
            <Link
              to="/vendedor/clientes"
              className="flex items-center justify-between border border-gray-200 bg-white p-4 text-sm font-medium"
            >
              Clientes ({data.clients}) <ArrowRight size={16} />
            </Link>
            <Link
              to="/vendedor/catalogo"
              className="flex items-center justify-between border border-gray-200 bg-white p-4 text-sm font-medium"
            >
              Catálogo <ArrowRight size={16} />
            </Link>
            <Link
              to="/vendedor/ventas"
              className="flex items-center justify-between border border-gray-200 bg-white p-4 text-sm font-medium"
            >
              Mis ventas <ArrowRight size={16} />
            </Link>
          </div>
        </>
      )}
    </Frame>
  );
};

export const VendorDashboard = VendorAnalyticsDashboard;

export const VendorPosPage: React.FC = () => {
  const { user, sucursalActiva } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [cashOpenAmount, setCashOpenAmount] = useState("0");
  const [cashCounts, setCashCounts] = useState({ q200: "0", q100: "0", q50: "0", q20: "0", q10: "0", q5: "0", monedas: "0" });
  const [cashBusy, setCashBusy] = useState(false);
  const [cashMessage, setCashMessage] = useState<string | null>(null);
  const [cashError, setCashError] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [productSearch, setProductSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [paymentType, setPaymentType] = useState<"efectivo" | "credito">("efectivo");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SaleSuccess | null>(null);
  const load = useCallback(async () => {
    if (!user || !sucursalActiva) return;
    setLoading(true);
    const [productRows, inventoryRows, clientRows, sessions] = await Promise.all([
      supabase.from("productos").select("*,archivos(path),disenos(archivo_url,archivo_id,archivos(path))").eq("activo", true).order("nombre"),
      supabase.from("inventarios").select("producto_id,stock").eq("sucursal_id", sucursalActiva.id),
      supabase.from("clientes").select("*").eq("activo", true).order("nombre"),
      supabase
        .from("sesiones_caja")
        .select("id,usuario_id,monto_apertura,fecha_apertura,profiles!sesiones_caja_usuario_id_fkey(nombre_completo)")
        .eq("sucursal_id", sucursalActiva.id)
        .eq("estado", "abierta")
        .order("fecha_apertura", { ascending: false })
        .limit(1),
    ]);
    const failed = [productRows, inventoryRows, clientRows, sessions].find(
      (result) => result.error,
    );
    if (failed?.error)
      setError(friendlyAdminError(failed.error, "No se pudo cargar el punto de venta."));
    else {
      const stockByProduct = new Map(
        (inventoryRows.data ?? []).map((row) => [row.producto_id, Number(row.stock)]),
      );
      setProducts(
        ((productRows.data ?? []) as unknown as Product[]).map((product) => ({
          ...product,
          stock: stockByProduct.get(product.id) ?? 0,
        })),
      );
      setClients((clientRows.data ?? []) as Client[]);
      setCashSession((sessions.data?.[0] ?? null) as CashSession | null);
      setError(null);
    }
    setLoading(false);
  }, [sucursalActiva, user]);
  const openCash = async () => {
    if (!user || !sucursalActiva) return;
    setCashBusy(true); setCashError(null); setCashMessage(null);
    try {
      const { error: rpcError } = await supabase.rpc("abrir_caja", { p_sucursal_id: sucursalActiva.id, p_usuario_id: user.id, p_monto_apertura: Number(cashOpenAmount) });
      if (rpcError) throw rpcError;
      setCashMessage("Caja abierta correctamente para tu sucursal.");
      await load();
    } catch (err) { setCashError(friendlyAdminError(err, "No se pudo abrir la caja.")); }
    finally { setCashBusy(false); }
  };
  const closeCash = async () => {
    if (!cashSession) return;
    setCashBusy(true); setCashError(null); setCashMessage(null);
    try {
      const { error: rpcError } = await supabase.rpc("cerrar_caja", { p_sesion_caja_id: cashSession.id, p_denominaciones: Object.fromEntries(Object.entries(cashCounts).map(([key, value]) => [key, Number(value)])) });
      if (rpcError) throw rpcError;
      setCashMessage("Caja cerrada correctamente.");
      await load();
    } catch (err) { setCashError(friendlyAdminError(err, "No se pudo cerrar la caja.")); }
    finally { setCashBusy(false); }
  };
  // Initial remote fetch synchronizes this view with Supabase.
  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const needle = clientSearch.trim().replace(/[%,()]/g, " ").replace(/\s+/g, " ");
    if (!needle) return;
    void supabase
      .from("clientes")
      .select("*")
      .or(`nombre.ilike.%${needle}%,nit_dpi.ilike.%${needle}%,telefono.ilike.%${needle}%`)
      .order("nombre")
      .limit(100)
      .then((result) => {
        if (result.error) setError(friendlyAdminError(result.error, "No se pudieron buscar los clientes."));
        else setClients((result.data ?? []) as Client[]);
      });
  }, [clientSearch]);
  // Catalog navigation passes only a product id; this selects local data without creating a sale.
  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    const requestedProductId = (location.state as { productId?: string } | null)?.productId;
    if (!requestedProductId || products.length === 0) return;
    const product = products.find((item) => item.id === requestedProductId);
    if (product) {
      setProductId(product.id);
      setProductSearch(product.nombre);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, products]);
  const selectedClient = clients.find((client) => client.id === clientId);
  const selectedProduct =
    products.find((product) => product.id === productId) ??
    products.find((product) => product.nombre === productSearch || product.sku === productSearch);
  const total = cart.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0);
  const availableProducts = products
    .filter((product) =>
      `${product.sku} ${product.nombre}`.toLowerCase().includes(productSearch.toLowerCase().trim()),
    )
    .filter((product) => product.stock > 0);
  const availableClients = clients.filter((client) =>
    `${client.nombre} ${client.nit_dpi ?? ""} ${client.telefono ?? ""}`
      .toLowerCase()
      .includes(clientSearch.toLowerCase().trim()),
  );
  const addItem = () => {
    if (!selectedProduct || quantity <= 0) return;
    if (!isValidUnitQuantity(quantity, selectedProduct.unidad_venta)) {
      setError("Esta unidad solo admite cantidades enteras.");
      return;
    }
    const existing = cart.find((item) => item.producto_id === selectedProduct.id);
    const nextQuantity = (existing?.cantidad ?? 0) + quantity;
    if (nextQuantity > selectedProduct.stock) {
      setError(`Stock disponible para ${selectedProduct.nombre}: ${selectedProduct.stock}.`);
      return;
    }
    setCart((previous) =>
      existing
        ? previous.map((item) =>
            item.producto_id === selectedProduct.id ? { ...item, cantidad: nextQuantity } : item,
          )
        : [
            ...previous,
            {
              producto_id: selectedProduct.id,
              nombre: selectedProduct.nombre,
              sku: selectedProduct.sku,
              cantidad: quantity,
              precio_unitario: selectedClient?.es_mayorista
                ? selectedProduct.precio_mayorista
                : selectedProduct.precio_base,
              stock: selectedProduct.stock,
              unidad_venta: selectedProduct.unidad_venta ?? "unidad",
            },
          ],
    );
    setProductId("");
    setProductSearch("");
    setQuantity(1);
    setError(null);
  };
  const changeQuantity = (id: string, delta: number) =>
    setCart((previous) =>
      previous.map((item) =>
        item.producto_id === id
          ? { ...item, cantidad: Math.min(item.stock, Math.max(item.unidad_venta === "unidad" || item.unidad_venta === "docena" || item.unidad_venta === "paquete" || item.unidad_venta === "rollo" ? 1 : 0.001, Number((item.cantidad + delta).toFixed(3)))) }
          : item,
      ),
    );
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!user || !sucursalActiva || !clientId || cart.length === 0 || total <= 0) {
      setError("Selecciona un cliente y agrega al menos un producto.");
      return;
    }
    if (paymentType === "credito" && !selectedClient?.es_mayorista) {
      setError("El crédito solo está disponible para clientes mayoristas.");
      return;
    }
    if (paymentType === "efectivo" && !cashSession) {
      setError("No tienes una sesión de caja abierta. Solicita apertura de caja al administrador.");
      return;
    }
    setSubmitting(true);
    try {
      const id = await vendorService.registrarVenta({
        sucursal_id: sucursalActiva.id,
        cliente_id: clientId,
        vendedor_id: user.id,
        ...(paymentType === "efectivo" && cashSession ? { sesion_caja_id: cashSession.id } : {}),
        total,
        tipo_pago: paymentType,
        items: cart.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
        })),
      });
      setSuccess({
        id,
        client: selectedClient?.nombre ?? "Cliente",
        total,
        branch: sucursalActiva.nombre,
        tipo_pago: paymentType,
      });
      setCart([]);
      setClientId("");
      setPaymentType("efectivo");
      await load();
    } catch (err) {
      setError(friendlyAdminError(err, "No se pudo registrar la venta."));
    } finally {
      setSubmitting(false);
    }
  };
  if (success)
    return (
      <Frame title="Venta registrada" description="La operación fue confirmada por Supabase.">
        <div className="mx-auto max-w-lg border border-green-200 bg-white p-6">
          <div className="flex items-center gap-3 border-b border-gray-200 pb-5">
            <CheckCircle2 className="text-green-600" size={24} />
            <div>
              <p className="font-semibold text-gray-950">Venta registrada correctamente</p>
              <p className="text-sm text-gray-500">Folio #{shortId(success.id)}</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-4 py-5 text-sm">
            <dt className="text-gray-500">Cliente</dt>
            <dd className="text-right font-medium">{success.client}</dd>
            <dt className="text-gray-500">Sucursal</dt>
            <dd className="text-right font-medium">{success.branch}</dd>
            <dt className="text-gray-500">Forma de pago</dt>
            <dd className="text-right font-medium">
              {success.tipo_pago === "credito" ? "Crédito" : "Efectivo"}
            </dd>
            <dt className="text-gray-500">Total</dt>
            <dd className="text-right text-lg font-semibold">{money(success.total)}</dd>
          </dl>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => setSuccess(null)}
              className="flex flex-1 items-center justify-center gap-2 bg-blue-700 px-4 py-3 text-sm font-medium text-white hover:bg-blue-800"
            >
              <Plus size={16} /> Nueva venta
            </button>
            <Link
              to="/vendedor/ventas"
              className="flex flex-1 items-center justify-center gap-2 border border-gray-300 px-4 py-3 text-sm font-medium"
            >
              <Eye size={16} /> Ver mis ventas
            </Link>
          </div>
        </div>
      </Frame>
    );
  return (
    <Frame
      title="Nueva venta"
      description="Venta de contado o crédito con inventario y caja gestionados por la RPC transaccional."
    >
      <Notice error={error} />
      <section className="border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2"><Wallet size={17} className="text-blue-700" /><h2 className="font-semibold">Caja de {sucursalActiva?.nombre ?? "tu sucursal"}</h2></div>
            {cashSession ? <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm text-gray-600 sm:grid-cols-3"><div><dt className="text-xs text-gray-400">Estado</dt><dd className="font-medium text-green-700">Caja abierta</dd></div><div><dt className="text-xs text-gray-400">Apertura</dt><dd>{new Date(cashSession.fecha_apertura).toLocaleString("es-GT")}</dd></div><div><dt className="text-xs text-gray-400">Responsable</dt><dd>{cashSession.profiles?.nombre_completo ?? "Responsable asignado"}</dd></div></dl> : <p className="mt-2 text-sm text-amber-700">Caja cerrada. Abre la sesión antes de registrar ventas de contado.</p>}
            {cashError && <p className="mt-3 border border-red-200 bg-red-50 p-2 text-sm text-red-700">{cashError}</p>}
            {cashMessage && <p className="mt-3 border border-green-200 bg-green-50 p-2 text-sm text-green-700">{cashMessage}</p>}
          </div>
          {!cashSession ? <div className="flex items-end gap-2"><label className="text-xs text-gray-500">Saldo inicial<input type="number" min="0" step="0.01" value={cashOpenAmount} onChange={(event) => setCashOpenAmount(event.target.value)} className={`${input} mt-1 w-32`} /></label><button type="button" onClick={() => void openCash()} disabled={cashBusy || Number(cashOpenAmount) < 0} className="inline-flex items-center gap-2 bg-gray-900 px-3 py-2.5 text-sm font-medium text-white disabled:opacity-50">Abrir caja</button></div> : cashSession.usuario_id === user?.id ? <div className="w-full max-w-xl"><p className="text-xs text-gray-500">Cierre por denominaciones</p><div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">{Object.keys(cashCounts).map((key) => <label key={key} className="text-[10px] text-gray-500">{key === "monedas" ? "Monedas" : key.toUpperCase()}<input type="number" min="0" step="1" value={cashCounts[key as keyof typeof cashCounts]} onChange={(event) => setCashCounts({ ...cashCounts, [key]: event.target.value })} className={`${input} mt-1 px-2`} /></label>)}</div><button type="button" onClick={() => void closeCash()} disabled={cashBusy} className="mt-3 border border-gray-300 px-3 py-2 text-sm font-medium disabled:opacity-50">Cerrar caja</button></div> : <p className="text-sm text-gray-500">El cierre corresponde al responsable de apertura o a un administrador.</p>}
        </div>
      </section>
      {loading ? (
        <State>Cargando catálogo y clientes...</State>
      ) : (
        <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <div className="altix-vendor-surface p-4">
              <label className="block text-sm font-medium text-gray-700">Cliente</label>
              <div className="relative mt-2">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  required
                  value={clientSearch || selectedClient?.nombre || ""}
                  onChange={(event) => {
                    setClientSearch(event.target.value);
                    setClientId("");
                  }}
                  placeholder="Buscar cliente por nombre, NIT o teléfono"
                  className={`${input} pl-9`}
                />
              </div>
              {clientSearch && !clientId && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200">
                  {availableClients.map((client) => (
                    <button
                      type="button"
                      key={client.id}
                      onClick={() => {
                        setClientId(client.id);
                        setClientSearch("");
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                    >
                      {client.nombre}
                      <span className="ml-2 text-xs text-gray-500">
                        {client.nit_dpi ?? "Sin NIT"}
                        {client.es_mayorista ? " · Mayorista" : ""}
                      </span>
                    </button>
                  ))}
                  {availableClients.length === 0 && (
                    <p className="p-3 text-sm text-gray-500">No hay clientes coincidentes.</p>
                  )}
                </div>
              )}
            </div>
            <div className="border border-gray-200 bg-white p-4">
              <label className="block text-sm font-medium text-gray-700">Producto</label>
              <div className="relative mt-2">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  value={productSearch}
                  onChange={(event) => {
                    setProductSearch(event.target.value);
                    setProductId("");
                  }}
                  placeholder="Buscar por SKU o nombre"
                  className={`${input} pl-9`}
                />
              </div>
              {productSearch && !productId && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200">
                  {availableProducts.map((product) => (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => {
                        setProductId(product.id);
                        setProductSearch(product.nombre);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <ProductImage product={product as ProductImageSource} alt={product.nombre} className="h-16 w-16 rounded-lg" />
                        <span className="min-w-0"><strong>{product.nombre}</strong><span className="ml-2 text-xs text-gray-500">{product.sku}</span></span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-medium">
                          {pricePerUnit(
                            selectedClient?.es_mayorista
                              ? product.precio_mayorista
                              : product.precio_base,
                            product.unidad_venta,
                          )}
                        </span>
                        <span className="block text-xs text-gray-500">Stock {formatQuantity(product.stock, product.unidad_venta)}</span>
                      </span>
                    </button>
                  ))}
                  {availableProducts.length === 0 && (
                    <p className="p-3 text-sm text-gray-500">No hay productos disponibles.</p>
                  )}
                </div>
              )}
              {selectedProduct && (
                <div className="mt-3 flex flex-col gap-3 rounded-lg border-t border-gray-100 pt-3 sm:flex-row sm:items-end"><ProductImage product={selectedProduct as ProductImageSource} alt={selectedProduct.nombre} className="h-20 w-20 rounded-lg" />
                  <label className="flex-1 text-sm">
                    Cantidad
                    <input
                      required
                      min="1"
                      max={selectedProduct.stock}
                      step={unitStep(selectedProduct.unidad_venta)}
                      inputMode={unitAllowsFraction(selectedProduct.unidad_venta) ? "decimal" : "numeric"}
                      type="number"
                      value={quantity}
                      onChange={(event) => setQuantity(Number(event.target.value))}
                      className={`${input} mt-1`}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={quantity <= 0 || quantity > selectedProduct.stock}
                    className="altix-vendor-button altix-vendor-primary disabled:opacity-40"
                  >
                    <Plus size={16} /> Agregar
                  </button>
                </div>
              )}
            </div>
            <div className="altix-vendor-surface">
              <div className="border-b border-gray-200 px-4 py-3">
                <h2 className="font-semibold text-gray-950">Detalle de venta</h2>
              </div>
              {cart.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-500">
                  Agrega productos para comenzar.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {cart.map((item) => (
                    <div key={item.producto_id} className="flex items-center gap-3 p-4">
                      <ProductImage product={products.find((product) => product.id === item.producto_id) as ProductImageSource | undefined} alt={item.nombre} className="h-16 w-16 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {item.sku} · {pricePerUnit(item.precio_unitario, item.unidad_venta)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Reducir cantidad"
                          onClick={() => changeQuantity(item.producto_id, item.unidad_venta === "metro" || item.unidad_venta === "yarda" ? -0.001 : -1)}
                          className="min-h-11 min-w-11 p-1.5 text-gray-500 hover:bg-gray-100"
                        >
                          <Minus size={15} />
                        </button>
                        <span className="min-w-16 text-center text-sm">{formatQuantity(item.cantidad, item.unidad_venta)}</span>
                        <button
                          type="button"
                          title="Aumentar cantidad"
                          disabled={item.cantidad >= item.stock}
                          onClick={() => changeQuantity(item.producto_id, item.unidad_venta === "metro" || item.unidad_venta === "yarda" ? 0.001 : 1)}
                          className="min-h-11 min-w-11 p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                      <span className="w-20 text-right text-sm font-medium">
                        {money(item.cantidad * item.precio_unitario)}
                      </span>
                      <button
                        type="button"
                        title="Quitar producto"
                        onClick={() =>
                          setCart((previous) =>
                            previous.filter((entry) => entry.producto_id !== item.producto_id),
                          )
                        }
                        className="p-1.5 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <aside className="altix-vendor-surface h-fit space-y-4 p-4 sm:p-5 lg:sticky lg:top-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Total</p>
              <p className="mt-2 text-3xl font-semibold text-gray-950">{money(total)}</p>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500">Forma de pago</p>
              <select
                value={paymentType}
                onChange={(event) => setPaymentType(event.target.value as "efectivo" | "credito")}
                className={`${input} mt-2`}
              >
                <option value="efectivo">Efectivo</option>
                {selectedClient?.es_mayorista && <option value="credito">Crédito mayorista</option>}
              </select>
              {paymentType === "credito" && (
                <p className="mt-2 text-xs text-gray-500">
                  Autorizado {money(selectedClient?.monto_autorizado)} · La disponibilidad final la
                  valida PostgreSQL.
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting || cart.length === 0 || !clientId}
              className="altix-vendor-button altix-vendor-primary w-full disabled:opacity-50"
            >
              <ShoppingCart size={17} />
              {submitting ? "Procesando…" : "Confirmar venta"}
            </button>
          </aside>
        </form>
      )}
    </Frame>
  );
};

const resourceConfig: Record<
  string,
  { title: string; description: string; columns: Array<[string, string]> }
> = {
  ventas: {
    title: "Mis ventas",
    description: "Ventas registradas por tu usuario.",
    columns: [
      ["Folio", "id"],
      ["Fecha", "created_at"],
      ["Total", "total"],
      ["Cliente", "clientes"],
    ],
  },
  cotizaciones: {
    title: "Cotizaciones",
    description: "Consulta de cotizaciones asociadas a tu usuario.",
    columns: [
      ["Fecha", "created_at"],
      ["Cliente", "clientes"],
      ["Total", "total"],
      ["Estado", "estado"],
      ["Aprobación descuento", "aprobacion_descuento"],
    ],
  },
  pedidos: {
    title: "Pedidos",
    description: "Consulta de pedidos asociados a tu usuario.",
    columns: [
      ["Fecha", "created_at"],
      ["Cliente", "clientes"],
      ["Total", "total"],
      ["Saldo", "saldo_pendiente"],
      ["Estado", "estado"],
    ],
  },
  catalogo: {
    title: "Catálogo",
    description: "Productos activos disponibles para venta.",
    columns: [
      ["Imagen", "imagen"],
      ["SKU", "sku"],
      ["Producto", "nombre"],
      ["Precio", "precio_base"],
    ],
  },
  disenos: {
    title: "Diseños",
    description: "Biblioteca de diseños disponible para consulta.",
    columns: [
      ["Imagen", "archivo_url"],
      ["SKU", "sku"],
      ["Nombre", "nombre"],
      ["Categoría", "categorias"],
      ["Precio", "precio"],
      ["Cliente", "clientes"],
      ["Estado", "activo"],
    ],
  },
  extras: {
    title: "Extras",
    description: "Servicios adicionales activos.",
    columns: [
      ["Nombre", "nombre"],
      ["Precio", "precio_adicional"],
      ["Estado", "activo"],
    ],
  },
  inventario: {
    title: "Inventario",
    description: "Existencias disponibles en tu sucursal.",
    columns: [
      ["Producto", "productos"],
      ["Sucursal", "sucursales"],
      ["Stock", "stock"],
      ["Mínimo", "stock_minimo"],
    ],
  },
  credito: {
    title: "Crédito",
    description: "Cartera mayorista asociada a tus ventas. Solo lectura.",
    columns: [
      ["Cliente", "clientes"],
      ["Total", "monto_total"],
      ["Pagado", "monto_pagado"],
      ["Saldo", "saldo_pendiente"],
      ["Vencimiento", "fecha_vencimiento"],
      ["Estado", "estado"],
    ],
  },
  comision: {
    title: "Mi comisión",
    description: "Comisiones calculadas por PostgreSQL. Solo lectura.",
    columns: [
      ["Periodo", "periodo"],
      ["Venta", "monto_venta"],
      ["Porcentaje", "porcentaje_aplicado"],
      ["Comisión", "monto_comision"],
      ["Estado", "estado"],
    ],
  },
};

const DetailModal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/30 p-0 sm:items-center sm:p-4">
    <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto border border-gray-200 bg-white p-5 shadow-xl sm:max-h-[90vh]">
      <div className="mb-5 flex items-center justify-between border-b border-gray-200 pb-4">
        <h2 className="font-semibold text-gray-950">{title}</h2>
        <button
          type="button"
          title="Cerrar"
          onClick={onClose}
          className="p-1 text-gray-500 hover:bg-gray-100"
        >
          <X size={17} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const SignedImage: React.FC<{ path: unknown }> = ({ path }) => {
  const value = typeof path === "string" ? path : "";
  const [url, setUrl] = useState(value.startsWith("http") ? value : "");
  useEffect(() => { if (!value || value.startsWith("http")) return; let active = true; void getSignedR2Url(value).then((next) => { if (active) setUrl(next); }).catch(() => undefined); return () => { active = false; }; }, [value]);
  return url ? <img src={url} alt="Diseño" className="h-10 w-14 object-cover" /> : <span className="text-xs text-gray-400">—</span>;
};

const SaleDetail: React.FC<{ row: Row; onClose: () => void }> = ({ row, onClose }) => {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void supabase
      .from("venta_items")
      .select("cantidad,precio_unitario,subtotal,productos(nombre,sku,disenos(id,archivo_url))")
      .eq("venta_id", String(row.id))
      .then((result) => {
        if (!active) return;
        if (result.error)
          setError(friendlyAdminError(result.error, "No se pudo cargar el detalle."));
        else setItems((result.data ?? []) as Row[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [row.id]);
  return (
    <DetailModal title={`Venta #${shortId(row.id)}`} onClose={onClose}>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <dt className="text-gray-500">Fecha</dt>
        <dd className="text-right">{date(row.created_at)}</dd>
        <dt className="text-gray-500">Cliente</dt>
        <dd className="text-right">{display(row, "clientes")}</dd>
        <dt className="text-gray-500">Sucursal</dt>
        <dd className="text-right">{display(row, "sucursales")}</dd>
        <dt className="text-gray-500">Total</dt>
        <dd className="text-right text-lg font-semibold">{money(row.total)}</dd>
      </dl>
      <div className="mt-5 border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold">Productos</h3>
        {loading ? (
          <State>Cargando detalle...</State>
        ) : error ? (
          <p className="mt-3 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : items.length === 0 ? (
          <State>No hay productos asociados.</State>
        ) : (
          <div className="mt-3 divide-y divide-gray-100">
            {items.map((item, index) => {
              const product = item.productos as Row | undefined;
              return (
                <div
                  key={String(item.id ?? index)}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <div className="mb-2"><SignedImage path={product && Array.isArray(product.disenos) ? (product.disenos as Row[])[0]?.archivo_url : undefined} /></div>
                    <p className="font-medium">{String(product?.nombre ?? "Producto")}</p>
                    <p className="text-xs text-gray-500">
                      {String(product?.sku ?? "—")} · {item.cantidad as number} ×{" "}
                      {money(item.precio_unitario)}
                    </p>
                  </div>
                  <span className="font-medium">{money(item.subtotal)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DetailModal>
  );
};

const CommissionDetail: React.FC<{ row: Row; onClose: () => void }> = ({ row, onClose }) => (
  <DetailModal title="Detalle de comisión" onClose={onClose}>
    <dl className="grid grid-cols-2 gap-3 text-sm">
      <dt className="text-gray-500">Periodo</dt>
      <dd className="text-right">{String(row.periodo ?? "—")}</dd>
      <dt className="text-gray-500">Venta</dt>
      <dd className="text-right">{row.venta_id ? `#${shortId(row.venta_id)}` : "—"}</dd>
      <dt className="text-gray-500">Base de venta</dt>
      <dd className="text-right">{money(row.monto_venta)}</dd>
      <dt className="text-gray-500">Porcentaje</dt>
      <dd className="text-right">
        {row.porcentaje_aplicado != null ? `${row.porcentaje_aplicado}%` : "—"}
      </dd>
      <dt className="text-gray-500">Comisión</dt>
      <dd className="text-right text-lg font-semibold">{money(row.monto_comision)}</dd>
      <dt className="text-gray-500">Fecha</dt>
      <dd className="text-right">{date(row.created_at)}</dd>
      <dt className="text-gray-500">Estado</dt>
      <dd className="text-right">{String(row.estado ?? "—")}</dd>
    </dl>
  </DetailModal>
);

const QuoteActions: React.FC<{ row: Row; onDone: () => void }> = ({ row, onDone }) => {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("whatsapp");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accepted = row.cliente_acepto === true;
  const approvalState = String(row.aprobacion_descuento ?? "sin descuento");
  const discountReleased = approvalState === "sin descuento" || approvalState === "aprobada";
  const accept = async () => {
    setSaving(true); setError(null);
    try { await vendorService.registrarAceptacion({ p_cotizacion_id: String(row.id), p_metodo_aceptacion: method, p_nota_aceptacion: note || undefined }); setOpen(false); onDone(); }
    catch (err) { setError(friendlyAdminError(err, "No se pudo registrar la aceptación.")); }
    finally { setSaving(false); }
  };
  const convert = async () => {
    setSaving(true); setError(null);
    try { await vendorService.convertirCotizacion(String(row.id)); onDone(); }
    catch (err) { setError(friendlyAdminError(err, "No se pudo convertir la cotización.")); }
    finally { setSaving(false); }
  };
  const removeRejected = async () => {
    setSaving(true); setError(null);
    try { await vendorService.cancelarCotizacionRechazada(String(row.id)); onDone(); }
    catch (err) { setError(friendlyAdminError(err, "No se pudo eliminar la cotización rechazada.")); }
    finally { setSaving(false); }
  };
  if (approvalState === "rechazada") return <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-red-700">Descuento rechazado</span><button type="button" disabled={saving} onClick={() => void removeRejected()} className="text-xs font-medium text-red-700 disabled:opacity-50">{saving ? "Eliminando..." : "Eliminar cotización"}</button>{error && <span className="text-xs text-red-700">{error}</span>}</div>;
  return <div className="flex flex-wrap items-center gap-2">
    {approvalState !== "sin descuento" && <span className={`text-xs font-medium ${approvalState === "aprobada" ? "text-green-700" : approvalState === "pendiente" ? "text-amber-700" : "text-red-700"}`}>Descuento: {approvalState}</span>}
    {accepted ? <span className="text-xs font-medium text-green-700">Aceptada</span> : row.estado === "enviada" && <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-blue-700">Registrar aceptación</button>}
    {accepted && row.estado === "enviada" && discountReleased && <button type="button" disabled={saving} onClick={() => void convert()} className="text-xs font-medium text-blue-700 disabled:opacity-50">Convertir a pedido</button>}
    {error && <span className="text-xs text-red-700">{error}</span>}
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/30 p-4"><div className="w-full max-w-md border border-gray-200 bg-white p-5 shadow-xl"><div className="flex items-center justify-between"><h2 className="font-semibold">Registrar aceptación del cliente</h2><button type="button" title="Cerrar" onClick={() => setOpen(false)} className="text-gray-500">×</button></div><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-gray-500">Cliente</dt><dd>{display(row, "clientes")}</dd></div><div className="flex justify-between gap-3"><dt className="text-gray-500">Cotización</dt><dd>#{shortId(row.id)}</dd></div><div className="flex justify-between gap-3"><dt className="text-gray-500">Total</dt><dd>{money(row.total)}</dd></div></dl><label className="mt-4 block text-sm">Método<select value={method} onChange={(event) => setMethod(event.target.value)} className={`${input} mt-1`}><option value="whatsapp">WhatsApp</option><option value="llamada">Llamada</option><option value="presencial">Presencial</option><option value="otro">Otro</option></select></label><label className="mt-3 block text-sm">Nota<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className={`${input} mt-1`} /></label><button type="button" disabled={saving} onClick={() => void accept()} className="mt-4 w-full bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Guardando..." : "Confirmar aceptación"}</button></div></div>}
  </div>;
};

const VendorFinancialAction: React.FC<{ mode: "credit" | "advance"; row: Row; onDone: () => void }> = ({ mode, row, onDone }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<Array<{ id: string; fecha_apertura: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const branchId = typeof row.sucursal_id === "string" ? row.sucursal_id : (typeof row.ventas === "object" && row.ventas ? String((row.ventas as Row).sucursal_id ?? "") : "");
  useEffect(() => { if (!open || !branchId) return; void supabase.from("sesiones_caja").select("id,fecha_apertura").eq("sucursal_id", branchId).eq("estado", "abierta").order("fecha_apertura", { ascending: false }).then((result) => setSessions((result.data ?? []) as Array<{ id: string; fecha_apertura: string }>)); }, [open, branchId]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!user) return; setSaving(true); setError(null); const form = new FormData(event.currentTarget); const amount = Number(form.get("monto") ?? 0); const payment = String(form.get("forma_pago") ?? "efectivo") as "efectivo" | "tarjeta" | "transferencia" | "saldo_favor"; const sessionId = String(form.get("sesion_caja_id") ?? "");
    try {
      if (payment === "efectivo" && !sessionId) throw new Error("Selecciona una caja abierta para pagos en efectivo.");
      if (mode === "credit") await vendorService.registrarPago({ p_cuenta_cobrar_id: String(row.id), p_monto: amount, p_forma_pago: payment, p_referencia: String(form.get("referencia") ?? ""), p_registrado_por: user.id, ...(sessionId ? { p_sesion_caja_id: sessionId } : {}), p_operation_id: createOperationId("pago-credito") });
      else await vendorService.registrarAnticipo({ p_pedido_id: String(row.id), p_cliente_id: String(row.cliente_id), p_monto: amount, p_forma_pago: payment, p_comprobante_ref: String(form.get("referencia") ?? ""), p_registrado_por: user.id, ...(sessionId ? { p_sesion_caja_id: sessionId } : {}), p_operation_id: createOperationId("anticipo") });
      setOpen(false); onDone();
    } catch (err) { setError(friendlyAdminError(err, "No se pudo registrar la operación.")); } finally { setSaving(false); }
  };
  return <><button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-blue-700">{mode === "credit" ? "Registrar pago" : "Registrar anticipo"}</button>{open && <DetailModal title={mode === "credit" ? "Pago de crédito" : "Anticipo de pedido"} onClose={() => { if (!saving) setOpen(false); }}><form onSubmit={submit} className="space-y-3"><label className="block text-sm">Monto *<input name="monto" required min="0.01" max={String(row.saldo_pendiente ?? "")} step="0.01" type="number" className={`${input} mt-1`} /></label><label className="block text-sm">Forma de pago<select name="forma_pago" required className={`${input} mt-1`}><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option><option value="saldo_favor">Saldo a favor</option></select></label><label className="block text-sm">Caja abierta para efectivo<select name="sesion_caja_id" className={`${input} mt-1`}><option value="">Selecciona si es efectivo</option>{sessions.map((session) => <option key={session.id} value={session.id}>Caja abierta · {date(session.fecha_apertura)}</option>)}</select></label><label className="block text-sm">Referencia<input name="referencia" className={`${input} mt-1`} /></label>{error && <p className="border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}<button type="submit" disabled={saving} className="w-full bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Guardando..." : mode === "credit" ? "Registrar pago" : "Registrar anticipo"}</button></form></DetailModal>}</>;
};

const ConfirmOrderAction: React.FC<{ row: Row; onDone: () => void }> = ({ row, onDone }) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saldo = Number(row.saldo_pendiente ?? 0);
  if (['entregado', 'cancelado'].includes(String(row.estado)) || saldo > 0) {
    return saldo > 0 && !['entregado', 'cancelado'].includes(String(row.estado))
      ? <span className="text-xs text-gray-500">Pendiente de pago</span>
      : <span className="text-xs text-green-700">Venta finalizada</span>;
  }
  const confirm = async () => {
    if (!user) return;
    setSaving(true); setError(null);
    try {
      await vendorService.confirmarPedidoVenta({
        p_pedido_id: String(row.id),
        p_forma_pago: String(row.metodo_pago ?? 'efectivo') as Database['public']['Enums']['metodo_pago'],
        p_monto_recibido: 0,
        p_operation_id: createOperationId('confirmar-pedido'),
        p_confirmado_por: user.id,
      });
      onDone();
    } catch (err) {
      setError(friendlyAdminError(err, 'No se pudo confirmar la venta.'));
    } finally { setSaving(false); }
  };
  return <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={saving} onClick={() => void confirm()} className="text-xs font-medium text-blue-700 disabled:opacity-50">{saving ? 'Confirmando...' : 'Confirmar venta'}</button>{error && <span className="text-xs text-red-700">{error}</span>}</div>;
};
const loadResource = async (module: string, userId: string, branchId?: string) => {
  if (module === "ventas")
    return supabase
      .from("ventas")
      .select("*, clientes(nombre), sucursales(nombre)")
      .eq("vendedor_id", userId)
      .order("created_at", { ascending: false });
  if (module === "cotizaciones") {
    const result = await supabase
      .from("cotizaciones")
      .select("*, clientes(nombre), sucursales(nombre)")
      .eq("vendedor_id", userId)
      .neq("estado", "cancelada")
      .order("created_at", { ascending: false });
    if (result.error) return result;
    const quoteRows = (result.data ?? []) as Row[];
    const ids = quoteRows.map((row) => String(row.id));
    if (ids.length === 0) return { ...result, data: quoteRows };
    const approvals = await supabase.from("aprobaciones").select("referencia_id,estado").eq("tipo", "descuento").eq("referencia_tabla", "cotizaciones").in("referencia_id", ids).order("created_at", { ascending: false });
    if (approvals.error) return { ...result, data: null, error: approvals.error };
    const states = new Map<string, string>();
    (approvals.data ?? []).forEach((approval) => { if (approval.referencia_id && !states.has(approval.referencia_id)) states.set(approval.referencia_id, approval.estado); });
    return { ...result, data: quoteRows.map((row) => ({ ...row, aprobacion_descuento: states.get(String(row.id)) ?? "sin descuento" })) };
  }
  if (module === "pedidos")
    return supabase
      .from("pedidos")
      .select("*, clientes(nombre), sucursales(nombre)")
      .eq("vendedor_id", userId)
      .order("created_at", { ascending: false });
  if (module === "catalogo")
  {
    const [productResult, designResult] = await Promise.all([
      supabase.from("productos").select("*,archivos(path),disenos(archivo_url,archivo_id,archivos(path))").eq("activo", true).order("nombre"),
      supabase.from("disenos").select("id,sku,nombre,precio,activo,archivo_url,archivo_id,archivos(path)").eq("activo", true).order("nombre"),
    ]);
    const failed = [productResult, designResult].find((result) => result.error);
    if (failed?.error) return { data: null, error: failed.error };
    const products = (productResult.data ?? []) as Row[];
    const designs = (designResult.data ?? []) as Row[];
    return {
      data: [
        ...products,
        ...designs.map((design) => ({
          id: `design-${String(design.id)}`,
          sku: design.sku ?? "DISEÑO",
          nombre: design.nombre,
          precio_base: design.precio,
          catalogo_tipo: "Diseño",
          design_id: design.id,
          archivo_url: design.archivo_url,
          activo: design.activo,
        })),
      ],
      error: null,
    };
  }
  if (module === "disenos")
    return supabase
      .from("disenos")
      .select("*, clientes(nombre), categorias(nombre)")
      .eq("activo", true)
      .order("created_at", { ascending: false });
  if (module === "extras")
    return supabase.from("extras").select("*").eq("activo", true).order("nombre");
  if (module === "inventario")
  {
    if (!branchId) return { data: [], error: null };
    const [productResult, inventoryResult, branchResult] = await Promise.all([
      supabase.from("productos").select("id,nombre,sku,activo,archivo_id,archivos(path),disenos(id,archivo_url,archivo_id,archivos(path))").eq("activo", true).order("nombre"),
      supabase.from("inventarios").select("producto_id,stock,stock_minimo,stock_maximo").eq("sucursal_id", branchId),
      supabase.from("sucursales").select("id,nombre").eq("id", branchId).maybeSingle(),
    ]);
    const failed = [productResult, inventoryResult, branchResult].find((result) => result.error);
    if (failed?.error) return { data: null, error: failed.error };
    const inventory = new Map((inventoryResult.data ?? []).map((row) => [row.producto_id, row]));
    return {
      data: ((productResult.data ?? []) as Row[]).map((product) => {
        const stock = inventory.get(String(product.id));
        return { ...stock, producto_id: product.id, sucursal_id: branchId, productos: product, sucursales: branchResult.data ?? { id: branchId, nombre: "Sucursal activa" }, stock: stock?.stock ?? 0, stock_minimo: stock?.stock_minimo ?? 5, stock_maximo: stock?.stock_maximo ?? 1000 };
      }),
      error: null,
    };
  }
  if (module === "credito")
    return supabase
      .from("cuentas_cobrar")
      .select(
        "*, clientes(nombre,monto_autorizado,dias_credito), ventas!inner(vendedor_id,sucursal_id)",
      )
      .eq("ventas.vendedor_id", userId)
      .order("fecha_vencimiento");
  return supabase
    .from("comisiones")
    .select("*")
    .eq("vendedor_id", userId)
    .order("created_at", { ascending: false });
};

export const VendorListPage: React.FC<{ module: string }> = ({ module }) => {
  const { user, sucursalActiva } = useAuth();
  const navigate = useNavigate();
  const config = resourceConfig[module] ?? resourceConfig.catalogo;
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const result = await loadResource(module, user.id, sucursalActiva?.id);
    if (result.error) {
      setError(friendlyAdminError(result.error, "No se pudo cargar la información."));
      setRows([]);
    } else {
      setError(null);
      setRows((result.data ?? []) as Row[]);
    }
    setLoading(false);
  }, [module, sucursalActiva?.id, user]); // Initial remote fetch synchronizes this view with Supabase.
  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        Object.values(row).some((item) =>
          String(item ?? "")
            .toLowerCase()
            .includes(search.toLowerCase().trim()),
        ),
      ),
    [rows, search],
  );
  const canDetail = module === "ventas" || module === "comision";
  const canQuoteActions = module === "cotizaciones";
  const canFinancialActions = module === "credito" || module === "pedidos";
  const canAddToSale = module === "catalogo";
  if (module === "comision") return <VendorCommissionPage />;
  return (
    <Frame title={config.title} description={config.description} onRefresh={() => void load()}>
      <Notice error={error} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por los datos disponibles"
          className={`${input} pl-9`}
        />
      </div>
      {module === "cotizaciones" && <button type="button" onClick={() => navigate("/vendedor/cotizaciones/nueva")} className="inline-flex items-center justify-center gap-2 bg-blue-700 px-3 py-2 text-sm font-medium text-white"><Plus size={15} /> Nueva cotización</button>}
      </div>
      {loading ? (
        <State>Cargando información...</State>
      ) : filtered.length === 0 ? (
        <State>No hay registros para mostrar.</State>
      ) : (
        <>
        <div className="hidden overflow-x-auto border border-gray-200 bg-white md:block">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                {config.columns.map(([label]) => (
                  <th key={label} className="px-4 py-3">
                    {label}
                  </th>
                ))}
                {(canDetail || canAddToSale || canQuoteActions || canFinancialActions) && <th className="px-4 py-3">Acción</th>}
                {(module === "ventas" || module === "cotizaciones" || module === "pedidos") && <th className="px-4 py-3">Documento</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((row, index) => (
                <tr key={String(row.id ?? index)}>
                  {config.columns.map(([label, key]) => (
                    <td key={label} className="max-w-[250px] truncate px-4 py-3 text-gray-700">
                      {key === "imagen" ? <ProductImage product={row as ProductImageSource} alt={String(row.nombre ?? "Producto")} className="h-14 w-14" /> : key === "archivo_url" ? <SignedImage path={row[key]} /> : key === "productos" ? <div className="flex items-center gap-2"><ProductImage product={(row[key] as ProductImageSource) ?? null} alt={String((row[key] as Row)?.nombre ?? "Producto")} className="h-12 w-12" />{display(row, key)}</div> : key === "id"
                        ? `#${shortId(row[key])}`
                        : key === "monto_pagado"
                          ? money(Number(row.monto_total ?? 0) - Number(row.saldo_pendiente ?? 0))
                          : display(row, key)}
                    </td>
                  ))}
                  {canDetail && (
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setDetailRow(row)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                      >
                        <Eye size={14} /> Ver detalle
                      </button>
                    </td>
                  )}
                  {canAddToSale && !row.catalogo_tipo && (
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          navigate("/vendedor/venta", { state: { productId: row.id } })
                        }
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                      >
                        <ShoppingCart size={14} /> Agregar a venta
                      </button>
                    </td>
                  )}
                  {canQuoteActions && <td className="px-4 py-3"><QuoteActions row={row} onDone={() => void load()} /></td>}
                  {module === "credito" && <td className="px-4 py-3"><VendorFinancialAction mode="credit" row={row} onDone={() => void load()} /></td>}
                  {module === "pedidos" && <td className="px-4 py-3"><div className="space-y-2"><VendorFinancialAction mode="advance" row={row} onDone={() => void load()} /><ConfirmOrderAction row={row} onDone={() => void load()} /></div></td>}
                  {(module === "ventas" || module === "pedidos" || (module === "cotizaciones" && !["pendiente", "rechazada"].includes(String(row.aprobacion_descuento)))) && <td className="px-4 py-3"><PrintDocumentButton kind={module === "ventas" ? "sale" : module === "cotizaciones" ? "quotation" : "order"} documentId={String(row.id)} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-2.5 md:hidden">
          {filtered.map((row, index) => (
            <article key={String(row.id ?? index)} className="altix-vendor-card p-3 sm:p-4">
              <div className="space-y-1.5">
                {config.columns.slice(0, 4).map(([label, key]) => (
                  <div key={label} className="flex items-start justify-between gap-3 text-sm">
                    <span className={`shrink-0 text-xs uppercase tracking-wide text-gray-400 ${key === "imagen" || key === "productos" ? "sr-only" : ""}`}>{label}</span>
                    <span className={`min-w-0 text-right text-gray-700 ${key === "imagen" || key === "productos" ? "w-full text-left" : ""}`}>{key === "imagen" ? <ProductImage product={row as ProductImageSource} alt={String(row.nombre ?? "Producto")} className="h-20 w-20 rounded-lg" /> : key === "productos" ? <span className="flex items-center gap-3 text-left"><ProductImage product={(row[key] as ProductImageSource) ?? null} alt={String((row[key] as Row)?.nombre ?? "Producto")} className="h-16 w-16 rounded-lg" /><span><strong className="block text-gray-950">{String((row[key] as Row)?.nombre ?? "Producto")}</strong><span className="text-xs text-gray-500">SKU {String((row[key] as Row)?.sku ?? "—")}</span></span></span> : key === "archivo_url" ? <SignedImage path={row[key]} /> : key === "id" ? `#${shortId(row[key])}` : key === "monto_pagado" ? money(Number(row.monto_total ?? 0) - Number(row.saldo_pendiente ?? 0)) : display(row, key)}</span>
                  </div>
                ))}
              </div>
              {(canDetail || canAddToSale || canQuoteActions || canFinancialActions || module === "ventas" || module === "pedidos" || module === "cotizaciones") && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                {canDetail && <button type="button" onClick={() => setDetailRow(row)} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-blue-700"><Eye size={15} /> Ver detalle</button>}
                {canAddToSale && !row.catalogo_tipo && <button type="button" onClick={() => navigate("/vendedor/venta", { state: { productId: row.id } })} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-blue-700"><ShoppingCart size={15} /> Agregar</button>}
                {canQuoteActions && <QuoteActions row={row} onDone={() => void load()} />}
                {module === "credito" && <VendorFinancialAction mode="credit" row={row} onDone={() => void load()} />}
                {module === "pedidos" && <><VendorFinancialAction mode="advance" row={row} onDone={() => void load()} /><ConfirmOrderAction row={row} onDone={() => void load()} /></>}
                {(module === "ventas" || module === "pedidos" || (module === "cotizaciones" && !["pendiente", "rechazada"].includes(String(row.aprobacion_descuento)))) && <PrintDocumentButton kind={module === "ventas" ? "sale" : module === "cotizaciones" ? "quotation" : "order"} documentId={String(row.id)} />}
              </div>}
            </article>
          ))}
        </div>
        </>
      )}
      {detailRow && module === "ventas" && (
        <SaleDetail row={detailRow} onClose={() => setDetailRow(null)} />
      )}
      {detailRow && module === "comision" && (
        <CommissionDetail row={detailRow} onClose={() => setDetailRow(null)} />
      )}
    </Frame>
  );
};

const VendorCommissionPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Row | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const periodo = new Date().toISOString().slice(0, 7);
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const [monthly, ledger] = await Promise.all([
      supabase.rpc("obtener_comision_mensual_vendedor" as never, { p_vendedor_id: user.id, p_periodo: periodo } as never),
      supabase.from("comisiones").select("*, ventas(id, total, clientes(nombre))").eq("vendedor_id", user.id).eq("periodo", periodo).order("created_at", { ascending: false }),
    ]);
    if (monthly.error || ledger.error) setError(friendlyAdminError(monthly.error ?? ledger.error, "No se pudo cargar el resumen mensual de comisión."));
    else { setSummary((monthly.data ?? null) as Row | null); setRows((ledger.data ?? []) as Row[]); }
    setLoading(false);
  }, [periodo, user]);
  useEffect(() => { void load(); }, [load]);
  const value = (key: string) => Number(summary?.[key] ?? 0);
  return <Frame title="Mi comisión" description="Cierre mensual basado en ventas elegibles, devoluciones y ledger." onRefresh={() => void load()}><Notice error={error} />{loading ? <State>Cargando comisión mensual...</State> : <><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="altix-vendor-card p-4"><p className="text-xs uppercase text-gray-500">Ventas elegibles</p><p className="mt-1 text-xl font-semibold">{money(value("ventas_finales_elegibles"))}</p></div><div className="altix-vendor-card p-4"><p className="text-xs uppercase text-gray-500">Rango actual</p><p className="mt-1 text-xl font-semibold">{value("porcentaje_actual").toFixed(2)}%</p></div><div className="altix-vendor-card p-4"><p className="text-xs uppercase text-gray-500">Comisión acumulada</p><p className="mt-1 text-xl font-semibold">{money(value("comision_ledger"))}</p></div><div className="altix-vendor-card p-4"><p className="text-xs uppercase text-gray-500">Faltan para siguiente</p><p className="mt-1 text-xl font-semibold">{summary?.siguiente_umbral ? money(value("faltante_siguiente")) : "—"}</p></div></div><div className="altix-vendor-surface p-4 text-sm"><p className="text-gray-500">Periodo {periodo}</p><p className="mt-1">Siguiente nivel: {summary?.siguiente_umbral ? `${money(value("siguiente_umbral"))} → ${value("siguiente_porcentaje").toFixed(2)}%` : "Nivel máximo alcanzado"}</p><p className="mt-1 text-gray-500">Devoluciones descontadas: {money(value("devoluciones"))}</p></div><section className="altix-vendor-surface overflow-x-auto"><div className="border-b border-gray-100 px-4 py-3"><h2 className="font-semibold">Ledger del mes</h2></div><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Venta</th><th className="px-4 py-3">Base</th><th className="px-4 py-3">%</th><th className="px-4 py-3">Comisión</th><th className="px-4 py-3">Estado</th></tr></thead><tbody className="divide-y divide-gray-100">{rows.map((row) => <tr key={String(row.id)}><td className="px-4 py-3">{date(row.created_at)}</td><td className="px-4 py-3">#{shortId(row.venta_id)}</td><td className="px-4 py-3">{money(row.monto_venta)}</td><td className="px-4 py-3">{String(row.porcentaje_aplicado ?? 0)}%</td><td className="px-4 py-3 font-medium">{money(row.monto_comision)}</td><td className="px-4 py-3">{String(row.estado ?? "—")}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="p-6 text-center text-sm text-gray-500">Aún no hay comisiones registradas para este periodo.</p>}</section></>}</Frame>;
};

export const VendorClientsPage: React.FC = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [wholesale, setWholesale] = useState(false);
  const load = useCallback(async () => {
    const result = await supabase.from("clientes").select("*").order("nombre");
    if (result.error)
      setError(friendlyAdminError(result.error, "No se pudieron cargar los clientes."));
    else setClients((result.data ?? []) as Client[]);
  }, []); // Initial remote fetch synchronizes this view with Supabase.
  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const needle = search.trim().replace(/[%,()]/g, " ").replace(/\s+/g, " ");
    if (!needle) return;
    void supabase
      .from("clientes")
      .select("*")
      .or(`nombre.ilike.%${needle}%,nit_dpi.ilike.%${needle}%,telefono.ilike.%${needle}%`)
      .order("nombre")
      .limit(100)
      .then((result) => {
        if (result.error) setError(friendlyAdminError(result.error, "No se pudieron buscar los clientes."));
        else setClients((result.data ?? []) as Client[]);
      });
  }, [search]);
  const filtered = clients.filter((client) =>
    `${client.nombre} ${client.nit_dpi ?? ""} ${client.telefono ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const isWholesale = form.get("es_mayorista") === "on";
      const requested = Number(form.get("monto_solicitado") ?? 0);
      if (isWholesale && (!Number.isFinite(requested) || requested <= 0)) throw new Error("Indica el monto solicitado de crédito para un cliente mayorista.");
      await (isWholesale
        ? vendorService.crearClienteMayorista({ p_nombre: String(form.get("nombre") ?? "").trim(), p_nit_dpi: String(form.get("nit_dpi") ?? "").trim(), p_telefono: String(form.get("telefono") ?? "").trim(), p_direccion: String(form.get("direccion") ?? "").trim(), p_monto_solicitado: requested, p_solicitado_por: user?.id ?? "" })
        : vendorService.crearCliente({ nombre: String(form.get("nombre") ?? "").trim(), nit_dpi: String(form.get("nit_dpi") ?? "").trim(), telefono: String(form.get("telefono") ?? "").trim(), direccion: String(form.get("direccion") ?? "").trim(), es_mayorista: false }));
      setOpen(false);
      setSuccess("Cliente creado correctamente.");
      await load();
    } catch (err) {
      setError(friendlyAdminError(err, "No se pudo crear el cliente."));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Frame
      title="Clientes"
      description="Consulta y alta de clientes con el contrato de inserción disponible."
      onRefresh={() => void load()}
    >
      <Notice error={error} success={success} />
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar nombre, NIT o teléfono"
            className={`${input} pl-9`}
          />
        </div>
        <button
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
        >
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>
      {filtered.length === 0 ? (
        <State>No hay clientes registrados.</State>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => (
            <article key={client.id} className="border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium text-gray-950">{client.nombre}</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {client.es_mayorista ? "Cliente mayorista" : "Cliente final"}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {client.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
              <dl className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">NIT / DPI</dt>
                  <dd>{client.nit_dpi ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Teléfono</dt>
                  <dd>{client.telefono ?? "—"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/30 p-4">
          <form
            onSubmit={save}
            className="w-full max-w-md space-y-4 border border-gray-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-950">Nuevo cliente</h2>
              <button
                type="button"
                title="Cerrar"
                disabled={saving}
                onClick={() => setOpen(false)}
                className="p-1 text-gray-500 hover:bg-gray-100"
              >
                <X size={17} />
              </button>
            </div>
            <label className="block text-sm">
              Nombre *<input name="nombre" required className={`${input} mt-1`} />
            </label>
            <label className="block text-sm">
              NIT / DPI
              <input name="nit_dpi" className={`${input} mt-1`} />
            </label>
            <label className="block text-sm">
              Teléfono
              <input name="telefono" className={`${input} mt-1`} />
            </label>
            <label className="block text-sm">
              Dirección
              <input name="direccion" className={`${input} mt-1`} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="es_mayorista" type="checkbox" checked={wholesale} onChange={(event) => setWholesale(event.target.checked)} /> Cliente mayorista
            </label>
            {wholesale && <label className="block text-sm">Monto solicitado de crédito *<input name="monto_solicitado" required min="0.01" step="0.01" type="number" className={`${input} mt-1`} /></label>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setOpen(false)}
                className="border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar cliente"}
              </button>
            </div>
          </form>
        </div>
      )}
    </Frame>
  );
};

export const VendorExpensePage: React.FC = () => {
  const { user, sucursalActiva } = useAuth();
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<Array<{ id: string; fecha_apertura: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const load = useCallback(async () => { if (!sucursalActiva) return; const result = await supabase.from("sesiones_caja").select("id,fecha_apertura").eq("sucursal_id", sucursalActiva.id).eq("estado", "abierta").order("fecha_apertura", { ascending: false }); if (result.error) setError(friendlyAdminError(result.error, "No se pudo consultar la caja abierta.")); else { const list = (result.data ?? []) as Array<{ id: string; fecha_apertura: string }>; setSessions(list); setSessionId(list[0]?.id ?? ""); } }, [sucursalActiva]);
  useEffect(() => { void load(); }, [load]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!user || !sucursalActiva || !sessionId) { setError("Necesitas una caja abierta en tu sucursal para registrar un gasto."); return; } setSaving(true); setError(null); setSuccess(null); const form = new FormData(event.currentTarget); try { await vendorService.registrarGasto({ p_sesion_caja_id: sessionId, p_sucursal_id: sucursalActiva.id, p_categoria: String(form.get("categoria") ?? "").trim(), p_monto: Number(form.get("monto") ?? 0), p_descripcion: String(form.get("descripcion") ?? "").trim(), p_comprobante_url: String(form.get("comprobante_url") ?? "").trim(), p_registrado_por: user.id, p_observacion: String(form.get("observacion") ?? "").trim() || undefined, p_operation_id: createOperationId("gasto") }); setSuccess("Gasto registrado y enviado al centro de aprobaciones."); event.currentTarget.reset(); await load(); } catch (err) { setError(friendlyAdminError(err, "No se pudo registrar el gasto.")); } finally { setSaving(false); } };
  return <Frame title="Registrar gasto" description="Los gastos del vendedor quedan pendientes de aprobación y nunca se eliminan silenciosamente." onRefresh={() => void load()}><Notice error={error} success={success} /><form onSubmit={submit} className="max-w-xl space-y-4 border border-gray-200 bg-white p-5"><label className="block text-sm">Caja abierta *<select required value={sessionId} onChange={(event) => setSessionId(event.target.value)} className={`${input} mt-1`}><option value="">Selecciona una caja</option>{sessions.map((session) => <option key={session.id} value={session.id}>Caja abierta · {date(session.fecha_apertura)}</option>)}</select></label><label className="block text-sm">Categoría *<input name="categoria" required className={`${input} mt-1`} /></label><label className="block text-sm">Monto *<input name="monto" required min="0.01" step="0.01" type="number" className={`${input} mt-1`} /></label><label className="block text-sm">Concepto *<textarea name="descripcion" required rows={2} className={`${input} mt-1`} /></label><label className="block text-sm">Observación<textarea name="observacion" rows={2} className={`${input} mt-1`} /></label><label className="block text-sm">Comprobante URL<input name="comprobante_url" type="url" className={`${input} mt-1`} /></label><button type="submit" disabled={saving || !sessionId} className="bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Enviando..." : "Enviar gasto"}</button></form></Frame>;
};
