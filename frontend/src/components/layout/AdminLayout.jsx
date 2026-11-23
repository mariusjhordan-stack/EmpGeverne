import { Outlet, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Watch, Tags, Layers, Package, Users, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PageTransition from '../common/PageTransition';

const navItems = [
  { label: 'Panel', to: '/admin', icon: LayoutDashboard },
  { label: 'Relojes', to: '/admin/relojes', icon: Watch },
  { label: 'Marcas', to: '/admin/marcas', icon: Tags },
  { label: 'Colecciones', to: '/admin/colecciones', icon: Layers },
  { label: 'Pedidos', to: '/admin/pedidos', icon: Package },
  { label: 'Clientes', to: '/admin/clientes', icon: Users },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const title = navItems.find((item) => pathname === item.to || (item.to !== '/admin' && pathname.startsWith(item.to)))?.label || 'Panel';
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/admin" className="brand-mark px-3 pt-2"><strong>CRONOS</strong><span>ADMIN</span></Link>
        <div className="divider" />
        <nav className="flex-1 grid content-start gap-1" aria-label="Administración">
          {navItems.map((item) => {
            const Icon = item.icon;
            return <NavLink key={item.to} to={item.to} end={item.to === '/admin'} className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}><Icon size={18} strokeWidth={1.6} />{item.label}</NavLink>;
          })}
        </nav>
        <div className="divider" />
        <div className="grid gap-1">
          <Link to="/" className="admin-nav-link"><ArrowLeft size={18} />Volver a la tienda</Link>
          <button onClick={() => { logout(); navigate('/'); }} className="admin-nav-link w-full text-left"><LogOut size={18} />Cerrar sesión</button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="admin-topbar">
          <div><span className="eyebrow eyebrow--accent hidden sm:inline-flex">Administración</span><h1 className="display-sm">{title}</h1></div>
          <span className="body-sm max-w-[45%] truncate">{user?.email}</span>
        </header>
        <nav className="flex gap-2 overflow-x-auto px-4 py-4 lg:hidden" aria-label="Administración móvil">
          {navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/admin'} className={({ isActive }) => `chip ${isActive ? 'is-active' : ''}`}>{item.label}</NavLink>)}
          <Link to="/" className="chip">Tienda</Link>
          <button onClick={() => { logout(); navigate('/'); }} className="chip">Salir</button>
        </nav>
        <main className="admin-main"><PageTransition><Outlet /></PageTransition></main>
      </div>
    </div>
  );
}
