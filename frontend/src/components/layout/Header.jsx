import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, UserRound, Menu, X, LogOut, Package, Settings, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const navLinks = [
  { label: 'Inicio', to: '/' },
  { label: 'Catálogo', to: '/catalogo' },
  { label: 'Colecciones', to: '/colecciones' },
  { label: 'Nosotros', to: '/nosotros' },
  { label: 'Contacto', to: '/contacto' },
];

export default function Header() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(window.scrollY > 24);

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  const closeMobile = () => setMobileOpen(false);
  const linkClass = ({ isActive }) => `site-nav-link ${isActive ? 'active' : ''}`;

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="header-inner">
        <Link to="/" className="brand-mark" aria-label="Cronos Genève, inicio" onClick={closeMobile}>
          <strong>CRONOS</strong><span>GENÈVE</span>
        </Link>

        <nav className="site-nav desktop" aria-label="Navegación principal">
          {navLinks.map((link) => <NavLink key={link.to} to={link.to} end={link.to === '/'} className={linkClass}>{link.label}</NavLink>)}
        </nav>

        <div className="header-actions">
          {isAuthenticated && (
            <Link to="/favoritos" className="header-icon" aria-label="Favoritos" title="Favoritos"><Heart size={18} strokeWidth={1.5} /></Link>
          )}
          {isAuthenticated && (
            <Link to="/carrito" className="header-icon" aria-label={`Carrito${itemCount ? `, ${itemCount} artículos` : ''}`} title="Carrito">
              <ShoppingBag size={18} strokeWidth={1.5} />{itemCount > 0 && <span className="count">{itemCount}</span>}
            </Link>
          )}
          {isAuthenticated ? (
            <div className="relative">
              <button type="button" aria-label="Abrir menú de usuario" aria-expanded={userMenuOpen} onClick={() => setUserMenuOpen(!userMenuOpen)} className="header-icon">
                <UserRound size={18} strokeWidth={1.5} />
              </button>
              {userMenuOpen && <>
                <button type="button" aria-label="Cerrar menú" className="fixed inset-0 z-40 cursor-default" onClick={() => setUserMenuOpen(false)} />
                <div className="user-popover animate-fade-in-down">
                  <div className="border-b border-gray-800 px-3 py-3">
                    <p className="truncate text-sm text-white">{user?.first_name} {user?.last_name}</p>
                    <p className="mt-1 truncate text-xs text-gray-400">{user?.email}</p>
                  </div>
                  <Link to="/perfil" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 text-sm hover:text-gold"><Settings size={15} /> Mi perfil</Link>
                  <Link to="/pedidos" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 text-sm hover:text-gold"><Package size={15} /> Mis pedidos</Link>
                  {isAdmin && <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 text-sm text-gold"><ArrowUpRight size={15} /> Panel de administración</Link>}
                  <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm text-red-400 hover:text-red-300"><LogOut size={15} /> Cerrar sesión</button>
                </div>
              </>}
            </div>
          ) : <Link to="/login" className="header-login">Ingresar</Link>}
          <button type="button" className="menu-toggle" aria-label={mobileOpen ? 'Cerrar navegación' : 'Abrir navegación'} aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {mobileOpen && <nav className="mobile-nav" aria-label="Navegación móvil">
        <p className="editorial-kicker mb-5">CRONOS GENÈVE · EXPLORAR</p>
        {navLinks.map((link, index) => <NavLink key={link.to} to={link.to} end={link.to === '/'} onClick={closeMobile} className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
          <span className="mobile-nav-index">0{index + 1}</span>{link.label}
        </NavLink>)}
        {!isAuthenticated && <Link to="/login" onClick={closeMobile} className="mobile-login">Acceder a mi cuenta <ArrowUpRight size={16} /></Link>}
      </nav>}
    </header>
  );
}
