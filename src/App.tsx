import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/context/AuthContext';
import { ProtectedRoute } from './auth/components/ProtectedRoute';
import { Layout } from './shared/components/Layout';
import { Login } from './auth/pages/Login';
import { Dashboard } from './dashboard/pages/Dashboard';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/ventas" element={<div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">Módulo POS (En estructuración)</div>} />
              <Route path="/pedidos" element={<div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">Módulo Cotizaciones y Pedidos (En estructuración)</div>} />
              <Route path="/inventario" element={<div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">Módulo Inventario (En estructuración)</div>} />
              <Route path="/caja" element={<div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">Módulo Caja Chica (En estructuración)</div>} />
              <Route path="/creditos" element={<div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">Módulo Créditos (En estructuración)</div>} />
              <Route path="/clientes" element={<div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">Módulo Clientes (En estructuración)</div>} />
              <Route path="/auditoria" element={<div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">Módulo Auditoría (En estructuración)</div>} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
