import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import Reveal from '../common/Reveal';

const currentYear = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <Reveal className="footer-col grid content-start gap-6">
            <Link to="/" className="brand-mark" aria-label="Cronos Genève, inicio"><strong>Cronos</strong><span>GENÈVE</span></Link>
            <p className="display-sm max-w-[16ch]" style={{ color: 'var(--fg)' }}>Relojes que se heredan, <em>no que se reemplazan.</em></p>
            <Link to="/contacto" className="btn-link w-fit">Agendar una visita privada <ArrowUpRight size={14} /></Link>
          </Reveal>
          <Reveal className="footer-col" delay={80}>
            <h2>Explorar</h2>
            <Link to="/catalogo">Catálogo</Link>
            <Link to="/colecciones">Colecciones</Link>
            <Link to="/nosotros">Nuestra casa</Link>
            <Link to="/contacto">Contacto</Link>
          </Reveal>
          <Reveal className="footer-col" delay={160}>
            <h2>Atención</h2>
            <Link to="/perfil">Mi cuenta</Link>
            <Link to="/pedidos">Mis pedidos</Link>
            <Link to="/favoritos">Favoritos</Link>
            <Link to="/faq">Preguntas frecuentes</Link>
          </Reveal>
          <Reveal className="footer-col" delay={240}>
            <h2>Boutique</h2>
            <p>Av. Javier Prado Este 4200<br />Lima, Perú</p>
            <p className="num text-mute">Lun — Sáb · 10:00 — 20:00</p>
          </Reveal>
        </div>
      </div>
      <p className="footer-wordmark" aria-hidden="true">Cronos</p>
      <div className="container">
        <div className="footer-bottom">
          <span>© {currentYear} Cronos Genève</span>
          <div className="flex gap-6"><Link to="/privacidad">Privacidad</Link><Link to="/terminos">Términos</Link></div>
          <span>Genève · Lima</span>
        </div>
      </div>
    </footer>
  );
}
