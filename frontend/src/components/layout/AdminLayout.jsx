import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Watch, Tags, Layers, Package, Users, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PageTransition from '../common/PageTransition';

const navItems = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
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

  return (
    <div className="admin-shell min-h-screen flex">
      <aside className="admin-sidebar w-64 flex-shrink-0 hidden lg:flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="font-serif text-lg text-gold tracking-wider">CRONOS ADMIN</h1>
          <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || (item.to !== '/admin' && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to} to={item.to}
                className={`admin-nav-link flex items-center gap-3 px-6 py-3 text-sm transition-colors ${active ? 'active' : 'text-gray-400'}`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-3">
            <ArrowLeft size={16} /> Volver a la tienda
          </Link>
          <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="admin-main flex-1 flex flex-col min-h-screen">
        <header className="admin-topbar px-6 py-4 flex items-center justify-between lg:hidden">
          <h1 className="font-serif text-lg text-gold tracking-wider">CRONOS ADMIN</h1>
          <Link to="/" className="text-sm text-gray-500 hover:text-charcoal">Tienda</Link>
        </header>

        <div className="admin-topbar lg:hidden overflow-x-auto">
          <div className="flex px-4 py-2 gap-1">
            {navItems.map((item) => {
              const active = pathname === item.to || (item.to !== '/admin' && pathname.startsWith(item.to));
              return (
                <Link key={item.to} to={item.to}
                  className={`admin-nav-link inline-flex px-3 py-2 text-xs whitespace-nowrap ${active ? 'active' : 'text-gray-500'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <PageTransition><Outlet /></PageTransition>
        </main>
      </div>
    </div>
  );
}
