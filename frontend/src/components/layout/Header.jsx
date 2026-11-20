import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, User, Menu, X, LogOut, Package, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function Header() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  const navLinks = [
    { label: 'Inicio', to: '/' },
    { label: 'Catálogo', to: '/catalogo' },
    { label: 'Colecciones', to: '/colecciones' },
    { label: 'Nosotros', to: '/nosotros' },
    { label: 'Contacto', to: '/contacto' },
  ];

  return (
    <header className="bg-charcoal text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <span className="font-serif text-xl md:text-2xl tracking-wider text-gold">CRONOS</span>
            <span className="text-xs tracking-[0.3em] text-gray-400 hidden sm:block">GENÈVE</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} className="text-sm tracking-wider text-gray-300 hover:text-gold transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 md:gap-4">
            {isAuthenticated && (
              <Link to="/favoritos" className="text-gray-300 hover:text-gold transition-colors">
                <Heart size={20} />
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/carrito" className="relative text-gray-300 hover:text-gold transition-colors">
                <ShoppingBag size={20} />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gold text-charcoal text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                    {itemCount}
                  </span>
                )}
              </Link>
            )}

            {isAuthenticated ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="text-gray-300 hover:text-gold transition-colors">
                  <User size={20} />
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white text-charcoal rounded-lg shadow-xl z-50 py-2 animate-fade-in-down">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium truncate">{user?.first_name} {user?.last_name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                      <Link to="/perfil" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50">
                        <Settings size={16} /> Mi perfil
                      </Link>
                      <Link to="/pedidos" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50">
                        <Package size={16} /> Mis pedidos
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-gold-dark font-medium">
                          <Settings size={16} /> Panel Admin
                        </Link>
                      )}
                      <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 w-full text-red-600">
                        <LogOut size={16} /> Cerrar sesión
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to="/login" className="text-sm tracking-wider text-gray-300 hover:text-gold transition-colors">
                Ingresar
              </Link>
            )}

            <button className="lg:hidden text-gray-300 hover:text-gold" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="lg:hidden pb-4 border-t border-gray-800 animate-fade-in-down">
            {navLinks.map((l) => (
              <Link
                key={l.to} to={l.to}
                className="block py-3 text-sm tracking-wider text-gray-300 hover:text-gold transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
