import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, UserRound, Menu, X, LogOut, Package, Settings, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GenevaClock, { MiniDial } from '../common/GenevaClock';
import { useCart } from '../../context/CartContext';

const navLinks = [
  { label: 'Inicio', to: '/', no: 'I' },
  { label: 'Catálogo', to: '/catalogo', no: 'II' },
  { label: 'Colecciones', to: '/colecciones', no: 'III' },
  { label: 'Nosotros', to: '/nosotros', no: 'IV' },
  { label: 'Contacto', to: '/contacto', no: 'V' },
];

export default function Header() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const meterRef = useRef(null);

  // Sticky navbar: glass after 24px, hides while scrolling down, returns on scroll up.
  useEffect(() => {
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      meterRef.current?.style.setProperty('--read', max > 0 ? (y / max).toFixed(4) : '0');
      setHidden(y > 240 && y > lastY.current + 4);
      if (y < lastY.current - 4 || y <= 240) setHidden(false);
      lastY.current = y;
      ticking = false;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); setUserMenuOpen(false); }, [pathname]);

  // let sticky page toolbars slide up when the header hides
  useEffect(() => {
    document.documentElement.toggleAttribute('data-header-hidden', hidden && !mobileOpen && !userMenuOpen);
  }, [hidden, mobileOpen, userMenuOpen]);

  useEffect(() => {
    if (!mobileOpen && !userMenuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setMobileOpen(false); setUserMenuOpen(false); } };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [mobileOpen, userMenuOpen]);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  const headerClass = ['site-header', (scrolled || mobileOpen) && 'is-scrolled', hidden && !mobileOpen && !userMenuOpen && 'is-hidden'].filter(Boolean).join(' ');

  return (
    <header className={headerClass}>
      <div className="header-inner">
        <Link to="/" className="brand-mark" aria-label="Cronos Genève, inicio">
          <MiniDial size={34} className="brand-mark__seal" />
          <span className="leading-none"><strong>Cronos</strong><span>GENÈVE<span className="hidden sm:inline"> · MCMLXXXVII</span></span></span>
        </Link>

        <nav className="site-nav" aria-label="Navegación principal">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `site-nav-link ${isActive ? 'active' : ''}`}>
              {link.label}<sup>{link.no}</sup>
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <GenevaClock className="header-clock" />
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
                <button type="button" aria-label="Cerrar menú" className="fixed inset-0 z-40 cursor-default bg-transparent border-0" onClick={() => setUserMenuOpen(false)} />
                <div className="user-popover">
                  <div className="px-3 pt-2 pb-3 mb-1 border-b" style={{ borderColor: 'var(--line)' }}>
                    <p className="truncate text-sm">{user?.first_name} {user?.last_name}</p>
                    <p className="mt-1 truncate text-xs text-mute">{user?.email}</p>
                  </div>
                  <Link to="/perfil"><Settings size={15} /> Mi perfil</Link>
                  <Link to="/pedidos"><Package size={15} /> Mis pedidos</Link>
                  {isAdmin && <Link to="/admin" className="text-accent"><ArrowUpRight size={15} /> Panel de administración</Link>}
                  <button type="button" onClick={handleLogout} style={{ color: 'var(--danger)' }}><LogOut size={15} /> Cerrar sesión</button>
                </div>
              </>}
            </div>
          ) : <Link to="/login" className="header-login">Ingresar</Link>}
          <button type="button" className="menu-toggle" aria-label={mobileOpen ? 'Cerrar navegación' : 'Abrir navegación'} aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
      <span ref={meterRef} className="header-meter" aria-hidden="true" />

      {mobileOpen && (
        <nav className="mobile-nav" aria-label="Navegación móvil">
          <p className="eyebrow eyebrow--line mb-6">Índice</p>
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
              <span className="mobile-nav-index">{link.no}</span><em>{link.label}</em>
            </NavLink>
          ))}
          {!isAuthenticated && <Link to="/login" className="btn btn-lg">Acceder a mi cuenta <ArrowUpRight size={16} /></Link>}
        </nav>
      )}
    </header>
  );
}
