import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  Package, 
  Wallet, 
  CreditCard, 
  Users, 
  ShieldCheck, 
  LogOut 
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { profile, sucursalActiva, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Punto de Venta', path: '/ventas', icon: ShoppingCart },
    { label: 'Cotizaciones y Pedidos', path: '/pedidos', icon: FileText },
    { label: 'Inventario / Kardex', path: '/inventario', icon: Package },
    { label: 'Caja Chica', path: '/caja', icon: Wallet },
    { label: 'Créditos', path: '/creditos', icon: CreditCard },
    { label: 'Clientes', path: '/clientes', icon: Users },
    { label: 'Auditoría', path: '/auditoria', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex bg-gray-100 text-gray-900 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center font-black text-xl text-white tracking-wider">
            A
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-wider text-white">ALTIX</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">ERP & POS System</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                  active 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-slate-200 truncate">{profile?.nombre_completo}</p>
              <p className="text-[10px] text-slate-400 capitalize">{profile?.role} • {sucursalActiva?.nombre || 'Central'}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Cerrar sesión"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
};
