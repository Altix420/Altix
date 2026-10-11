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
    return (
      <div
        className="rounded-xl border p-6 text-sm"
        style={{ borderColor: '#fecaca', background: '#fef2f2', color: 'var(--altix-danger)' }}
      >
        <h1 className="font-semibold">No se pudo cargar esta sección.</h1>
        <p className="mt-1" style={{ color: 'var(--altix-text-secondary)' }}>
          La navegación sigue disponible. Puedes volver o recargar esta pantalla.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="altix-button altix-button-secondary"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="altix-button altix-button-primary"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }
}

export const VendorLayout: React.FC = () => {
  const { profile, sucursalActiva, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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

  return (
    <div className="altix-safe-bottom min-h-screen md:pb-0" style={{ background: 'var(--altix-background)', color: 'var(--altix-text-primary)' }}>

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
            Venta
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3.5 space-y-0.5">
          {items.map(([label, path, Icon]) => (
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
              {label === 'Solicitudes' && unreadApprovals > 0 && (
                <span
                  aria-label={`${unreadApprovals} respuestas nuevas`}
                  className="altix-nav-badge"
                >
                  {unreadApprovals > 99 ? '99+' : unreadApprovals}
                </span>
              )}
            </Link>
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
            <p className="truncate text-xs" style={{ color: 'var(--altix-sidebar-text)' }}>
              {sucursalActiva?.nombre ?? 'Sin sucursal'}
            </p>
          </div>
          <button
            onClick={logout}
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
            onClick={logout}
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
        <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <VendorPageBoundary>
            <Outlet />
          </VendorPageBoundary>
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
                <span>{label === 'Nueva venta' ? 'Venta' : label}</span>
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
            <>
              {/* Backdrop */}
              <button
                type="button"
                aria-label="Cerrar menú Más"
                onClick={() => setMoreOpen(false)}
                className="fixed inset-0 -z-10"
                style={{ background: 'rgb(15 23 42 / 0.2)' }}
              />

              <div
                className="absolute inset-x-2 bottom-full mb-2 rounded-xl p-2 pb-3 shadow-xl"
                style={{
                  background: 'var(--altix-surface)',
                  border: '1px solid var(--altix-border)',
                  boxShadow: 'var(--altix-shadow-lg)',
                }}
              >
                {/* Header */}
                <div
                  className="mb-2 flex items-center justify-between border-b px-2 pb-2"
                  style={{ borderColor: 'var(--altix-border)' }}
                >
                  <span className="text-sm font-semibold" style={{ color: 'var(--altix-text-primary)' }}>Más opciones</span>
                  <button
                    type="button"
                    onClick={() => setMoreOpen(false)}
                    className="min-h-[2.75rem] min-w-[2.75rem] text-xs font-medium"
                    style={{ color: 'var(--altix-text-muted)' }}
                  >
                    Cerrar
                  </button>
                </div>

                {/* Grid of secondary items */}
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
                      <span className="flex-1">{label}</span>
                      {label === 'Solicitudes' && unreadApprovals > 0 && (
                        <span className="altix-nav-badge">{unreadApprovals > 99 ? '99+' : unreadApprovals}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
