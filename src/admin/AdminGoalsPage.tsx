/* eslint-disable react/set-state-in-effect */
import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "../auth/hooks/useAuth";
import { adminService } from "./admin.service";
import { friendlyAdminError } from "./admin.errors";
import { supabase } from "../shared/lib/supabase";

type Branch = { id: string; nombre: string };
type Goal = { id: string; sucursal_id: string; periodo_inicio: string; periodo_fin: string; objetivo_ventas: number; activa: boolean };
type SellerGoal = { vendedor_id: string; objetivo_ventas: number; meta_sucursal_id: string | null; profiles?: { nombre_completo?: string | null } | null };

export const AdminGoalsPage: React.FC = () => {
  const { profile } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sellerGoals, setSellerGoals] = useState<SellerGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const [branchRows, goalRows, sellerRows] = await Promise.all([
      supabase.from("sucursales").select("id,nombre").eq("activa", true).order("nombre"),
      supabase.from("metas_sucursal").select("id,sucursal_id,periodo_inicio,periodo_fin,objetivo_ventas,activa").order("periodo_inicio", { ascending: false }),
      supabase.from("metas_vendedor").select("vendedor_id,objetivo_ventas,meta_sucursal_id,profiles!metas_vendedor_vendedor_id_fkey(nombre_completo)").order("periodo_inicio", { ascending: false }),
    ]);
    setBranches((branchRows.data ?? []) as Branch[]);
    setGoals((goalRows.data ?? []) as Goal[]);
    setSellerGoals((sellerRows.data ?? []) as SellerGoal[]);
    const failed = [branchRows, goalRows, sellerRows].find((result) => result.error);
    if (failed?.error) { setError(friendlyAdminError(failed.error, "No se pudieron cargar las metas.")); setLoading(false); return false; }
    setError(null);
    setLoading(false);
    return true;
  }, []);
  useEffect(() => { void load(); }, [load]);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.id) return;
    const form = new FormData(event.currentTarget);
    const total = Number(form.get("objetivo_ventas"));
    if (!Number.isFinite(total) || total < 0) { setError("La meta total debe ser un número válido."); setSuccess(null); return; }
    if (String(form.get("periodo_inicio")) > String(form.get("periodo_fin"))) { setError("El inicio no puede ser posterior al fin."); setSuccess(null); return; }
    setSaving(true); setError(null); setSuccess(null);
    try {
      await adminService.configurarMetaSucursal({ p_sucursal_id: String(form.get("sucursal_id")), p_periodo_inicio: String(form.get("periodo_inicio")), p_periodo_fin: String(form.get("periodo_fin")), p_objetivo_ventas: total, p_activa: form.get("activa") === "on", p_admin_id: profile.id });
      setSuccess("Meta de sucursal guardada y distribuida entre vendedores activos.");
      event.currentTarget.reset();
      try {
        const refreshed = await load();
        if (!refreshed) {
          setError("Meta guardada, pero no se pudo actualizar la vista.");
          setSuccess(null);
        }
      } catch {
        setError("Meta guardada, pero no se pudo actualizar la vista.");
        setSuccess(null);
      }
    } catch (err) { setError(friendlyAdminError(err, "No se pudo guardar la meta de sucursal.")); }
    finally { setSaving(false); }
  };
  return <section className="space-y-6"><header className="flex items-end justify-between border-b border-gray-200 pb-5"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Gestión / Metas</p><h1 className="text-2xl font-semibold">Metas por sucursal</h1><p className="mt-1 text-sm text-gray-500">Administración define el total; PostgreSQL deriva el objetivo individual de cada vendedor activo y conserva el histórico.</p></div><button type="button" title="Actualizar" onClick={() => void load()} disabled={loading} className="p-2 text-gray-500 disabled:opacity-50"><RefreshCw size={17} /></button></header>{error && <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{success && <p className="border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</p>}<form onSubmit={save} className="grid gap-3 border border-gray-200 bg-white p-5 md:grid-cols-5"><label className="text-sm">Sucursal<select name="sucursal_id" required className="mt-1 w-full border border-gray-300 px-2 py-2"><option value="">Selecciona</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.nombre}</option>)}</select></label><label className="text-sm">Desde<input name="periodo_inicio" required type="date" className="mt-1 w-full border border-gray-300 px-2 py-2" /></label><label className="text-sm">Hasta<input name="periodo_fin" required type="date" className="mt-1 w-full border border-gray-300 px-2 py-2" /></label><label className="text-sm">Meta total<input name="objetivo_ventas" required min="0" step="0.01" type="number" className="mt-1 w-full border border-gray-300 px-2 py-2" /></label><div className="flex items-end gap-3"><label className="flex items-center gap-2 pb-2 text-sm"><input name="activa" type="checkbox" defaultChecked /> Activa</label><button type="submit" disabled={saving} className="bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Guardando..." : "Guardar meta"}</button></div></form><div className="overflow-x-auto border border-gray-200 bg-white">{loading ? <p className="p-8 text-center text-sm text-gray-500">Cargando metas...</p> : <table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Sucursal</th><th className="px-4 py-3">Periodo</th><th className="px-4 py-3">Meta total</th><th className="px-4 py-3">Vendedores derivados</th><th className="px-4 py-3">Estado</th></tr></thead><tbody className="divide-y divide-gray-100">{goals.map((goal) => { const people = sellerGoals.filter((item) => item.meta_sucursal_id === goal.id); return <tr key={goal.id}><td className="px-4 py-3">{branches.find((branch) => branch.id === goal.sucursal_id)?.nombre ?? "Sucursal"}</td><td className="px-4 py-3">{goal.periodo_inicio} a {goal.periodo_fin}</td><td className="px-4 py-3">Q {Number(goal.objetivo_ventas).toFixed(2)}</td><td className="px-4 py-3">{people.length === 0 ? "Sin vendedores activos" : people.map((person) => `${person.profiles?.nombre_completo ?? "Vendedor"}: Q ${Number(person.objetivo_ventas).toFixed(2)}`).join(" · ")}</td><td className="px-4 py-3">{goal.activa ? "Activa" : "Inactiva"}</td></tr>; })}</tbody></table>}</div></section>;
};
