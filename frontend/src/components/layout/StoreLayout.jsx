import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import PageTransition from '../common/PageTransition';
import Concierge from '../advisor/Concierge';
import SmoothScroll from '../fx/SmoothScroll';
import { scrollToTop } from '../fx/scroll';
import Intro from '../fx/Intro';
import Cursor from '../fx/Cursor';

export default function StoreLayout() {
  const { pathname } = useLocation();
  useEffect(() => { scrollToTop(); }, [pathname]);
  return (
    <div className={`store-shell ${pathname === '/' ? 'is-home' : 'has-inner-header'}`}>
      {/* el orden importa: el scroll suave se crea antes que el telón de entrada */}
      <SmoothScroll />
      <Intro enabled={pathname === '/'} />
      <Header />
      <main className="store-main">
        <PageTransition><Outlet /></PageTransition>
      </main>
      <Footer />
      <Concierge />
      <Cursor />
      <div className="grain" aria-hidden="true" />
    </div>
  );
}
