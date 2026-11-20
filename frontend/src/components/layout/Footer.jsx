import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-charcoal text-gray-400">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <h3 className="font-serif text-xl text-gold tracking-wider mb-4">CRONOS GENÈVE</h3>
            <p className="text-sm leading-relaxed">
              Excelencia en relojería suiza. Precisión, elegancia y tradición desde Ginebra.
            </p>
          </div>
          <div>
            <h4 className="text-white text-sm font-semibold tracking-wider mb-4">EXPLORAR</h4>
            <div className="flex flex-col gap-2">
              <Link to="/catalogo" className="text-sm hover:text-gold transition-colors">Catálogo</Link>
              <Link to="/colecciones" className="text-sm hover:text-gold transition-colors">Colecciones</Link>
              <Link to="/nosotros" className="text-sm hover:text-gold transition-colors">Nosotros</Link>
              <Link to="/contacto" className="text-sm hover:text-gold transition-colors">Contacto</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white text-sm font-semibold tracking-wider mb-4">CLIENTE</h4>
            <div className="flex flex-col gap-2">
              <Link to="/perfil" className="text-sm hover:text-gold transition-colors">Mi cuenta</Link>
              <Link to="/pedidos" className="text-sm hover:text-gold transition-colors">Mis pedidos</Link>
              <Link to="/favoritos" className="text-sm hover:text-gold transition-colors">Favoritos</Link>
              <Link to="/faq" className="text-sm hover:text-gold transition-colors">Preguntas frecuentes</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white text-sm font-semibold tracking-wider mb-4">LEGAL</h4>
            <div className="flex flex-col gap-2">
              <Link to="/privacidad" className="text-sm hover:text-gold transition-colors">Política de privacidad</Link>
              <Link to="/terminos" className="text-sm hover:text-gold transition-colors">Términos y condiciones</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} Cronos Genève. Proyecto académico — Desarrollo de Aplicaciones Empresariales.</p>
        </div>
      </div>
    </footer>
  );
}
