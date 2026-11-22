import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Truck, Award, Clock } from 'lucide-react';
import api from '../../services/api';
import WatchCard from '../../components/catalog/WatchCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Reveal from '../../components/common/Reveal';
import RevealText from '../../components/common/RevealText';
import SectionHeader from '../../components/common/SectionHeader';
import Button from '../../components/common/Button';
import heroLifestyle from '../../assets/editorial/hero-lifestyle.jpg';
import atelierMovement from '../../assets/editorial/atelier-movement.jpg';
import luxeInterior from '../../assets/editorial/luxe-interior.jpg';

const collectionImages = [luxeInterior, atelierMovement, heroLifestyle, atelierMovement];

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/catalog/watches/featured/'), api.get('/catalog/collections/')])
      .then(([fw, cw]) => {
        setFeatured(fw.data);
        setCollections(cw.data.results || cw.data);
      }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const features = [
    { icon: Shield, title: 'Autenticidad', desc: 'Garantía de autenticidad en cada pieza' },
    { icon: Truck, title: 'Envío seguro', desc: 'Envío asegurado con seguimiento' },
    { icon: Award, title: 'Certificación', desc: 'Relojes certificados por sus fabricantes' },
    { icon: Clock, title: 'Garantía', desc: 'Garantía oficial del fabricante' },
  ];

  return (
    <div>
      <section className="hero-editorial hero-photographic">
        <div className="hero-photo" aria-hidden="true">
          <img src={heroLifestyle} alt="" fetchPriority="high" />
        </div>
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="editorial-kicker animate-fade-in-up">Alta relojería · Selección Genève</p>
            <h1><RevealText>El arte de medir el <em>tiempo.</em></RevealText></h1>
            <p className="animate-fade-in-up stagger-2">Una selección de relojes excepcionales, elegidos por su maestría técnica y su presencia atemporal.</p>
            <Button as={Link} to="/catalogo" className="animate-fade-in-up stagger-3">Explorar catálogo <ArrowRight size={15} /></Button>
          </div>
          <div className="hero-art hidden lg:grid" aria-hidden="true">
            <div className="hero-dial">
              <span className="dial-mark" />
              <span className="dial-mark horizontal" />
              <div className="dial-center">
                CRONOS
                <span>GENÈVE · 1875</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-bottomline page-wrap" aria-hidden="true"><span>CRONOS GENÈVE</span><span>01 / 04</span></div>
      </section>

      <section className="featured-band">
        <div className="editorial-section page-wrap">
          <Reveal>
            <SectionHeader eyebrow="Selección curada" title={<>Piezas <em>destacadas</em></>} description="Relojes que unen precisión, carácter y diseño en una misma pieza." />
          </Reveal>
          {loading ? <LoadingSpinner text="Cargando selección..." /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featured.map((watch, index) => <Reveal key={watch.id} delay={index * 75}><WatchCard watch={watch} /></Reveal>)}
            </div>
          )}
          <div className="mt-10 flex justify-end"><Link to="/catalogo" className="button-link">Ver todo el catálogo <ArrowRight size={14} /></Link></div>
        </div>
      </section>

      {collections.length > 0 && <section className="collections-band section-divider">
        <div className="page-wrap editorial-section">
          <Reveal><SectionHeader eyebrow="Universos Cronos" title={<>Nuestras <em>colecciones</em></>} description="Explore las líneas disponibles y encuentre la pieza que expresa su manera de medir el tiempo." /></Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {collections.map((collection, index) => <Reveal key={collection.id} delay={index * 60}>
              <Link to={`/catalogo?collection=${collection.id}`} className="collection-tile group block">
                <img src={collectionImages[index % collectionImages.length]} alt="" aria-hidden="true" loading="lazy" />
                <span className="collection-shade" aria-hidden="true" />
                <span className="editorial-kicker">Línea 0{index + 1}</span>
                <h3 className="mt-8 font-serif text-3xl group-hover:text-gold transition-colors">{collection.name}</h3>
                <p className="collection-desc mt-3 max-w-[240px] text-sm leading-6">{collection.description}</p>
                <span className="collection-link mt-6 inline-block text-xs tracking-wider">{collection.watch_count} relojes <span aria-hidden="true">→</span></span>
              </Link>
            </Reveal>)}
          </div>
        </div>
      </section>}

      <section className="brand-story-band">
        <div className="page-wrap brand-story-grid">
          <Reveal className="brand-story-copy">
            <p className="editorial-kicker">Nuestra casa</p>
            <h2 className="editorial-title mt-4 mb-6 text-5xl md:text-6xl">La esencia de la relojería <em>suiza</em></h2>
            <p className="max-w-xl leading-8 text-gray-500">Cronos Genève nace de la pasión por la alta relojería y el compromiso con la excelencia. Cada pieza de nuestra colección ha sido seleccionada por su maestría técnica, diseño excepcional y herencia relojera.</p>
            <Link to="/nosotros" className="button-link mt-7">Conocer más <ArrowRight size={14} /></Link>
          </Reveal>
          <Reveal delay={120}>
            <figure className="brand-story-image">
              <img src={luxeInterior} alt="Interior de tonos piedra y madera, inspiración para la selección Cronos Genève" loading="lazy" />
              <figcaption>Elegancia que trasciende el tiempo <span>— CRONOS GENÈVE</span></figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      <section className="atelier-editorial">
        <div className="atelier-photo"><img src={atelierMovement} alt="Detalle de un movimiento mecánico de reloj" loading="lazy" /></div>
        <div className="atelier-copy page-wrap">
          <Reveal>
            <p className="editorial-kicker">El arte en cada detalle</p>
            <h2 className="editorial-title">Precisión que se <em>siente.</em></h2>
            <p>Una mirada cercana a la mecánica, los acabados y la dedicación que dan carácter a la alta relojería.</p>
            <Link to="/catalogo" className="button-outline">Descubrir la selección <ArrowRight size={14} /></Link>
          </Reveal>
        </div>
      </section>

      <section className="trust-band">
        <div className="page-wrap grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, desc }) => <div key={title} className="trust-item group">
            <Icon className="mb-5 text-gold transition-transform duration-300 group-hover:-translate-y-1" size={25} strokeWidth={1.35} />
            <h3 className="text-xs font-semibold uppercase tracking-[.15em] text-charcoal">{title}</h3>
            <p className="mt-2 max-w-[220px] text-xs leading-6 text-gray-500">{desc}</p>
          </div>)}
        </div>
      </section>
    </div>
  );
}
