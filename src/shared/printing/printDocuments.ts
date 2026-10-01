import { supabase } from "../lib/supabase";

export type PrintDocumentKind = "sale" | "quotation" | "order";
export type PrintWidth = "58mm" | "80mm" | "pdf";
type Row = Record<string, unknown>;

const isRecord = (value: unknown): value is Row => typeof value === "object" && value !== null;
const rows = (value: unknown): Row[] => (Array.isArray(value) ? value.filter(isRecord) : []);
const text = (value: unknown, fallback = "No disponible") => {
  const result = String(value ?? "").trim();
  return result || fallback;
};
const number = (value: unknown) => Number(value ?? 0);
const money = (value: unknown) => `Q ${number(value).toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;
const dateTime = (value: unknown) => (value ? new Date(String(value)).toLocaleString("es-GT") : "No disponible");
const shortId = (value: unknown) => text(value, "").slice(0, 8).toUpperCase() || "SIN FOLIO";
const escapeHtml = (value: unknown) => text(value, "—")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const relationText = (row: Row, key: string, field: string) => {
  const relation = row[key];
  if (Array.isArray(relation)) return relation.length > 0 && isRecord(relation[0]) ? text(relation[0][field]) : "No disponible";
  return isRecord(relation) ? text(relation[field]) : "No disponible";
};

const check = async <T>(result: { data: T | null; error: { message: string } | null }) => {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("Documento no encontrado.");
  return result.data;
};

const documentShell = (width: PrintWidth, title: string, body: string) => { const pageWidth = width === "pdf" ? "210mm" : width; return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
@page { size: ${width === "pdf" ? "A4" : `${pageWidth} auto`}; margin: 3mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; width: ${pageWidth}; background: #fff; color: #111; }
body { font-family: "Courier New", ui-monospace, monospace; font-size: 11px; line-height: 1.35; }
.receipt { width: 100%; }
h1 { margin: 0 0 6px; text-align: center; font-size: 16px; letter-spacing: .08em; }
h2 { margin: 10px 0 4px; border-bottom: 1px solid #111; padding-bottom: 2px; font-size: 11px; text-transform: uppercase; }
p { margin: 2px 0; }
.center { text-align: center; }
.muted { color: #555; }
.row { display: flex; justify-content: space-between; gap: 8px; }
.row strong:last-child { text-align: right; }
.line { border-top: 1px dashed #555; margin: 7px 0; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 3px 0; vertical-align: top; }
th { border-bottom: 1px solid #111; text-align: left; }
th:last-child, td:last-child { text-align: right; }
.total { border-top: 1px solid #111; margin-top: 6px; padding-top: 5px; font-size: 14px; font-weight: bold; }
.no-print { margin: 12px 0; padding: 8px; border: 1px solid #bbb; font-family: system-ui, sans-serif; font-size: 13px; }
@media print { .no-print { display: none; } }
</style></head><body><main class="receipt">${body}</main></body></html>`; };

const linesHtml = (items: Row[]) => `<table><thead><tr><th>Detalle</th><th>Cant.</th><th>Total</th></tr></thead><tbody>${items.map((item) => {
  const product = relationText(item, "productos", "nombre");
  const design = relationText(item, "disenos", "nombre");
  const legacyExtra = relationText(item, "extras", "nombre");
  const extraRows = rows(item.cotizacion_item_extras ?? item.pedido_item_extras);
  const extraNames = extraRows.map((extraRow) => relationText(extraRow, "extras", "nombre")).filter((name) => name !== "No disponible");
  const extrasText = extraNames.length > 0 ? `Extras: ${extraNames.join(", ")}` : legacyExtra !== "No disponible" ? `Extra: ${legacyExtra}` : "";
  const detail = [product !== "No disponible" ? product : "Linea", design !== "No disponible" ? `Diseno: ${design}` : "", extrasText].filter(Boolean).join(" · ");
  return `<tr><td>${escapeHtml(detail)}<br><span class="muted">${money(item.precio_unitario)} unit.</span></td><td>${escapeHtml(item.cantidad)}</td><td>${money(item.subtotal)}</td></tr>`;
}).join("")}</tbody></table>`;

