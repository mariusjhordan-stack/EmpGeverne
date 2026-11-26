import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import PageTransition from '../common/PageTransition';
import Concierge from '../advisor/Concierge';

export default function StoreLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return (
    <div className={`store-shell ${pathname === '/' ? 'is-home' : 'has-inner-header'}`}>
      <Header />
      <main className="store-main">
        <PageTransition><Outlet /></PageTransition>
      </main>
      <Footer />
      <Concierge />
    </div>
  );
}
