import { Outlet, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Watch, Tags, Layers, Package, Users, ArrowUpRight, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PageTransition from '../common/PageTransition';

const navItems = [
  { label: 'Panel', to: '/admin', icon: LayoutDashboard, hint: 'Resumen' },
  { label: 'Pedidos', to: '/admin/pedidos', icon: Package, hint: 'Ventas' },
  { label: 'Relojes', to: '/admin/relojes', icon: Watch, hint: 'Catálogo' },
  { label: 'Marcas', to: '/admin/marcas', icon: Tags, hint: 'Casas' },
  { label: 'Colecciones', to: '/admin/colecciones', icon: Layers, hint: 'Líneas' },
  { label: 'Clientes', to: '/admin/clientes', icon: Users, hint: 'Cuentas' },
];

/** Esfera pequeña de la marca (misma idea que el logo de la tienda). */
function Dial() {
  return (
    <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true" className="admin-brand__dial">
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeWidth="1" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="20" y1="3.5" x2="20" y2={i % 3 === 0 ? 7.5 : 5.5} stroke="currentColor" strokeWidth={i % 3 === 0 ? 1.4 : 0.8} transform={`rotate(${i * 30} 20 20)`} />
      ))}
      <line x1="20" y1="20" x2="20" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" transform="rotate(-50 20 20)" />
      <line x1="20" y1="20" x2="20" y2="7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" transform="rotate(60 20 20)" />
      <circle cx="20" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}

function initials(user) {
  const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || '?';
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function AdminLayout() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const current = navItems.find((item) => pathname === item.to || (item.to !== '/admin' && pathname.startsWith(item.to))) || navItems[0];
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  const signOut = () => { logout(); navigate('/'); };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/admin" className="admin-brand">
          <Dial />
          <span><strong>CRONOS</strong><small>Genève · Atelier</small></span>
        </Link>

        <p className="admin-section">Gestión</p>
        <nav className="grid content-start gap-1" aria-label="Administración">
          {navItems.map(({ label, to, icon: Icon, hint }) => (
            <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={17} strokeWidth={1.6} />
              <span className="flex-1">{label}</span>
              <small>{hint}</small>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto grid gap-3">
          <Link to="/" className="admin-store-link">Ver la tienda <ArrowUpRight size={15} /></Link>
          <div className="admin-user">
            <span className="admin-avatar">{initials(user)}</span>
            <span className="min-w-0 flex-1">
              <strong className="truncate">{fullName || 'Administrador'}</strong>
              <small className="truncate">{user?.email}</small>
            </span>
            <button type="button" onClick={signOut} className="admin-icon-btn" aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="admin-topbar">
          <div className="min-w-0">
            <p className="admin-crumb">Administración <span>/</span> {current.hint}</p>
            <h1 className="admin-title">{current.label}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="admin-role hidden sm:inline-flex">Administrador</span>
            <span className="admin-avatar admin-avatar--sm" title={user?.email}>{initials(user)}</span>
          </div>
        </header>
        <nav className="admin-mobile-nav lg:hidden" aria-label="Administración móvil">
          {navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/admin'} className={({ isActive }) => `chip ${isActive ? 'is-active' : ''}`}>{item.label}</NavLink>)}
          <Link to="/" className="chip">Tienda</Link>
          <button type="button" onClick={signOut} className="chip">Salir</button>
        </nav>
        <main className="admin-main"><PageTransition><Outlet /></PageTransition></main>
      </div>
    </div>
  );
}
