import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/hooks/useAuth';

export const VendorRoute: React.FC = () => {
  const { profile, sucursalActiva, loading } = useAuth();
  if (loading) return <div className="p-8 text-sm text-gray-500">Cargando permisos...</div>;
  if (!profile?.activo || profile.role !== 'vendedor') return <Navigate to="/admin/dashboard" replace />;
  if (!sucursalActiva) return <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5] p-6"><section className="w-full max-w-md border border-amber-200 bg-white p-6 text-center shadow-sm"><h1 className="text-lg font-semibold text-gray-950">Operación no disponible</h1><p className="mt-2 text-sm text-gray-600">No tienes una sucursal asignada. Contacta a Administración.</p></section></div>;
  return <Outlet />;
};
