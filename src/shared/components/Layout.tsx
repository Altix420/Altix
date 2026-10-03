import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, FileText, Package, Wallet, CreditCard, Users, Palette, Store, BarChart3, ShieldCheck, Settings, LogOut, UserRound, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { supabase } from '../lib/supabase';

type NavItem = readonly [string, string, LucideIcon];
type NavGroup = { label: string; items: readonly NavItem[] };

const groups: readonly NavGroup[] = [
  { label: 'Operación', items: [['Ventas', '/admin/ventas', ShoppingCart], ['Cotizaciones', '/admin/cotizaciones', FileText], ['Pedidos', '/admin/pedidos', FileText], ['Caja', '/admin/caja', Wallet], ['Movimientos de caja', '/admin/caja/movimientos', Wallet], ['Gastos', '/admin/caja/gastos', Wallet]] },
  { label: 'Comercial', items: [['Clientes', '/admin/clientes', Users], ['Mayoristas', '/admin/mayoristas', Users], ['Créditos', '/admin/creditos', CreditCard]] },
  { label: 'Inventario', items: [['Inventario', '/admin/inventario', Package], ['Kardex', '/admin/inventario/kardex', Package], ['Defectuosos', '/admin/inventario/defectuosos', Package], ['Traslados', '/admin/inventario/traslados', Package], ['Conteo físico', '/admin/conteo', BarChart3]] },
  { label: 'Catálogo', items: [['Productos', '/admin/productos', Package], ['Catálogo', '/admin/catalogo', Palette]] },
  { label: 'Gestión', items: [['Vendedores', '/admin/vendedores', UserRound], ['Metas', '/admin/metas', BarChart3], ['Sucursales', '/admin/sucursales', Store], ['Comisiones', '/admin/comisiones', BarChart3], ['Aprobaciones', '/admin/aprobaciones', ShieldCheck]] },
  { label: 'Control', items: [['Reportes', '/admin/reportes', BarChart3], ['Auditoría', '/admin/auditoria', ShieldCheck], ['Configuración', '/admin/configuracion', Settings]] }
];

const allItems = groups.flatMap(group => group.items);

export const Layout: React.FC = () => {
  const { profile, sucursalActiva, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const result = await supabase.from('aprobaciones').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente');
      if (active) setPendingApprovals(result.count ?? 0);
    };
    void load();
    const channel = supabase.channel('admin-approval-badge').on('postgres_changes', { event: '*', schema: 'public', table: 'aprobaciones' }, () => void load()).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [location.pathname]);
  const handleSignOut = async () => { await signOut(); navigate('/login'); };
  const isActive = (path: string) => location.pathname === path;

  return <div className="min-h-screen bg-[#f7f7f5] text-gray-900">
    <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-gray-200 bg-white md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-gray-200 px-5"><span className="text-lg font-semibold tracking-[0.18em] text-gray-950">ALTIX</span></div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <Link to="/admin/dashboard" className={`mb-4 flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm ${isActive('/admin/dashboard') ? 'border-blue-600 bg-blue-50 font-medium text-blue-700' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}><LayoutDashboard size={17} /> Dashboard</Link>
        {groups.map(group => <div key={group.label} className="mb-5"><p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">{group.label}</p>{group.items.map(([label, path, Icon]) => <Link key={path} to={path} className={`flex items-center gap-3 border-l-2 px-3 py-2 text-sm ${isActive(path) ? 'border-blue-600 bg-blue-50 font-medium text-blue-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}><Icon size={16} /><span>{label}</span>{label === 'Aprobaciones' && pendingApprovals > 0 && <span aria-label={`${pendingApprovals} aprobaciones pendientes`} className="ml-auto min-w-5 bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">{pendingApprovals > 99 ? '99+' : pendingApprovals}</span>}</Link>)}</div>)}
      </nav>
      <div className="flex items-center justify-between border-t border-gray-200 p-4"><div className="min-w-0 pr-2"><p className="truncate text-sm font-medium">{profile?.nombre_completo}</p><p className="truncate text-xs capitalize text-gray-500">{profile?.role} · {sucursalActiva?.nombre || 'Central'}</p></div><button onClick={handleSignOut} title="Cerrar sesión" className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"><LogOut size={17} /></button></div>
    </aside>
    <div className="min-h-screen md:pl-60"><header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden"><span className="text-base font-semibold tracking-[0.16em]">ALTIX</span><button onClick={handleSignOut} title="Cerrar sesión" className="p-2 text-gray-500"><LogOut size={18} /></button></header><div className="border-b border-gray-200 bg-white px-4 py-3 md:hidden"><div className="flex gap-4 overflow-x-auto whitespace-nowrap text-sm"><Link to="/admin/dashboard" className={isActive('/admin/dashboard') ? 'font-medium text-blue-700' : 'text-gray-500'}>Dashboard</Link>{allItems.map(([label, path]) => <Link key={path} to={path} className={isActive(path) ? 'font-medium text-blue-700' : 'text-gray-500'}>{label}</Link>)}</div></div><main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"><Outlet /></main></div>
  </div>;
};
