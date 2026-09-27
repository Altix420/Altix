import React from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { ShieldCheck, Zap, HardDrive, Database as DatabaseIcon } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { profile, sucursalActiva } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            ¡Bienvenido, {profile?.nombre_completo?.split(' ')[0]}! 👋
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Rol: <span className="font-semibold text-gray-800 capitalize">{profile?.role}</span> | 
            Sucursal: <span className="font-semibold text-gray-800">{sucursalActiva?.nombre || 'Central'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold">
          <ShieldCheck size={16} />
          <span>Sistema Operativo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estado Base de Datos</span>
          <p className="text-lg font-bold text-gray-800 mt-1 flex items-center gap-2">
            <Zap className="text-amber-500" size={18} /> PostgreSQL + RLS Activo
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Almacenamiento Cloud</span>
          <p className="text-lg font-bold text-gray-800 mt-1 flex items-center gap-2">
            <HardDrive className="text-blue-500" size={18} /> Cloudflare R2 Presigned
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Modo Desconectado</span>
          <p className="text-lg font-bold text-gray-800 mt-1 flex items-center gap-2">
            <DatabaseIcon className="text-purple-500" size={18} /> IndexedDB Activo
          </p>
        </div>
      </div>
    </div>
  );
};
