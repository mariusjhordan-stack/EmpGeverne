import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import PageTransition from '../common/PageTransition';

export default function StoreLayout() {
  const { pathname } = useLocation();
  return (
    <div className={`store-shell min-h-screen flex flex-col ${pathname === '/' ? 'is-home' : 'has-inner-header'}`}>
      <Header />
      <main className="flex-1">
        <PageTransition><Outlet /></PageTransition>
      </main>
      <Footer />
    </div>
  );
}
