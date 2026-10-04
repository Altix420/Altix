/* eslint-disable react/set-state-in-effect */
import React, { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { adminService } from "./admin.service";
import { friendlyAdminError } from "./admin.errors";
import { supabase } from "../shared/lib/supabase";
import { unitLabel } from "../shared/units";

type JsonRow = Record<string, unknown>;
type DashboardData = { kpis: Record<string, number>; sales_over_time: JsonRow[]; cost_profit_over_time: JsonRow[]; sales_by_branch: JsonRow[]; sales_by_seller: JsonRow[]; customer_type: JsonRow[]; products_sold: number };
const emptyData: DashboardData = { kpis: {}, sales_over_time: [], cost_profit_over_time: [], sales_by_branch: [], sales_by_seller: [], customer_type: [], products_sold: 0 };
const money = (value: unknown) => `Q ${Number(value ?? 0).toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;
const asDashboard = (value: unknown) => (value && typeof value === "object" ? value as DashboardData : emptyData);
const Metric: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => <div className="border border-gray-200 bg-white p-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p><p className="mt-2 text-xl font-semibold text-gray-950">{value}</p></div>;
const BarList: React.FC<{ title: string; rows: JsonRow[]; label: string; value: string }> = ({ title, rows, label, value }) => { const max = Math.max(...rows.map((row) => Number(row[value] ?? 0)), 1); return <section className="border border-gray-200 bg-white p-4"><h2 className="font-semibold">{title}</h2><div className="mt-4 space-y-3">{rows.length === 0 ? <p className="text-sm text-gray-500">Sin datos en el periodo.</p> : rows.map((row, index) => <div key={`${String(row[label])}-${index}`}><div className="flex justify-between gap-3 text-xs"><span className="truncate">{String(row[label] ?? "—")}</span><span>{money(row[value])}</span></div><div className="mt-1 h-2 bg-gray-100"><div className="h-2 bg-blue-600" style={{ width: `${Math.max(3, Number(row[value] ?? 0) / max * 100)}%` }} /></div></div>)}</div></section>; };
const CostProfitList: React.FC<{ rows: JsonRow[] }> = ({ rows }) => <section className="border border-gray-200 bg-white p-4"><h2 className="font-semibold">Ventas, costo y utilidad</h2>{rows.length === 0 ? <p className="mt-4 text-sm text-gray-500">Sin datos en el periodo.</p> : <div className="mt-4 space-y-2 text-sm">{rows.map((row, index) => <div key={`${String(row.sales_day)}-${index}`} className="grid grid-cols-4 gap-2 border-b border-gray-100 pb-2"><span>{String(row.sales_day)}</span><span>V: {money(row.sales)}</span><span>C: {money(row.cost)}</span><span>U: {money(row.gross_profit)}</span></div>)}</div>}</section>;
const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const downloadCsv = (filename: string, columns: string[], data: Array<Record<string, unknown>>) => {
  if (data.length === 0) throw new Error("No hay datos para descargar.");
  const csv = [columns.map(csvCell).join(","), ...data.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  anchor.remove();
};
const relatedName = (value: unknown) => value && typeof value === "object" ? String((value as JsonRow).nombre ?? "") : "";

export const AdminProfitDashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData>(emptyData); const [branches, setBranches] = useState<Array<{ id: string; nombre: string }>>([]); const [filters, setFilters] = useState({ from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10), branch: "" }); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); const result = await adminService.dashboardAdmin({ p_desde: filters.from, p_hasta: filters.to, p_sucursal_id: filters.branch || undefined }); if (result && !Array.isArray(result)) setData(asDashboard(result)); else setData(emptyData); const branchRows = await supabase.from("sucursales").select("id,nombre").order("nombre"); if (branchRows.error) setError(friendlyAdminError(branchRows.error, "No se pudieron cargar las sucursales.")); else setBranches((branchRows.data ?? []) as Array<{ id: string; nombre: string }>); setLoading(false); }, [filters]);
  useEffect(() => { void load(); }, [load]);
  const k = data.kpis;
  return <section className="space-y-6"><header className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Control / Dashboard</p><h1 className="text-2xl font-semibold">Dashboard administrativo</h1><p className="mt-1 text-sm text-gray-500">Indicadores agregados desde ventas, cartera, caja, inventario y aprobaciones.</p></div><button type="button" onClick={() => void load()} disabled={loading} title="Actualizar" className="inline-flex items-center gap-2 border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"><RefreshCw size={15} /> Actualizar</button></header><div className="grid gap-3 border border-gray-200 bg-white p-3 md:grid-cols-3"><label className="text-sm">Desde<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className="mt-1 w-full border border-gray-300 px-2 py-2" /></label><label className="text-sm">Hasta<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className="mt-1 w-full border border-gray-300 px-2 py-2" /></label><label className="text-sm">Sucursal<select value={filters.branch} onChange={(event) => setFilters({ ...filters, branch: event.target.value })} className="mt-1 w-full border border-gray-300 px-2 py-2"><option value="">Consolidado</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.nombre}</option>)}</select></label></div>{error && <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{loading ? <p className="border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Calculando indicadores...</p> : <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Ventas netas" value={money(k.net_sales ?? k.sales_period)} /><Metric label="Costo de ventas" value={money(k.cost_of_sales)} /><Metric label="Utilidad bruta" value={money(k.gross_profit)} /><Metric label="Comisiones" value={money(k.commissions)} /><Metric label="Utilidad después de comisiones" value={money(k.profit_after_commissions)} /><Metric label="Caja abierta" value={money(k.cash)} /><Metric label="Crédito pendiente" value={money(k.pending_credit)} /><Metric label="Aprobaciones pendientes" value={k.pending_approvals ?? 0} /><Metric label="Pedidos" value={k.orders ?? 0} /><Metric label="Cotizaciones" value={k.quotes ?? 0} /><Metric label="Stock bajo" value={k.low_stock ?? 0} /><Metric label="Productos vendidos" value={data.products_sold} /></div><div className="grid gap-4 lg:grid-cols-2"><BarList title="Ventas por sucursal" rows={data.sales_by_branch} label="branch" value="sales" /><BarList title="Ventas por vendedor" rows={data.sales_by_seller} label="seller" value="sales" /><BarList title="Cliente mayorista vs final" rows={data.customer_type} label="customer_type" value="sales" /><BarList title="Ventas por día" rows={data.sales_over_time} label="sales_day" value="sales" /><CostProfitList rows={data.cost_profit_over_time} /></div></>}</section>;
};

export const AdminReportsPage: React.FC<{ embedded?: boolean }> = () => {
  const [data, setData] = useState<DashboardData>(emptyData); const [inventory, setInventory] = useState<JsonRow>({}); const [branches, setBranches] = useState<Array<{ id: string; nombre: string }>>([]); const [filters, setFilters] = useState({ from: new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10), branch: "", seller: "" }); const [sellers, setSellers] = useState<Array<{ id: string; nombre_completo: string }>>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); const [report, count, branchRows, sellerRows] = await Promise.all([adminService.reporteVentas({ p_desde: filters.from, p_hasta: filters.to, p_sucursal_id: filters.branch || undefined, p_vendedor_id: filters.seller || undefined }), adminService.reporteInventarioMensual({ p_mes: filters.to, p_sucursal_id: filters.branch || undefined }), supabase.from("sucursales").select("id,nombre").order("nombre"), supabase.from("profiles").select("id,nombre_completo").eq("role", "vendedor").order("nombre_completo")]); if (report && !Array.isArray(report)) setData(asDashboard(report)); if (count && !Array.isArray(count)) setInventory(count as JsonRow); const failed = [branchRows, sellerRows].find((result) => result.error); if (failed?.error) setError(friendlyAdminError(failed.error, "No se pudieron cargar los filtros.")); else { setBranches((branchRows.data ?? []) as Array<{ id: string; nombre: string }>); setSellers((sellerRows.data ?? []) as Array<{ id: string; nombre_completo: string }>); } setLoading(false); }, [filters]);
  useEffect(() => { void load(); }, [load]);
  const exportSales = async () => {
    setError(null);
    try {
      const salesQuery = supabase.from("ventas").select("id,created_at,total,entregada,forma_pago,cliente:clientes(nombre),vendedor:profiles!ventas_vendedor_id_fkey(nombre_completo),sucursal:sucursales(nombre)").gte("created_at", `${filters.from}T00:00:00`).lte("created_at", `${filters.to}T23:59:59.999`).order("created_at", { ascending: false });
      const filteredSalesQuery = filters.branch ? salesQuery.eq("sucursal_id", filters.branch) : salesQuery;
      const filteredBySeller = filters.seller ? filteredSalesQuery.eq("vendedor_id", filters.seller) : filteredSalesQuery;
      const salesResult = await filteredBySeller;
      if (salesResult.error) throw salesResult.error;
      const sales = (salesResult.data ?? []) as unknown as JsonRow[];
      const ids = sales.map((row) => String(row.id));
      if (ids.length === 0) throw new Error("No hay datos para descargar.");
      const [itemsResult, commissionsResult] = await Promise.all([
        supabase.from("venta_items").select("venta_id,cantidad,venta_costos(cantidad,costo_unitario)").in("venta_id", ids),
        supabase.from("comisiones").select("venta_id,monto_comision,estado").in("venta_id", ids),
      ]);
      if (itemsResult.error) throw itemsResult.error;
      if (commissionsResult.error) throw commissionsResult.error;
      const costBySale = new Map<string, number>();
      (itemsResult.data as unknown as JsonRow[]).forEach((item) => {
        const costs = Array.isArray(item.venta_costos) ? item.venta_costos : item.venta_costos ? [item.venta_costos] : [];
        const cost = costs.reduce((sum, row) => sum + Number((row as JsonRow).cantidad ?? item.cantidad ?? 0) * Number((row as JsonRow).costo_unitario ?? 0), 0);
        costBySale.set(String(item.venta_id), (costBySale.get(String(item.venta_id)) ?? 0) + cost);
      });
      const commissionBySale = new Map<string, number>();
      (commissionsResult.data as unknown as JsonRow[]).forEach((row) => commissionBySale.set(String(row.venta_id), (commissionBySale.get(String(row.venta_id)) ?? 0) + Number(row.monto_comision ?? 0)));
      const data = sales.map((row) => {
        const total = Number(row.total ?? 0);
        const cost = costBySale.get(String(row.id)) ?? 0;
        const commission = commissionBySale.get(String(row.id)) ?? 0;
        return { fecha: row.created_at, folio: String(row.id).slice(0, 8).toUpperCase(), cliente: relatedName(row.cliente), vendedor: relatedName(row.vendedor), sucursal: relatedName(row.sucursal), total, costo: cost, utilidad: total - cost, comision: commission, utilidad_despues_comision: total - cost - commission, estado: row.entregada ? "entregada" : String(row.forma_pago ?? "registrada") };
      });
      downloadCsv(`altix-ventas-${filters.from}-${filters.to}.csv`, ["fecha", "folio", "cliente", "vendedor", "sucursal", "total", "costo", "utilidad", "comision", "utilidad_despues_comision", "estado"], data);
    } catch (err) { setError(friendlyAdminError(err, "No se pudo descargar el reporte de ventas.")); }
  };
  const exportInventory = async () => {
    setError(null);
    try {
      const query = supabase.from("inventarios").select("stock,productos(nombre,sku,unidad_venta,productos_costos(costo_unitario),disenos(nombre)),sucursales(nombre)");
      const result = filters.branch ? await query.eq("sucursal_id", filters.branch) : await query;
      if (result.error) throw result.error;
      const rows = (result.data ?? []) as unknown as JsonRow[];
      if (rows.length === 0) throw new Error("No hay datos para descargar.");
      const data = rows.map((row) => {
        const product = (row.productos ?? {}) as JsonRow;
        const costs = Array.isArray(product.productos_costos) ? product.productos_costos : product.productos_costos ? [product.productos_costos] : [];
        const cost = Number((costs[0] as JsonRow | undefined)?.costo_unitario ?? 0);
        const stock = Number(row.stock ?? 0);
        const unit = String(product.unidad_venta ?? "unidad");
        const designs = Array.isArray(product.disenos) ? product.disenos.map((design) => String((design as JsonRow).nombre ?? "")).filter(Boolean).join(" | ") : relatedName(product.disenos);
        return { sku: product.sku, producto: product.nombre, diseno: designs, sucursal: relatedName(row.sucursales), stock, unidad_venta: unitLabel(unit, stock), costo: cost, valor_inventario: stock * cost };
      });
      downloadCsv(`altix-inventario-${filters.to.slice(0, 7)}.csv`, ["sku", "producto", "diseno", "sucursal", "stock", "unidad_venta", "costo", "valor_inventario"], data);
    } catch (err) { setError(friendlyAdminError(err, "No se pudo descargar el reporte de inventario.")); }
  };
  const k = data.kpis;
  return <section className="space-y-6"><header className="flex flex-col gap-3 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Control / Reportes</p><h1 className="text-2xl font-semibold">Reportes</h1><p className="mt-1 text-sm text-gray-500">Ventas agregadas y estado del conteo físico mensual.</p></div><div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => void exportSales()} disabled={loading} className="inline-flex items-center justify-center gap-2 border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"><Download size={15} /> Descargar ventas CSV</button><button type="button" onClick={() => void exportInventory()} disabled={loading} className="inline-flex items-center justify-center gap-2 border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"><Download size={15} /> Descargar inventario CSV</button><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"><RefreshCw size={15} /> Actualizar</button></div></header><div className="grid gap-3 border border-gray-200 bg-white p-3 md:grid-cols-4"><label className="text-sm">Desde<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className="mt-1 w-full border border-gray-300 px-2 py-2" /></label><label className="text-sm">Hasta<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className="mt-1 w-full border border-gray-300 px-2 py-2" /></label><label className="text-sm">Sucursal<select value={filters.branch} onChange={(event) => setFilters({ ...filters, branch: event.target.value })} className="mt-1 w-full border border-gray-300 px-2 py-2"><option value="">Consolidado</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.nombre}</option>)}</select></label><label className="text-sm">Vendedor<select value={filters.seller} onChange={(event) => setFilters({ ...filters, seller: event.target.value })} className="mt-1 w-full border border-gray-300 px-2 py-2"><option value="">Todos</option>{sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.nombre_completo}</option>)}</select></label></div>{error && <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{loading ? <p className="border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Generando reporte...</p> : <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><Metric label="Ventas" value={money(k.sales_period)} /><Metric label="Cobrado" value={money(k.amount_collected)} /><Metric label="Pendiente" value={money(k.amount_pending)} /><Metric label="Utilidad bruta" value={money(k.gross_profit)} /><Metric label="Pedidos" value={k.orders ?? 0} /><Metric label="Productos vendidos" value={data.products_sold} /></div><div className="grid gap-4 lg:grid-cols-2"><BarList title="Ventas por sucursal" rows={data.sales_by_branch} label="branch" value="sales" /><BarList title="Ventas por vendedor" rows={data.sales_by_seller} label="seller" value="sales" /><CostProfitList rows={data.cost_profit_over_time} /></div><section className="border border-gray-200 bg-white p-5"><h2 className="font-semibold">Inventario mensual</h2>{inventory.status === "pendiente" ? <p className="mt-3 text-sm text-amber-700">Conteo pendiente</p> : <div className="mt-3 grid gap-3 md:grid-cols-2">{Array.isArray(inventory.counts) && inventory.counts.map((row, index) => <div key={index} className="border border-gray-100 p-3 text-sm"><p className="font-medium">Sucursal {String((row as JsonRow).sucursal_id ?? "—")}</p><p className="mt-1 text-gray-500">Teórico: {String((row as JsonRow).teorico ?? 0)} · Físico: {String((row as JsonRow).fisico ?? 0)}</p><p className="text-gray-500">Diferencia: {String((row as JsonRow).diferencia ?? 0)} · Pendientes: {String((row as JsonRow).pendientes ?? 0)}</p><p className="text-gray-500">Responsable: {String((row as JsonRow).responsable ?? "—")} · Fecha: {String((row as JsonRow).fecha ?? "—")}</p></div>)}</div>}</section></>}</section>;
};
