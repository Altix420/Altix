import React from 'react';
import { ArrowUpRight, Database as DatabaseIcon, HardDrive, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';

export const Dashboard: React.FC = () => {
  const { profile, sucursalActiva } = useAuth();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-gray-400">Resumen operativo</p>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Buenos días, {profile?.nombre_completo?.split(' ')[0]}</h1>
          <p className="mt-2 text-sm text-gray-500">{sucursalActiva?.nombre || 'Sucursal Central'} · <span className="capitalize">{profile?.role}</span></p>
        </div>
        <div className="flex items-center gap-2 text-sm text-emerald-700"><ShieldCheck size={16} /> Operativo</div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <Status label="Base de datos" icon={<Zap className="text-amber-500" size={16} />}>PostgreSQL · RLS activo</Status>
        <Status label="Archivos" icon={<HardDrive className="text-blue-500" size={16} />}>Cloudflare R2</Status>
        <Status label="Modo local" icon={<DatabaseIcon className="text-gray-500" size={16} />}>IndexedDB disponible</Status>
      </div>

      <section className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between">
          <div><h2 className="text-base font-semibold text-gray-950">Accesos rápidos</h2><p className="mt-1 text-sm text-gray-500">Continúa con una operación.</p></div>
          <ArrowUpRight size={18} className="text-gray-400" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <QuickLink href="/ventas">Nueva venta</QuickLink>
          <QuickLink href="/pedidos">Nueva cotización</QuickLink>
          <QuickLink href="/clientes">Buscar cliente</QuickLink>
        </div>
      </section>
    </div>
  );
};

const Status = ({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="border-b border-gray-200 pb-5 md:border-b-0 md:border-r md:pr-6 last:border-r-0">
    <span className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400">{label}</span>
    <p className="mt-2 flex items-center gap-2 text-sm font-medium text-gray-900">{icon}{children}</p>
  </div>
);

const QuickLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="border border-gray-200 bg-white p-4 text-sm font-medium text-gray-900 transition hover:border-blue-300 hover:text-blue-700">{children}</a>
);
