import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/context/AuthContext';
import { ProtectedRoute } from './auth/components/ProtectedRoute';
import { AdminRoute } from './admin/AdminRoute';
import { AdminCatalogPage, AdminDashboard, AdminListPage } from './admin/AdminPages';
import { AdminConfigurationPage } from './admin/AdminConfigurationPage';
import { AdminGoalsPage } from './admin/AdminGoalsPage';
import { AdminBranchesPage, AdminProductsPage, AdminVendorsPage } from './admin/AdminInitializationPages';
import { Layout } from './shared/components/Layout';
import { Login } from './auth/pages/Login';
import { VendorRoute } from './vendor/VendorRoute';
import { VendorLayout } from './vendor/VendorLayout';
import { VendorClientsPage, VendorDashboard, VendorExpensePage, VendorListPage, VendorPosPage } from './vendor/VendorPages';
import { VendorQuotationPage } from './vendor/VendorQuotationPage';
import { VendorApprovalsPage } from './vendor/VendorApprovalsPage';
import { useAuth } from './auth/hooks/useAuth';

const HomeRedirect: React.FC = () => { const { profile, loading } = useAuth(); if (loading) return <div className="p-8 text-sm text-gray-500">Cargando...</div>; return <Navigate to={profile?.role === 'vendedor' ? '/vendedor/inicio' : '/admin/dashboard'} replace />; };

const adminModules = [
  ['ventas', '/admin/ventas'], ['cotizaciones', '/admin/cotizaciones'], ['pedidos', '/admin/pedidos'], ['caja', '/admin/caja'], ['caja-movimientos', '/admin/caja/movimientos'], ['gastos', '/admin/caja/gastos'],
  ['clientes', '/admin/clientes'], ['mayoristas', '/admin/mayoristas'], ['creditos', '/admin/creditos'], ['productos', '/admin/productos'],
  ['inventario', '/admin/inventario'], ['kardex', '/admin/inventario/kardex'], ['defectuosos', '/admin/inventario/defectuosos'], ['traslados', '/admin/inventario/traslados'], ['conteo', '/admin/conteo'], ['vendedores', '/admin/vendedores'], ['sucursales', '/admin/sucursales'],
  ['comisiones', '/admin/comisiones'], ['aprobaciones', '/admin/aprobaciones'], ['reportes', '/admin/reportes'], ['auditoria', '/admin/auditoria'], ['metas', '/admin/metas'],
  ['configuracion', '/admin/configuracion']
] as const;

export function App() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<HomeRedirect />} />
      <Route element={<AdminRoute />}><Route element={<Layout />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/catalogo" element={<AdminCatalogPage />} />
        {adminModules.map(([module, path]) => <Route key={path} path={path} element={module === 'configuracion' ? <AdminConfigurationPage /> : module === 'metas' ? <AdminGoalsPage /> : module === 'sucursales' ? <AdminBranchesPage /> : module === 'vendedores' ? <AdminVendorsPage /> : module === 'productos' ? <AdminProductsPage /> : <AdminListPage module={module} />} />)}
      </Route></Route>
      <Route element={<VendorRoute />}><Route element={<VendorLayout />}>
        <Route path="/vendedor/inicio" element={<VendorDashboard />} />
        <Route path="/vendedor/venta" element={<VendorPosPage />} />
        <Route path="/vendedor/ventas" element={<VendorListPage module="ventas" />} />
        <Route path="/vendedor/cotizaciones/nueva" element={<VendorQuotationPage />} />
        <Route path="/vendedor/cotizaciones" element={<VendorListPage module="cotizaciones" />} />
        <Route path="/vendedor/aprobaciones" element={<VendorApprovalsPage />} />
        <Route path="/vendedor/pedidos" element={<VendorListPage module="pedidos" />} />
        <Route path="/vendedor/clientes" element={<VendorClientsPage />} />
        <Route path="/vendedor/gastos" element={<VendorExpensePage />} />
        <Route path="/vendedor/catalogo" element={<VendorListPage module="catalogo" />} />
        <Route path="/vendedor/disenos" element={<VendorListPage module="disenos" />} />
        <Route path="/vendedor/extras" element={<VendorListPage module="extras" />} />
        <Route path="/vendedor/inventario" element={<VendorListPage module="inventario" />} />
        <Route path="/vendedor/credito" element={<VendorListPage module="credito" />} />
        <Route path="/vendedor/comision" element={<VendorListPage module="comision" />} />
      </Route></Route>
      <Route element={<AdminRoute />}><Route path="/ventas" element={<Navigate to="/admin/ventas" replace />} /><Route path="/pedidos" element={<Navigate to="/admin/pedidos" replace />} /><Route path="/inventario" element={<Navigate to="/admin/inventario" replace />} /><Route path="/caja" element={<Navigate to="/admin/caja" replace />} /><Route path="/creditos" element={<Navigate to="/admin/creditos" replace />} /><Route path="/clientes" element={<Navigate to="/admin/clientes" replace />} /><Route path="/auditoria" element={<Navigate to="/admin/auditoria" replace />} /></Route>
    </Route>
    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
  </Routes></BrowserRouter></AuthProvider>;
}

export default App;