const printSale = async (id: string, width: PrintWidth) => {
  const sale = (await check(await supabase.from("ventas").select("*, clientes(nombre,nit_dpi), profiles!ventas_vendedor_id_fkey(nombre_completo), sucursales(nombre)").eq("id", id).single())) as unknown as Row;
  const itemResult = await supabase.from("venta_items").select("*, productos(nombre,sku)").eq("venta_id", id);
  const accountResult = await supabase.from("cuentas_cobrar").select("saldo_pendiente").eq("venta_id", id).maybeSingle();
  if (itemResult.error || accountResult.error) throw new Error("No se pudo cargar el detalle de la venta.");
  const items = rows(itemResult.data);
  const account = accountResult.data as Row | null;
  const payment = account ? "Credito" : "No persistida en venta";
  const pending = account ? number(account.saldo_pendiente) : 0;
  const body = `<h1>ALTIX</h1><p class="center">TICKET DE VENTA</p><div class="line"></div>
    <p><strong>Folio:</strong> #${shortId(sale.id)}</p><p><strong>Fecha:</strong> ${escapeHtml(dateTime(sale.created_at))}</p>
    <p><strong>Sucursal:</strong> ${escapeHtml(relationText(sale, "sucursales", "nombre"))}</p><p><strong>Vendedor:</strong> ${escapeHtml(relationText(sale, "profiles", "nombre_completo"))}</p>
    <p><strong>Cliente:</strong> ${escapeHtml(relationText(sale, "clientes", "nombre"))}</p><div class="line"></div>${linesHtml(items)}
    <div class="row total"><span>TOTAL</span><strong>${money(sale.total)}</strong></div>
    <p><strong>Forma de pago:</strong> ${payment}</p><p><strong>Pendiente:</strong> ${money(pending)}</p>`;
  return documentShell(width, `Venta #${shortId(sale.id)}`, body);
};

