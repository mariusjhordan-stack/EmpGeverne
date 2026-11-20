import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Truck, Award, Clock } from 'lucide-react';
import api from '../../services/api';
import WatchCard from '../../components/catalog/WatchCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/catalog/watches/featured/'),
      api.get('/catalog/collections/'),
    ]).then(([fw, cw]) => {
      setFeatured(fw.data);
      setCollections(cw.data.results || cw.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-charcoal text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-24 md:py-36 relative z-10">
          <div className="max-w-2xl">
            <p className="animate-fade-in-up text-gold tracking-[0.3em] text-xs mb-4">HAUTE HORLOGERIE</p>
            <h1 className="animate-fade-in-up stagger-1 font-serif text-4xl md:text-6xl lg:text-7xl leading-tight mb-6">
              El arte de medir el tiempo
            </h1>
            <p className="animate-fade-in-up stagger-2 text-gray-400 text-lg mb-8 leading-relaxed">
              Descubra nuestra colección exclusiva de relojes de las más prestigiosas casas relojeras del mundo.
            </p>
            <Link to="/catalogo" className="animate-fade-in-up stagger-3 inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-charcoal px-8 py-3 text-sm tracking-wider transition-all duration-300 hover:gap-4">
              EXPLORAR CATÁLOGO <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/95 to-charcoal/70" />
      </section>

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-12 animate-fade-in-up">
          <p className="text-gold tracking-[0.3em] text-xs mb-3">SELECCIÓN</p>
          <h2 className="font-serif text-3xl md:text-4xl text-charcoal">Piezas Destacadas</h2>
        </div>
        {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((w, i) => (
              <div key={w.id} className={`animate-fade-in-up stagger-${i + 1}`}>
                <WatchCard watch={w} />
              </div>
            ))}
          </div>
        )}
        <div className="text-center mt-10 animate-fade-in">
          <Link to="/catalogo" className="inline-flex items-center gap-2 text-sm tracking-wider text-charcoal hover:text-gold transition-all duration-300 border-b border-charcoal hover:border-gold pb-1 hover:gap-4">
            VER TODO EL CATÁLOGO <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Collections */}
      {collections.length > 0 && (
        <section className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-gold tracking-[0.3em] text-xs mb-3">COLECCIONES</p>
              <h2 className="font-serif text-3xl md:text-4xl text-charcoal">Nuestras Líneas</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {collections.map((c, i) => (
                <Link key={c.id} to={`/catalogo?collection=${c.id}`} className={`animate-fade-in-up stagger-${i + 1} group text-center p-8 bg-ivory rounded-lg hover:shadow-md transition-all duration-300 hover:-translate-y-1`}>
                  <h3 className="font-serif text-xl text-charcoal mb-2 group-hover:text-gold transition-colors duration-300">{c.name}</h3>
                  <p className="text-sm text-gray-500 mb-3">{c.description}</p>
                  <span className="text-xs text-gold tracking-wider">{c.watch_count} relojes</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About brand */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-gold tracking-[0.3em] text-xs mb-3">NUESTRA HISTORIA</p>
            <h2 className="font-serif text-3xl md:text-4xl text-charcoal mb-6">La esencia de la relojería suiza</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Cronos Genève nace de la pasión por la alta relojería y el compromiso con la excelencia.
              Cada pieza en nuestra colección ha sido seleccionada por su maestría técnica, diseño excepcional y herencia relojera.
            </p>
            <Link to="/nosotros" className="text-sm tracking-wider text-gold hover:text-gold-dark transition-colors">
              CONOCER MÁS →
            </Link>
          </div>
          <div className="bg-charcoal rounded-lg p-12 text-center">
            <span className="font-serif text-6xl text-gold">CG</span>
            <p className="text-gray-400 mt-4 tracking-wider text-sm">SINCE 2024</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-charcoal text-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Shield, title: 'Autenticidad', desc: 'Garantía de autenticidad en cada pieza' },
              { icon: Truck, title: 'Envío seguro', desc: 'Envío asegurado con seguimiento' },
              { icon: Award, title: 'Certificación', desc: 'Relojes certificados por sus fabricantes' },
              { icon: Clock, title: 'Garantía', desc: 'Garantía oficial del fabricante' },
            ].map((f, i) => (
              <div key={f.title} className={`animate-fade-in-up stagger-${i + 1} text-center group`}>
                <f.icon className="mx-auto mb-4 text-gold transition-transform duration-300 group-hover:scale-110" size={32} />
                <h3 className="text-sm font-semibold tracking-wider mb-2">{f.title.toUpperCase()}</h3>
                <p className="text-sm text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
