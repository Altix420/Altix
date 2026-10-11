import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, FileText, Package, Wallet, CreditCard, Users, Palette, Store, BarChart3, ShieldCheck, Settings, LogOut, UserRound, MoreHorizontal, type LucideIcon } from 'lucide-react';
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
const mobileItems = allItems.filter(([label]) => ['Ventas', 'Inventario', 'Clientes'].includes(label));

export const Layout: React.FC = () => {
  const { profile, sucursalActiva, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
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
  const secondaryItems = allItems.filter(([label]) => !mobileItems.some(([mobileLabel]) => mobileLabel === label));

  return (
    <div className="min-h-screen text-gray-900" style={{ background: 'var(--altix-background)' }}>

      {/* ── Sidebar (desktop) ── */}
      <aside
        className="fixed inset-y-0 left-0 hidden w-[15rem] md:flex md:flex-col"
        style={{ background: 'var(--altix-sidebar-bg)', borderRight: '1px solid var(--altix-sidebar-border)' }}
      >
        {/* Logo */}
        <div
          className="flex h-[3.75rem] flex-shrink-0 items-center px-5"
          style={{ borderBottom: '1px solid var(--altix-sidebar-border)' }}
        >
          <span
            className="text-[1.0625rem] font-bold tracking-[0.22em]"
            style={{ color: 'var(--altix-sidebar-logo)' }}
          >
            ALTIX
          </span>
          <span
            className="ml-auto rounded px-1.5 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-widest"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--altix-sidebar-text)' }}
          >
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3.5 space-y-0.5">
          {/* Dashboard link */}
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            style={
              isActive('/admin/dashboard')
                ? { background: 'var(--altix-sidebar-item-active-bg)', color: 'var(--altix-sidebar-text-active)' }
                : { color: 'var(--altix-sidebar-text)' }
            }
            onMouseEnter={e => { if (!isActive('/admin/dashboard')) (e.currentTarget as HTMLElement).style.background = 'var(--altix-sidebar-item-hover-bg)'; }}
            onMouseLeave={e => { if (!isActive('/admin/dashboard')) (e.currentTarget as HTMLElement).style.background = ''; }}
          >
            <LayoutDashboard size={16} strokeWidth={1.75} />
            <span>Dashboard</span>
            {isActive('/admin/dashboard') && (
              <span
                className="absolute left-0 h-5 w-[3px] rounded-r"
                style={{ background: 'var(--altix-sidebar-item-active-border)' }}
              />
            )}
          </Link>

          {/* Groups */}
          {groups.map(group => (
            <div key={group.label} className="mt-4 first:mt-0">
              <p
                className="mb-1 px-3 text-[0.625rem] font-semibold uppercase tracking-[0.14em]"
                style={{ color: 'var(--altix-sidebar-label)' }}
              >
                {group.label}
              </p>
              {group.items.map(([label, path, Icon]) => (
                <Link
                  key={path}
                  to={path}
                  className="relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                  style={
                    isActive(path)
                      ? { background: 'var(--altix-sidebar-item-active-bg)', color: 'var(--altix-sidebar-text-active)', fontWeight: 500 }
                      : { color: 'var(--altix-sidebar-text)' }
                  }
                  onMouseEnter={e => { if (!isActive(path)) (e.currentTarget as HTMLElement).style.background = 'var(--altix-sidebar-item-hover-bg)'; }}
                  onMouseLeave={e => { if (!isActive(path)) (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                  {isActive(path) && (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r"
                      style={{ background: 'var(--altix-sidebar-item-active-border)' }}
                    />
                  )}
                  <Icon size={15} strokeWidth={1.75} />
                  <span className="flex-1">{label}</span>
                  {label === 'Aprobaciones' && pendingApprovals > 0 && (
                    <span
                      aria-label={`${pendingApprovals} aprobaciones pendientes`}
                      className="altix-nav-badge"
                    >
                      {pendingApprovals > 99 ? '99+' : pendingApprovals}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderTop: '1px solid var(--altix-sidebar-border)' }}
        >
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}
          >
            {profile?.nombre_completo?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" style={{ color: 'var(--altix-sidebar-text-active)' }}>
              {profile?.nombre_completo}
            </p>
            <p className="truncate text-xs capitalize" style={{ color: 'var(--altix-sidebar-text)' }}>
              {profile?.role} · {sucursalActiva?.nombre || 'Central'}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            title="Cerrar sesión"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--altix-sidebar-text)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--altix-sidebar-item-hover-bg)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
          >
            <LogOut size={15} strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="min-h-screen md:pl-[15rem]">

        {/* Mobile header */}
        <header
          className="flex h-[3.75rem] items-center justify-between px-4 md:hidden"
          style={{
            background: 'var(--altix-header-bg)',
            borderBottom: '1px solid var(--altix-header-border)',
            boxShadow: 'var(--altix-shadow-xs)',
          }}
        >
          <span className="text-base font-bold tracking-[0.2em]" style={{ color: 'var(--altix-text-primary)' }}>
            ALTIX
          </span>
          <button
            onClick={handleSignOut}
            title="Cerrar sesión"
            className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--altix-text-muted)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f3f4f6'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
          >
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </header>

        {/* Page content */}
        <main className="altix-safe-bottom mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <div
          className="fixed inset-x-0 bottom-0 z-40 px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
          style={{
            background: 'var(--altix-botnav-bg)',
            borderTop: '1px solid var(--altix-botnav-border)',
            boxShadow: '0 -4px 18px rgb(15 23 42 / 0.08)',
          }}
        >
          <nav className="mx-auto grid max-w-lg grid-cols-5">
            {/* Dashboard tab */}
            <Link
              to="/admin/dashboard"
              className="flex min-h-[3.5rem] flex-col items-center justify-center gap-1 text-[0.625rem] font-medium transition-colors"
              style={{
                color: isActive('/admin/dashboard') ? 'var(--altix-botnav-active)' : 'var(--altix-botnav-text)',
              }}
            >
              <LayoutDashboard size={20} strokeWidth={isActive('/admin/dashboard') ? 2.25 : 1.75} />
              <span>Inicio</span>
            </Link>

            {mobileItems.map(([label, path, Icon]) => (
              <Link
                key={path}
                to={path}
                className="flex min-h-[3.5rem] flex-col items-center justify-center gap-1 text-[0.625rem] font-medium transition-colors"
                style={{
                  color: isActive(path) ? 'var(--altix-botnav-active)' : 'var(--altix-botnav-text)',
                }}
              >
                <Icon size={20} strokeWidth={isActive(path) ? 2.25 : 1.75} />
                <span>{label}</span>
                {label === 'Aprobaciones' && pendingApprovals > 0 && (
                  <span className="absolute">{pendingApprovals}</span>
                )}
              </Link>
            ))}

            {/* Más button */}
            <button
              type="button"
              onClick={() => setMoreOpen(value => !value)}
              className="flex min-h-[3.5rem] flex-col items-center justify-center gap-1 text-[0.625rem] font-medium transition-colors"
              style={{ color: moreOpen ? 'var(--altix-botnav-active)' : 'var(--altix-botnav-text)' }}
            >
              <MoreHorizontal size={20} strokeWidth={moreOpen ? 2.25 : 1.75} />
              <span>Más</span>
            </button>
          </nav>

          {/* Más expanded menu */}
          {moreOpen && (
            <div
              className="absolute inset-x-2 bottom-full mb-2 max-h-[65vh] overflow-y-auto rounded-xl p-2 shadow-xl"
              style={{
                background: 'var(--altix-surface)',
                border: '1px solid var(--altix-border)',
                boxShadow: 'var(--altix-shadow-lg)',
              }}
            >
              <div
                className="mb-2 flex items-center justify-between border-b px-2 pb-2"
                style={{ borderColor: 'var(--altix-border)' }}
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--altix-text-primary)' }}>Más opciones</span>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="text-xs font-medium"
                  style={{ color: 'var(--altix-text-muted)' }}
                >
                  Cerrar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {secondaryItems.map(([label, path, Icon]) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-[2.75rem] items-center gap-2 rounded-lg px-3 text-sm transition-colors hover:bg-gray-50"
                    style={{ color: 'var(--altix-text-secondary)' }}
                  >
                    <Icon size={15} strokeWidth={1.75} style={{ color: 'var(--altix-text-muted)', flexShrink: 0 }} />
                    {label}
                    {label === 'Aprobaciones' && pendingApprovals > 0
                      ? ` (${pendingApprovals > 99 ? '99+' : pendingApprovals})`
                      : ''}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
