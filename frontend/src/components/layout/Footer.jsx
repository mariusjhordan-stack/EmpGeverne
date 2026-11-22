import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const currentYear = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top page-wrap">
        <div className="footer-brand-block">
          <Link to="/" className="brand-mark" aria-label="Cronos Genève, inicio"><strong>CRONOS</strong><span>GENÈVE</span></Link>
          <p>Precisión, elegancia y tradición en cada pieza seleccionada.</p>
        </div>
        <div className="footer-column">
          <h2>Explorar</h2>
          <Link to="/catalogo">Catálogo</Link><Link to="/colecciones">Colecciones</Link><Link to="/nosotros">Nuestra casa</Link><Link to="/contacto">Contacto</Link>
        </div>
        <div className="footer-column">
          <h2>Atención</h2>
          <Link to="/perfil">Mi cuenta</Link><Link to="/pedidos">Mis pedidos</Link><Link to="/favoritos">Favoritos</Link><Link to="/faq">Preguntas frecuentes</Link>
        </div>
        <div className="footer-column footer-contact">
          <h2>Visítanos</h2>
          <p>Av. Javier Prado Este 4200<br />Lima, Perú</p>
          <Link to="/contacto" className="footer-contact-link">Escríbenos <ArrowUpRight size={14} /></Link>
        </div>
      </div>
      <div className="footer-bottom page-wrap">
        <span>© {currentYear} Cronos Genève · Empresariales</span>
        <div><Link to="/privacidad">Privacidad</Link><Link to="/terminos">Términos</Link></div>
        <span className="footer-signature">HECHA PARA PERDURAR</span>
      </div>
    </footer>
  );
}
