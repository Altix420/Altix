/* eslint-disable react/set-state-in-effect */
import React, { useCallback, useEffect, useState } from "react";
import { CircleAlert, RefreshCw } from "lucide-react";
import { useAuth } from "../auth/hooks/useAuth";
import { friendlyAdminError } from "../admin/admin.errors";
import { supabase } from "../shared/lib/supabase";

type Approval = {
  id: string;
  tipo: string;
  estado: string;
  motivo: string;
  valor_solicitado: number | null;
  created_at: string;
  revisado_at: string | null;
  nota_resolucion: string | null;
};

export const VendorApprovalsPage: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    const result = await supabase.from("aprobaciones").select("id,tipo,estado,motivo,valor_solicitado,created_at,revisado_at,nota_resolucion").eq("solicitante_id", user.id).order("created_at", { ascending: false });
    if (result.error) { setError(friendlyAdminError(result.error, "No se pudieron cargar tus solicitudes.")); setRows([]); }
    else setRows((result.data ?? []) as Approval[]);
    setLoading(false);
  }, [user]);
  useEffect(() => { void load(); }, [load]);
  return <section className="space-y-5"><header className="flex items-center justify-between border-b border-gray-200 pb-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Vendedor</p><h1 className="mt-1 text-2xl font-semibold">Mis solicitudes</h1><p className="mt-1 text-sm text-gray-500">Estado y resolución de solicitudes enviadas al administrador.</p></div><button type="button" title="Actualizar" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"><RefreshCw size={15} /> Actualizar</button></header>{error && <p className="flex items-center gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-700"><CircleAlert size={16} />{error}</p>}{loading ? <p className="border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Cargando solicitudes...</p> : rows.length === 0 ? <p className="border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No hay solicitudes registradas.</p> : <div className="overflow-x-auto border border-gray-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Tipo", "Valor", "Motivo", "Fecha", "Estado", "Resolución"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{rows.map((row) => <tr key={row.id}><td className="px-4 py-3">{row.tipo}</td><td className="px-4 py-3">{row.valor_solicitado == null ? "—" : `Q ${Number(row.valor_solicitado).toFixed(2)}`}</td><td className="max-w-[260px] truncate px-4 py-3">{row.motivo}</td><td className="px-4 py-3">{new Date(row.created_at).toLocaleDateString("es-GT")}</td><td className="px-4 py-3 font-medium">{row.estado}</td><td className="max-w-[220px] truncate px-4 py-3">{row.nota_resolucion ?? "—"}</td></tr>)}</tbody></table></div>}</section>;
};
