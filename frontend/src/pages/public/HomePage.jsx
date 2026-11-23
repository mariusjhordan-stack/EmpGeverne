import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import api from '../../services/api';
import WatchSequence from '../../components/home/WatchSequence';
import WatchCard, { formatPrice } from '../../components/catalog/WatchCard';
import { WatchCardSkeleton } from '../../components/common/Skeleton';
import Reveal, { RevealLines } from '../../components/common/Reveal';
import SectionHeader from '../../components/common/SectionHeader';
import heroLifestyle from '../../assets/editorial/hero-lifestyle.jpg';
import atelierMovement from '../../assets/editorial/atelier-movement.jpg';
import luxeInterior from '../../assets/editorial/luxe-interior.jpg';

const collectionImages = [luxeInterior, atelierMovement, heroLifestyle, luxeInterior];

/* Counts up once when scrolled into view. */
function CountUp({ value, duration = 1800 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return undefined; }
    let raf = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        setShown(Math.round(value * (1 - (1 - t) ** 4)));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    observer.observe(node);
    return () => { observer.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);
  return <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>{shown}</span>;
}

/* Translates an image inside its frame relative to scroll position. */
function ParallaxImage({ src, alt, strength = 70 }) {
  const frameRef = useRef(null);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = frame.getBoundingClientRect();
      const t = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      frame.style.setProperty('--py', `${(-t * strength).toFixed(1)}px`);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [strength]);
  return <div ref={frameRef} className="parallax-frame"><img src={src} alt={alt} loading="lazy" /></div>;
}

