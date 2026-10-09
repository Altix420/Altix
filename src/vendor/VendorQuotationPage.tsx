import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, CircleAlert, Plus, Save, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/hooks/useAuth";
import { friendlyAdminError } from "../admin/admin.errors";
import { supabase } from "../shared/lib/supabase";
import type { Json } from "../shared/types/database.types";
import { vendorService } from "./vendor.service";
import { formatQuantity, isValidUnitQuantity, parseSalesPrice, parseSalesQuantity, pricePerUnit, unitAllowsFraction, unitMin, unitStep, type SalesUnit } from "../shared/units";
import { ProductImage, type ProductImageSource } from "../shared/product-images";
import { extraPrice, normalizeExtra, type ExtraRecord } from "../shared/extras";

type Client = { id: string; nombre: string; nit_dpi: string | null; es_mayorista: boolean | null };
type Product = { id: string; sku: string; nombre: string; precio_base: number; precio_mayorista: number; unidad_venta: SalesUnit; archivo_id: string | null; archivos?: { path?: string | null } | null; disenos?: Array<{ archivo_url?: string | null; archivos?: { path?: string | null } | null }> | null };
type Design = { id: string; nombre: string; precio: number; producto_id: string | null; archivo_url?: string | null; archivos?: { path?: string | null } | null };
type QuoteLine = {
  producto_id: string;
  diseno_id: string;
  extra_ids: string[];
  cantidad: number | string;
  precio_unitario: number;
  precio_negociado: number | string;
  precio_oficial: number;
  descuento: number;
  observaciones: string;
  unidad_venta: SalesUnit;
};
const input = "w-full border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600";
const money = (value: number) => `Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;

export const VendorQuotationPage: React.FC = () => {
  const { user, sucursalActiva } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [extras, setExtras] = useState<ExtraRecord[]>([]);
  const [approvalReason, setApprovalReason] = useState("");
  const [clientId, setClientId] = useState("");
  const [payment, setPayment] = useState<"efectivo" | "credito">("efectivo");
  const [validUntil, setValidUntil] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [observations, setObservations] = useState("");
  const [line, setLine] = useState<QuoteLine>({ producto_id: "", diseno_id: "", extra_ids: [], cantidad: "1", precio_unitario: 0, precio_negociado: "0", precio_oficial: 0, descuento: 0, observaciones: "", unidad_venta: "unidad" });
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showClient, setShowClient] = useState(false);
  const [newClient, setNewClient] = useState({ nombre: "", nit_dpi: "", telefono: "", direccion: "", es_mayorista: false, monto_solicitado: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      supabase.from("clientes").select("id,nombre,nit_dpi,es_mayorista").eq("activo", true).order("nombre"),
      supabase.from("productos").select("id,sku,nombre,precio_base,precio_mayorista,unidad_venta,archivo_id,archivos(path),disenos(archivo_url,archivo_id,archivos(path))").eq("activo", true).order("nombre"),
      supabase.from("disenos").select("id,nombre,precio,producto_id,archivo_url,archivo_id,archivos(path)").eq("activo", true).order("nombre"),
      supabase.from("extras").select("id,nombre,precio_adicional,activo").eq("activo", true).order("nombre"),
    ]).then(([clientRows, productRows, designRows, extraRows]) => {
      if (!active) return;
      const failed = [clientRows, productRows, designRows, extraRows].find((result) => result.error);
      if (failed?.error) setError(friendlyAdminError(failed.error, "No se pudo cargar el formulario."));
      else {
        setClients((clientRows.data ?? []) as Client[]);
        setProducts((productRows.data ?? []) as Product[]);
        setDesigns((designRows.data ?? []) as Design[]);
        setExtras((extraRows.data ?? []).map((extra) => normalizeExtra(extra)).filter((extra): extra is ExtraRecord => extra !== null));
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const selectedClient = clients.find((client) => client.id === clientId);
  const selectedLineProduct = products.find((product) => product.id === line.producto_id);
  const selectedLineDesign = designs.find((design) => design.id === line.diseno_id);
  const total = useMemo(() => lines.reduce((sum, item) => sum + Number(item.cantidad) * item.precio_oficial - item.descuento, 0), [lines]);
  const totalDiscount = useMemo(() => lines.reduce((sum, item) => sum + item.descuento, 0), [lines]);
  const getOfficialPrice = (productId: string, designId: string, extraIds: string[], client = selectedClient) => {
    const product = products.find((item) => item.id === productId);
    const design = designs.find((item) => item.id === designId);
    const productPrice = product ? (client?.es_mayorista ? product.precio_mayorista : product.precio_base) : 0;
    const basePrice = design ? design.precio : productPrice;
    const extraTotal = extraIds.reduce((sum, extraId) => sum + (extraPrice(extras, extraId) ?? 0), 0);
    return Number((basePrice + extraTotal).toFixed(2));
  };
  const chooseProduct = (productId: string) => {
    const official = getOfficialPrice(productId, line.diseno_id, line.extra_ids);
    setLine((current) => ({ ...current, producto_id: productId, unidad_venta: products.find((product) => product.id === productId)?.unidad_venta ?? "unidad", precio_unitario: official, precio_negociado: official, precio_oficial: official, descuento: 0 }));
  };
  const chooseDesign = (designId: string) => {
    const design = designs.find((item) => item.id === designId);
    const productId = design?.producto_id ?? line.producto_id;
    const unit = products.find((product) => product.id === productId)?.unidad_venta ?? "unidad";
    const official = getOfficialPrice(productId, designId, line.extra_ids);
    setLine((current) => ({ ...current, producto_id: productId, diseno_id: designId, unidad_venta: unit, precio_unitario: official, precio_negociado: String(official), precio_oficial: official, descuento: 0 }));
  };
  const chooseClient = (nextClientId: string) => {
    const nextClient = clients.find((client) => client.id === nextClientId);
    setClientId(nextClientId);
    setLine((current) => {
      if (!current.producto_id && !current.diseno_id && current.extra_ids.length === 0) return current;
      const official = getOfficialPrice(current.producto_id, current.diseno_id, current.extra_ids, nextClient);
      return { ...current, precio_unitario: official, precio_negociado: official, precio_oficial: official, descuento: 0 };
    });
  };
  const addLine = () => {
    setError(null);
    const lineNumber = lines.length + 1;
    const quantity = parseSalesQuantity(line.cantidad, line.unidad_venta);
    const negotiated = parseSalesPrice(line.precio_negociado);
    if (!line.producto_id && !line.diseno_id && line.extra_ids.length === 0) return setError(`Línea ${lineNumber}: selecciona un producto, diseño o extra.`);
    if (quantity === null) return setError(line.unidad_venta === "vara" ? `Línea ${lineNumber}: la cantidad en vara debe ser múltiplo de 0.25 (ej. 1.25).` : unitAllowsFraction(line.unidad_venta) ? `Línea ${lineNumber}: indica una cantidad decimal válida.` : `Línea ${lineNumber}: la cantidad para ${line.unidad_venta} debe ser entera.`);
    if (negotiated === null || negotiated < 0) return setError(`Línea ${lineNumber}: indica un precio negociado válido.`);
    if (negotiated > line.precio_oficial) return setError(`Línea ${lineNumber}: el precio negociado no puede superar el precio oficial.`);
    if (line.precio_oficial < 0) return setError(`Línea ${lineNumber}: el precio oficial no es válido.`);
    if (line.descuento > quantity * line.precio_oficial) return setError(`Línea ${lineNumber}: el descuento no puede superar el subtotal.`);
    setLines((current) => [...current, { ...line, cantidad: quantity, precio_negociado: negotiated }]);
    setLine({ producto_id: "", diseno_id: "", extra_ids: [], cantidad: "1", precio_unitario: 0, precio_negociado: "0", precio_oficial: 0, descuento: 0, observaciones: "", unidad_venta: "unidad" });
  };
  const createClient = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError(null);
    if (!newClient.nombre.trim()) { setError("El nombre del cliente es obligatorio."); return; }
    try {
      const requestedCredit = Number(newClient.monto_solicitado || 0);
      if (newClient.es_mayorista && (!Number.isFinite(requestedCredit) || requestedCredit <= 0)) { setError("Indica el monto solicitado de crédito para un cliente mayorista."); return; }
      const id = newClient.es_mayorista
        ? await vendorService.crearClienteMayorista({ p_nombre: newClient.nombre.trim(), p_nit_dpi: newClient.nit_dpi, p_telefono: newClient.telefono, p_direccion: newClient.direccion, p_monto_solicitado: requestedCredit, p_solicitado_por: user?.id ?? "" })
        : await vendorService.crearCliente({ ...newClient, nombre: newClient.nombre.trim() });
      const created = { id, nombre: newClient.nombre.trim(), nit_dpi: newClient.nit_dpi || null, es_mayorista: newClient.es_mayorista };
      setClients((current) => [...current, created].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setClientId(id);
      setShowClient(false);
      setNewClient({ nombre: "", nit_dpi: "", telefono: "", direccion: "", es_mayorista: false, monto_solicitado: "" });
    } catch (err) { setError(friendlyAdminError(err, "No se pudo crear el cliente.")); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null); setMessage(null);
    if (!user || !sucursalActiva || !clientId || lines.length === 0 || total <= 0) { setError("Selecciona cliente y agrega al menos una línea con total mayor a cero."); return; }
    const invalidLine = lines.findIndex((item) => !isValidUnitQuantity(Number(item.cantidad), item.unidad_venta));
    if (invalidLine >= 0) { setError(`Línea ${invalidLine + 1}: la cantidad no es válida para ${lines[invalidLine].unidad_venta}.`); return; }
    if (payment === "credito" && !selectedClient?.es_mayorista) { setError("El crédito solo está disponible para clientes mayoristas."); return; }
    if (totalDiscount > 0 && !approvalReason.trim()) { setError("Indica el motivo del descuento para solicitar aprobación."); return; }
    setSubmitting(true);
    try {
      const id = await vendorService.crearCotizacion({
        p_sucursal_id: sucursalActiva.id,
        p_cliente_id: clientId,
        p_vendedor_id: user.id,
        p_total: Number(total.toFixed(2)),
        p_valida_hasta: validUntil || undefined,
        p_observaciones: observations || undefined,
        p_metodo_pago: payment,
        p_items: lines.map((item) => ({
          producto_id: item.producto_id || null,
          diseno_id: item.diseno_id || null,
          extras: item.extra_ids.map((extraId) => ({
            extra_id: extraId,
            precio_adicional: extraPrice(extras, extraId),
          })),
          cantidad: item.cantidad,
          unidad_venta: item.unidad_venta,
          precio_unitario: item.precio_oficial,
          descuento: item.descuento,
          observaciones: item.observaciones,
          subtotal: Number((Number(item.cantidad) * item.precio_oficial - item.descuento).toFixed(2)),
          snapshot_economico: {
            producto: products.find((product) => product.id === item.producto_id)?.nombre ?? null,
            diseno: designs.find((design) => design.id === item.diseno_id)?.nombre ?? null,
            extras: item.extra_ids.map((extraId) => ({
              id: extraId,
              nombre: extras.find((extra) => extra.id === extraId)?.nombre ?? null,
              precio_adicional: extraPrice(extras, extraId),
            })),
            unidad_venta: item.unidad_venta,
            precio_base_unitario: Number((item.precio_oficial - item.extra_ids.reduce((sum, extraId) => sum + (extraPrice(extras, extraId) ?? 0), 0)).toFixed(2)),
            precio_oficial: item.precio_oficial,
            precio_negociado: Number(item.precio_negociado),
            total_linea_oficial: Number((Number(item.cantidad) * item.precio_oficial).toFixed(2)),
            total_linea_negociado: Number((Number(item.cantidad) * item.precio_oficial - item.descuento).toFixed(2)),
            descuento_total: item.descuento,
          },
        })) as unknown as Json,
        ...(totalDiscount > 0 ? { p_motivo_aprobacion: approvalReason.trim() } : {}),
      });
      setMessage(totalDiscount > 0
        ? `Cotización #${id.slice(0, 8).toUpperCase()} guardada. La solicitud de descuento quedó pendiente de revisión administrativa.`
        : `Cotización #${id.slice(0, 8).toUpperCase()} guardada correctamente.`);
      setLines([]); setObservations(""); setApprovalReason("");
    } catch (err) { setError(friendlyAdminError(err, "No se pudo guardar la cotización.")); }
    finally { setSubmitting(false); }
  };
  if (loading) return <div className="border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">Cargando datos comerciales...</div>;
  return <section className="space-y-6">
    <header className="flex items-start justify-between gap-3 border-b border-gray-200 pb-5">
      <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Vendedor</p><h1 className="text-2xl font-semibold text-gray-950">Nueva cotización</h1><p className="mt-1 text-sm text-gray-500">Se guarda en Supabase sin reservar inventario.</p></div>
      <button type="button" onClick={() => navigate("/vendedor/cotizaciones")} className="inline-flex items-center gap-2 border border-gray-300 px-3 py-2 text-sm"><ArrowLeft size={16} /> Volver</button>
    </header>
    {error && <p className="flex items-start gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-700"><CircleAlert size={16} />{error}</p>}
    {message && <p className="flex items-start gap-2 border border-green-200 bg-green-50 p-3 text-sm text-green-700"><CheckCircle2 size={16} />{message}</p>}
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
      <div className="space-y-4">
        <div className="border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3"><label className="text-sm font-medium">Cliente *</label><button type="button" onClick={() => setShowClient((value) => !value)} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700"><UserPlus size={14} /> Nuevo cliente</button></div>
          <select required value={clientId} onChange={(event) => { chooseClient(event.target.value); if (payment === "credito" && !clients.find((item) => item.id === event.target.value)?.es_mayorista) setPayment("efectivo"); }} className={`${input} mt-2`}><option value="">Selecciona un cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nombre} · {client.nit_dpi ?? "Sin NIT"}{client.es_mayorista ? " · Mayorista" : ""}</option>)}</select>
          {showClient && <div className="mt-4 border-t border-gray-100 pt-4"><div className="grid gap-3 sm:grid-cols-2"><input required placeholder="Nombre *" value={newClient.nombre} onChange={(event) => setNewClient({ ...newClient, nombre: event.target.value })} className={input} /><input placeholder="NIT / DPI" value={newClient.nit_dpi} onChange={(event) => setNewClient({ ...newClient, nit_dpi: event.target.value })} className={input} /><input placeholder="WhatsApp" value={newClient.telefono} onChange={(event) => setNewClient({ ...newClient, telefono: event.target.value })} className={input} /><label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={newClient.es_mayorista} onChange={(event) => setNewClient({ ...newClient, es_mayorista: event.target.checked })} /> Cliente mayorista</label>{newClient.es_mayorista && <label className="text-sm sm:col-span-2">Monto solicitado de crédito<input required type="number" min="0.01" step="0.01" value={newClient.monto_solicitado} onChange={(event) => setNewClient({ ...newClient, monto_solicitado: event.target.value })} className={`${input} mt-1`} /></label>}<button type="button" onClick={() => void createClient()} className="inline-flex items-center justify-center gap-2 bg-gray-900 px-3 py-2 text-sm font-medium text-white sm:col-span-2"><UserPlus size={15} /> Guardar cliente</button></div></div>}
        </div>
        <div className="border border-gray-200 bg-white p-4">
          <h2 className="font-semibold">Agregar línea</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Producto<select value={line.producto_id} onChange={(event) => chooseProduct(event.target.value)} className={`${input} mt-1`}><option value="">Sin producto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.nombre}</option>)}</select></label>
            <label className="text-sm">Diseño oficial<select value={line.diseno_id} onChange={(event) => chooseDesign(event.target.value)} className={`${input} mt-1`}><option value="">Sin diseño</option>{designs.map((design) => <option key={design.id} value={design.id}>{design.nombre} · {money(design.precio)}</option>)}</select></label>
            {(selectedLineProduct || selectedLineDesign) && <div className="flex items-center gap-3 border border-gray-100 bg-gray-50 p-3 text-sm sm:col-span-2"><ProductImage product={(selectedLineProduct ?? selectedLineDesign) as ProductImageSource} alt={selectedLineProduct?.nombre ?? selectedLineDesign?.nombre ?? "Producto"} className="h-16 w-16" /><div><p className="font-medium">{selectedLineProduct?.nombre ?? selectedLineDesign?.nombre}</p><p className="text-xs text-gray-500">{selectedLineProduct?.sku ?? "Diseño"} · {pricePerUnit(line.precio_oficial, line.unidad_venta)}</p></div></div>}
            <fieldset className="text-sm sm:col-span-2"><legend>Extras adicionales</legend><div className="mt-1 grid gap-2 border border-gray-200 p-3 sm:grid-cols-2">{extras.map((extra) => <label key={extra.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={line.extra_ids.includes(extra.id)} onChange={(event) => { const extraIds = event.target.checked ? [...line.extra_ids, extra.id] : line.extra_ids.filter((id) => id !== extra.id); const official = getOfficialPrice(line.producto_id, line.diseno_id, extraIds); setLine({ ...line, extra_ids: extraIds, precio_unitario: official, precio_negociado: official, precio_oficial: official, descuento: 0 }); }} /><span>{extra.nombre} · {money(extra.precioAdicional)}</span></label>)}</div></fieldset>
            <label className="text-sm">Cantidad ({line.unidad_venta})<input type="text" min={unitMin(line.unidad_venta)} step={unitStep(line.unidad_venta)} inputMode="decimal" value={line.cantidad} onChange={(event) => { const raw = event.target.value; const cantidad = parseSalesQuantity(raw, line.unidad_venta); setLine({ ...line, cantidad: raw, descuento: cantidad === null ? 0 : Number(((line.precio_oficial - Number(String(line.precio_negociado).replace(',', '.') || 0)) * cantidad).toFixed(2)) }); }} className={`${input} mt-1`} /></label>
            <label className="text-sm">Precio oficial<input type="text" readOnly value={money(line.precio_oficial)} className={`${input} mt-1 bg-gray-50 text-gray-500`} /></label>
            <label className="text-sm">Precio negociado<input inputMode="decimal" type="text" min="0" step="0.01" value={line.precio_negociado} onChange={(event) => { const raw = event.target.value; const parsed = parseSalesPrice(raw); setLine({ ...line, precio_unitario: parsed ?? 0, precio_negociado: raw, descuento: parsed === null ? 0 : Number(((line.precio_oficial - parsed) * (parseSalesQuantity(line.cantidad, line.unidad_venta) ?? 0)).toFixed(2)) }); }} className={`${input} mt-1`} /></label>
            <label className="text-sm">Descuento total solicitado<input type="text" readOnly value={money(line.descuento)} className={`${input} mt-1 bg-gray-50 text-gray-500`} /></label>
            <label className="text-sm sm:col-span-2">Solicitud o detalle del diseño<textarea rows={2} value={line.observaciones} onChange={(event) => setLine({ ...line, observaciones: event.target.value })} placeholder="Para un diseño nuevo, describe aquí la solicitud." className={`${input} mt-1`} /></label>
          </div>
          <button type="button" onClick={addLine} className="mt-3 inline-flex items-center gap-2 border border-gray-300 px-3 py-2 text-sm font-medium"><Plus size={15} /> Agregar línea</button>
        </div>
        <div className="border border-gray-200 bg-white"><div className="flex items-center justify-between border-b border-gray-200 px-4 py-3"><h2 className="font-semibold">Detalle</h2><span className="text-xs text-gray-500">{lines.length} líneas</span></div>{lines.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">Agrega productos, diseños o extras.</p> : <div className="divide-y divide-gray-100">{lines.map((item, index) => { const product = products.find((candidate) => candidate.id === item.producto_id); const design = designs.find((candidate) => candidate.id === item.diseno_id); return <div key={`${item.producto_id}-${item.diseno_id}-${item.extra_ids.join("-")}-${index}`} className="flex items-start gap-3 p-4 text-sm"><ProductImage product={(product ?? design) as ProductImageSource | undefined} alt={product?.nombre ?? design?.nombre ?? "Línea"} className="h-16 w-16" /><div className="min-w-0 flex-1"><p className="font-medium">{product?.nombre ?? design?.nombre ?? "Línea"}</p><p className="text-xs text-gray-500">{product?.sku ?? "—"} · {formatQuantity(item.cantidad, item.unidad_venta)} × {pricePerUnit(item.precio_oficial, item.unidad_venta)}{item.extra_ids.length > 0 ? ` · ${item.extra_ids.length} extra(s)` : ""}{item.descuento > 0 ? ` · negociado ${money(Number(item.precio_negociado))} · descuento ${money(item.descuento)}` : ""}{item.observaciones ? ` · ${item.observaciones}` : ""}</p></div><span className="font-medium">{money(Number(item.cantidad) * item.precio_oficial - item.descuento)}</span><button type="button" title="Quitar línea" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="min-h-11 min-w-11 p-1 text-gray-400 hover:text-red-600"><X size={15} /></button></div>; })}</div>}</div>
      </div>
      <aside className="h-fit space-y-4 border border-gray-200 bg-white p-5 lg:sticky lg:top-6"><label className="block text-sm">Válida hasta<input required type="date" value={validUntil} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setValidUntil(event.target.value)} className={`${input} mt-1`} /></label><label className="block text-sm">Forma de pago<select value={payment} onChange={(event) => setPayment(event.target.value as "efectivo" | "credito")} className={`${input} mt-1`}><option value="efectivo">Efectivo / transferencia</option>{selectedClient?.es_mayorista && <option value="credito">Crédito mayorista</option>}</select></label><label className="block text-sm">Observaciones<textarea rows={3} value={observations} onChange={(event) => setObservations(event.target.value)} className={`${input} mt-1`} /></label>{totalDiscount > 0 && <div className="space-y-3 border-t border-gray-200 pt-4"><p className="text-sm font-semibold">Solicitud administrativa del descuento</p><p className="border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">La cotización se guarda primero y queda pendiente de aprobación. Administración debe aprobarla antes de convertirla en pedido.</p><textarea required rows={3} value={approvalReason} onChange={(event) => setApprovalReason(event.target.value)} placeholder="Motivo obligatorio del descuento" className={input} /></div>}<div className="border-t border-gray-200 pt-4"><p className="text-xs uppercase tracking-wide text-gray-400">Total</p><p className="mt-1 text-3xl font-semibold">{money(total)}</p></div><button type="submit" disabled={submitting || lines.length === 0 || !clientId} className="flex w-full items-center justify-center gap-2 bg-blue-700 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"><Save size={16} />{submitting ? "Guardando..." : totalDiscount > 0 ? "Guardar y solicitar autorización" : "Guardar cotización"}</button></aside>
    </form>
  </section>;
};
