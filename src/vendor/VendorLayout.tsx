import React, { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, Boxes, CreditCard, FileText, Home, LogOut, Package, Receipt, ShoppingCart, UserRound, Users, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../auth/hooks/useAuth';
import { supabase } from '../shared/lib/supabase';

const items = [['Inicio', '/vendedor/inicio', Home], ['Nueva venta', '/vendedor/venta', ShoppingCart], ['Mis ventas', '/vendedor/ventas', BarChart3], ['Cotizaciones', '/vendedor/cotizaciones', FileText], ['Solicitudes', '/vendedor/aprobaciones', Bell], ['Pedidos', '/vendedor/pedidos', Boxes], ['Clientes', '/vendedor/clientes', Users], ['Gastos', '/vendedor/gastos', Receipt], ['Catálogo', '/vendedor/catalogo', Package], ['Inventario', '/vendedor/inventario', Boxes], ['Crédito', '/vendedor/credito', CreditCard], ['Comisión', '/vendedor/comision', UserRound]] as const;
const mobileItems = items.filter(([label]) => ['Inicio', 'Nueva venta', 'Pedidos', 'Catálogo'].includes(label));

class VendorPageBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ALTIX] error en sección Vendor', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <div className="border border-red-200 bg-red-50 p-6 text-sm text-red-800"><h1 className="font-semibold">No se pudo cargar esta sección.</h1><p className="mt-1">La navegación sigue disponible. Puedes volver o recargar esta pantalla.</p><div className="mt-4 flex gap-2"><button type="button" onClick={() => window.history.back()} className="border border-red-300 bg-white px-3 py-2 font-medium">Volver</button><button type="button" onClick={() => window.location.reload()} className="bg-red-700 px-3 py-2 font-medium text-white">Recargar</button></div></div>;
  }
}

export const VendorLayout: React.FC = () => {
  const { profile, sucursalActiva, signOut } = useAuth(); const location = useLocation(); const navigate = useNavigate();
  const [unreadApprovals, setUnreadApprovals] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!profile?.id) return;
      const result = await supabase.from('aprobaciones').select('id', { count: 'exact', head: true }).eq('solicitante_id', profile.id).neq('estado', 'pendiente').is('solicitante_visto_at', null);
      if (active) setUnreadApprovals(result.count ?? 0);
    };
    void load();
    const channel = supabase.channel('vendor-approval-badge').on('postgres_changes', { event: '*', schema: 'public', table: 'aprobaciones', filter: profile?.id ? `solicitante_id=eq.${profile.id}` : undefined }, () => void load()).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [location.pathname, profile?.id]);
  useEffect(() => {
    if (!moreOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMoreOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [moreOpen]);
  const logout = async () => { await signOut(); navigate('/login'); };
  const secondaryItems = items.filter(([label]) => !mobileItems.some(([mobileLabel]) => mobileLabel === label));
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);
  return <div className="altix-safe-bottom min-h-screen bg-[#f7f7f5] text-gray-900 md:pb-0"><aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-gray-200 bg-white md:flex md:flex-col"><div className="flex h-16 items-center border-b border-gray-200 px-5"><span className="text-lg font-semibold tracking-[0.18em] text-gray-950">ALTIX</span><span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400">Venta</span></div><nav className="flex-1 overflow-y-auto px-3 py-4">{items.map(([label, path, Icon]) => <Link key={path} to={path} className={`flex items-center gap-3 border-l-2 px-3 py-2 text-sm ${isActive(path) ? 'border-blue-600 bg-blue-50 font-medium text-blue-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}><Icon size={16} /><span>{label}</span>{label === 'Solicitudes' && unreadApprovals > 0 && <span aria-label={`${unreadApprovals} respuestas nuevas`} className="ml-auto min-w-5 bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">{unreadApprovals > 99 ? '99+' : unreadApprovals}</span>}</Link>)}</nav><div className="flex items-center justify-between border-t border-gray-200 p-4"><div className="min-w-0 pr-2"><p className="truncate text-sm font-medium">{profile?.nombre_completo}</p><p className="truncate text-xs text-gray-500">{sucursalActiva?.nombre ?? 'Sin sucursal'}</p></div><button onClick={logout} title="Cerrar sesión" className="altix-vendor-button altix-vendor-secondary p-2"><LogOut size={17} /></button></div></aside><div className="min-h-screen md:pl-60"><header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden"><span className="text-base font-semibold tracking-[0.16em]">ALTIX</span><button onClick={logout} title="Cerrar sesión" className="altix-vendor-button altix-vendor-secondary min-h-11 min-w-11 p-2"><LogOut size={18} /></button></header><main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8"><VendorPageBoundary><Outlet /></VendorPageBoundary></main><div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_14px_rgba(0,0,0,0.06)] backdrop-blur md:hidden"><nav className="mx-auto grid max-w-lg grid-cols-5">{mobileItems.map(([label, path, Icon]) => <Link key={path} to={path} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] transition-colors ${isActive(path) ? 'font-semibold text-blue-700' : 'text-gray-500'}`}><Icon size={19} /><span>{label === 'Nueva venta' ? 'Venta' : label}</span></Link>)}<button type="button" onClick={() => setMoreOpen((value) => !value)} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] transition-colors ${moreOpen ? 'font-semibold text-blue-700' : 'text-gray-500'}`}><MoreHorizontal size={19} /><span>Más</span></button></nav>{moreOpen && <><button type="button" aria-label="Cerrar menú Más" onClick={() => setMoreOpen(false)} className="fixed inset-0 -z-10 bg-gray-950/20" /><div className="absolute bottom-full inset-x-2 mb-2 grid grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-white p-2 pb-3 shadow-xl"><div className="col-span-2 flex items-center justify-between border-b border-gray-100 px-2 pb-2"><span className="text-sm font-semibold text-gray-950">Más opciones</span><button type="button" onClick={() => setMoreOpen(false)} className="min-h-11 min-w-11 text-xs font-medium text-gray-500">Cerrar</button></div>{secondaryItems.map(([label, path, Icon]) => <Link key={path} to={path} onClick={() => setMoreOpen(false)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-gray-700 transition-colors hover:bg-gray-50"><Icon size={16} />{label}{label === 'Solicitudes' && unreadApprovals > 0 ? ` (${unreadApprovals > 99 ? '99+' : unreadApprovals})` : ''}</Link>)}</div></>}</div></div></div>;
};