const services = [
  { n: '01', title: 'Autenticidad certificada', text: 'Cada pieza llega con documentación de origen y verificación independiente.' },
  { n: '02', title: 'Envío asegurado', text: 'Entrega en mano, asegurada por el valor total y con seguimiento en tiempo real.' },
  { n: '03', title: 'Garantía de manufactura', text: 'Cobertura oficial del fabricante y servicio técnico especializado.' },
  { n: '04', title: 'Asesoría privada', text: 'Un especialista le acompaña antes, durante y después de su elección.' },
];

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [collections, setCollections] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([api.get('/catalog/watches/featured/'), api.get('/catalog/collections/'), api.get('/catalog/brands/')])
      .then(([fw, cw, bw]) => {
        if (fw.status === 'fulfilled') setFeatured(fw.value.data.results || fw.value.data);
        if (cw.status === 'fulfilled') setCollections(cw.value.data.results || cw.value.data);
        if (bw.status === 'fulfilled') setBrands(bw.value.data.results || bw.value.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPieces = collections.reduce((sum, c) => sum + (c.watch_count || 0), 0) || 12;
  const hero = featured[0];
  const brandNames = brands.length ? brands.map((b) => b.name) : ['Rolex', 'Patek Philippe', 'Audemars Piguet', 'Omega', 'Cartier', 'TAG Heuer'];

  const stats = [
    { value: 1875, label: 'El año en que Le Brassus fijó el estándar que seguimos.' },
    { value: totalPieces, label: 'Piezas en catálogo, cada una revisada a mano.', suffix: 'pzs' },
    { value: brands.length || 6, label: 'Manufacturas suizas y francesas representadas.' },
    { value: 70, label: 'Horas de reserva de marcha en nuestros calibres insignia.', suffix: 'h' },
  ];

  return (
    <div>
      {/* Level 100 — image sequence hero (product turns on scroll) */}
      <WatchSequence />

      {/* Level 10 — numbers */}
      <section className="section">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-end mb-[clamp(48px,7vw,96px)]">
            <Reveal><p className="eyebrow eyebrow--line">Cronos en cifras</p></Reveal>
            <RevealLines as="h2" className="display-lg" lines={['Una casa pequeña,', <>con una <em>obsesión</em></>, 'muy grande.']} />
          </div>
          <div className="stats">
            {stats.map((s, i) => (
              <Reveal key={s.label} className="stat" delay={i * 90}>
                <span className="stat__value"><CountUp value={s.value} />{s.suffix && <sup>{s.suffix}</sup>}</span>
                <span className="stat__label">{s.label}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="marquee" aria-label="Manufacturas">
        {[0, 1].map((k) => (
          <div key={k} className="marquee__track" aria-hidden={k === 1}>
            {brandNames.map((name) => <span key={name} className="marquee__item">{name}</span>)}
          </div>
        ))}
      </div>

      {/* Level 30 — bento grid with editorial typography */}
      <section className="section">
        <div className="container">
          <SectionHeader className="mb-[clamp(36px,5vw,64px)]" eyebrow="La selección" title={<>Todo lo que <em>importa</em>, en una sola mirada.</>}
            action={<Link to="/catalogo" className="btn-link">Ver el catálogo completo <ArrowRight size={14} /></Link>} />

          <div className="bento">
            <Reveal as={Link} to="/catalogo" variant="scale" className="tile span-6 lg-span-7 tile--tall">
              <img className="tile__img" src={heroLifestyle} alt="" loading="lazy" />
              <span className="tile__shade" />
              <p className="eyebrow">Colección 2026</p>
              <div className="flex items-end justify-between gap-6">
                <h3 className="tile__title" style={{ fontSize: 'clamp(2.6rem,5vw,5rem)' }}>Hecho para<br /><em>la muñeca</em>,<br />no la vitrina.</h3>
                <span className="tile__arrow"><ArrowUpRight size={18} /></span>
              </div>
            </Reveal>

            <Reveal as={Link} to={hero ? `/catalogo/${hero.slug}` : '/catalogo'} delay={80} className="tile tile--paper span-3 lg-span-5">
              {hero?.primary_image && <img className="tile__product" src={hero.primary_image} alt="" loading="lazy" />}
              <p className="eyebrow">Pieza de la semana</p>
              <div className="max-w-[55%]">
                <p className="eyebrow mb-2">{hero?.brand_name || 'Cronos'}</p>
                <h3 className="tile__title" style={{ fontSize: 'clamp(1.8rem,2.6vw,2.6rem)' }}>{hero?.name || 'Cargando…'}</h3>
                {hero && <p className="price mt-3" style={{ color: '#141413' }}>{formatPrice(hero.price)}</p>}
              </div>
            </Reveal>

            <Reveal delay={160} className="tile tile--accent span-3 lg-span-5">
              <p className="eyebrow">Reserva de marcha</p>
              <div className="flex items-end justify-between gap-4">
                <p className="tile__huge">70<em className="text-[.4em] not-italic align-top">h</em></p>
                <p className="max-w-[20ch] text-sm leading-6" style={{ color: 'rgba(248,236,217,.82)' }}>Tres días sin tocarlo. Sigue marcando la hora exacta.</p>
              </div>
            </Reveal>

            {collections.slice(0, 4).map((c, i) => (
              <Reveal key={c.id} as={Link} to={`/catalogo?collection=${c.id}`} delay={i * 70} className="tile span-3 lg-span-3" style={{ minHeight: 300 }}>
                <img className="tile__img" src={collectionImages[i % collectionImages.length]} alt="" loading="lazy" style={{ opacity: .55 }} />
                <span className="tile__shade" />
                <p className="eyebrow num">Línea 0{i + 1} · {c.watch_count} piezas</p>
                <div className="flex items-end justify-between gap-4">
                  <h3 className="tile__title">{c.name.split(' ').map((w, j) => (j === 0 ? <span key={j}>{w} </span> : <em key={j}>{w} </em>))}</h3>
                  <span className="tile__arrow"><ArrowUpRight size={16} /></span>
                </div>
              </Reveal>
            ))}

            <Reveal delay={60} className="tile span-6 lg-span-8 justify-end">
              <img className="tile__img" src={atelierMovement} alt="" loading="lazy" />
              <span className="tile__shade" />
              <blockquote className="quote max-w-[18ch]" style={{ fontSize: 'clamp(2rem,3.6vw,3.6rem)' }}>“La precisión no se ve. <em>Se siente</em> en la muñeca.”</blockquote>
            </Reveal>

            <Reveal as={Link} to="/colecciones" delay={140} className="tile span-6 lg-span-4">
              <p className="eyebrow">Explorar</p>
              <div>
                <p className="tile__huge num" style={{ fontFamily: 'var(--font-serif)' }}>{String(totalPieces).padStart(2, '0')}</p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <p className="text-dim max-w-[22ch]">relojes, {collections.length || 4} colecciones y una sola regla: que duren.</p>
                  <span className="tile__arrow"><ArrowUpRight size={16} /></span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* featured rail */}
      <section className="section section--paper">
        <div className="container">
          <SectionHeader className="mb-[clamp(36px,5vw,64px)]" eyebrow="Destacados" title={<>Piezas que <em>no esperan.</em></>}
            description="Una selección viva de nuestra vitrina. Cuando una se va, no siempre vuelve."
            action={<Link to="/catalogo" className="btn btn-ghost">Ver todas <ArrowRight size={15} /></Link>} />
          <div className="rail">
            {loading
              ? Array.from({ length: 4 }, (_, i) => <WatchCardSkeleton key={i} />)
              : featured.map((watch, i) => <Reveal key={watch.id} delay={Math.min(i, 5) * 80}><WatchCard watch={watch} /></Reveal>)}
          </div>
        </div>
      </section>

      {/* editorial split with parallax */}
      <section className="section">
        <div className="container split">
          <Reveal variant="clip"><ParallaxImage src={atelierMovement} alt="Detalle de un movimiento mecánico con rubíes y ruedas dentadas" /></Reveal>
          <div className="grid gap-8">
            <Reveal><p className="eyebrow eyebrow--line">El taller</p></Reveal>
            <RevealLines as="h2" className="display-lg" lines={['Doscientas piezas', <>del tamaño de <em>un grano</em></>, 'de arroz.']} />
            <Reveal delay={120}><p className="lede">Detrás de cada esfera hay cientos de componentes ajustados a mano. Elegimos relojes cuyo interior está tan cuidado como lo que se ve.</p></Reveal>
            <Reveal delay={200}><Link to="/nosotros" className="btn-link">Conocer nuestra casa <ArrowRight size={14} /></Link></Reveal>
          </div>
        </div>
      </section>

      {/* services */}
      <section className="section section--tight">
        <div className="container">
          <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4" style={{ borderTop: '1px solid var(--line)', paddingTop: 'clamp(32px,4vw,56px)' }}>
            {services.map((s, i) => (
              <Reveal key={s.n} delay={i * 90} className="grid gap-4 content-start">
                <span className="num text-accent text-sm">{s.n}</span>
                <h3 className="display-sm">{s.title}</h3>
                <p className="body-sm max-w-[30ch]">{s.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <Reveal variant="scale" className="cta-band">
            <p className="eyebrow">Visita privada</p>
            <h2 className="display-xl max-w-[14ch]">Su próximo reloj ya le <em>está esperando.</em></h2>
            <div className="flex flex-wrap gap-3">
              <Link to="/catalogo" className="btn btn-lg" style={{ '--btn-bg': '#f3e7d4', '--btn-fg': '#2a1c13' }}>Explorar catálogo <ArrowRight size={16} /></Link>
              <Link to="/contacto" className="btn btn-ghost btn-lg" style={{ '--btn-fg': '#f3e7d4', '--btn-bd': 'rgba(243,231,212,.35)' }}>Agendar una cita</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