const printQuotation = async (id: string, width: PrintWidth) => {
  const quote = (await check(await supabase.from("cotizaciones").select("*, clientes(nombre,nit_dpi), profiles!cotizaciones_vendedor_id_fkey(nombre_completo), sucursales(nombre)").eq("id", id).single())) as unknown as Row;
  const itemResult = await supabase.from("cotizacion_items").select("*, productos(nombre,sku), disenos(nombre), extras(nombre), cotizacion_item_extras(extra_id,precio_adicional,extras(nombre))").eq("cotizacion_id", id);
  const approvalResult = await supabase.from("aprobaciones").select("estado").eq("tipo", "descuento").eq("referencia_tabla", "cotizaciones").eq("referencia_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (itemResult.error || approvalResult.error) throw new Error("No se pudo cargar el detalle de la cotizacion.");
  const items = rows(itemResult.data);
  const discount = items.reduce((sum, item) => sum + number(item.descuento), 0);
  const approvalState = isRecord(approvalResult.data) ? String(approvalResult.data.estado ?? "") : "";
  if (discount > 0 && approvalState !== "aprobada") throw new Error("La cotizacion no se puede imprimir hasta aprobar el descuento.");
  const body = `<h1>ALTIX</h1><p class="center">COTIZACION</p><div class="line"></div>
    <p><strong>Numero:</strong> #${shortId(quote.id)}</p><p><strong>Fecha:</strong> ${escapeHtml(dateTime(quote.created_at))}</p><p><strong>Valida hasta:</strong> ${escapeHtml(quote.valida_hasta)}</p>
    <p><strong>Estado:</strong> ${escapeHtml(quote.estado)}</p><p><strong>Aceptacion:</strong> ${quote.cliente_acepto ? "Aceptada" : "Pendiente"}</p>
    <p><strong>Sucursal:</strong> ${escapeHtml(relationText(quote, "sucursales", "nombre"))}</p><p><strong>Vendedor:</strong> ${escapeHtml(relationText(quote, "profiles", "nombre_completo"))}</p><p><strong>Cliente:</strong> ${escapeHtml(relationText(quote, "clientes", "nombre"))}</p>
    <div class="line"></div>${linesHtml(items)}<p><strong>Descuento:</strong> ${money(discount)}</p><div class="row total"><span>TOTAL</span><strong>${money(quote.total)}</strong></div>
    <p><strong>Forma de pago:</strong> ${escapeHtml(quote.metodo_pago)}</p>${quote.observaciones ? `<p><strong>Observaciones:</strong> ${escapeHtml(quote.observaciones)}</p>` : ""}`;
  return documentShell(width, `Cotizacion #${shortId(quote.id)}`, body);
};

const printOrder = async (id: string, width: PrintWidth) => {
  const order = (await check(await supabase.from("pedidos").select("*, clientes(nombre,nit_dpi), profiles!pedidos_vendedor_id_fkey(nombre_completo), sucursales(nombre), cotizaciones(id)").eq("id", id).single())) as unknown as Row;
  const itemResult = await supabase.from("pedido_items").select("*, productos(nombre,sku), disenos(nombre), extras(nombre), pedido_item_extras(extra_id,precio_adicional,extras(nombre))").eq("pedido_id", id);
  const depositResult = await supabase.from("anticipos").select("monto").eq("pedido_id", id);
  if (itemResult.error || depositResult.error) throw new Error("No se pudo cargar el detalle del pedido.");
  const items = rows(itemResult.data);
  const deposit = rows(depositResult.data).reduce((sum, item) => sum + number(item.monto), 0);
  const body = `<h1>ALTIX</h1><p class="center">ORDEN DE TRABAJO</p><div class="line"></div>
    <p><strong>Numero:</strong> #${shortId(order.id)}</p><p><strong>Origen cotizacion:</strong> #${shortId(isRecord(order.cotizaciones) ? order.cotizaciones.id : "")}</p><p><strong>Fecha:</strong> ${escapeHtml(dateTime(order.created_at))}</p>
    <p><strong>Estado:</strong> ${escapeHtml(order.estado)}</p><p><strong>Pago:</strong> ${escapeHtml(order.metodo_pago)}</p><p><strong>Sucursal:</strong> ${escapeHtml(relationText(order, "sucursales", "nombre"))}</p>
    <p><strong>Vendedor:</strong> ${escapeHtml(relationText(order, "profiles", "nombre_completo"))}</p><p><strong>Cliente:</strong> ${escapeHtml(relationText(order, "clientes", "nombre"))}</p>
    <div class="line"></div>${linesHtml(items)}<div class="row total"><span>TOTAL</span><strong>${money(order.total)}</strong></div>
    <p><strong>Anticipo:</strong> ${money(deposit)}</p><p><strong>Saldo:</strong> ${money(order.saldo_pendiente)}</p>${order.observaciones ? `<p><strong>Observaciones:</strong> ${escapeHtml(order.observaciones)}</p>` : ""}`;
  return documentShell(width, `Pedido #${shortId(order.id)}`, body);
};

export const renderPrintDocument = async (kind: PrintDocumentKind, id: string, width: PrintWidth) => {
  if (kind === "sale") return printSale(id, width);
  if (kind === "quotation") return printQuotation(id, width);
  return printOrder(id, width);
};

export const printDocument = async (kind: PrintDocumentKind, id: string, width: PrintWidth, target?: Window | null) => {
  const win = target ?? window.open("", "_blank");
  if (!win) throw new Error("El navegador bloqueo la ventana de impresion.");
  try {
    const html = await renderPrintDocument(kind, id, width);
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    window.setTimeout(() => win.print(), 250);
  } catch (error) {
    win.close();
    throw error;
  }
};
