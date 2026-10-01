import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/hooks/useAuth';

export const AdminRoute: React.FC = () => {
  const { profile, loading } = useAuth();
  if (loading) return <div className="p-8 text-sm text-gray-500">Cargando permisos...</div>;
  if (!profile?.activo) return <Navigate to="/login" replace />;
  if (profile.role === 'vendedor') return <Navigate to="/vendedor/inicio" replace />;
  if (profile.role !== 'administrador') return <Navigate to="/login" replace />;
  return <Outlet />;
};
