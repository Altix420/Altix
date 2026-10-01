import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/hooks/useAuth';

export const VendorRoute: React.FC = () => {
  const { profile, loading } = useAuth();
  if (loading) return <div className="p-8 text-sm text-gray-500">Cargando permisos...</div>;
  if (!profile?.activo || profile.role !== 'vendedor') return <Navigate to="/admin/dashboard" replace />;
  return <Outlet />;
};
