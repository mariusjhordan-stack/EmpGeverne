import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Camera, MessageCircle } from 'lucide-react';
import api from '../../services/api';
import WatchStory from '../../components/home/WatchStory';
import WatchCard, { formatPrice } from '../../components/catalog/WatchCard';
import { WatchCardSkeleton } from '../../components/common/Skeleton';
import Reveal, { RevealLines } from '../../components/common/Reveal';
import { toTryOnProduct } from '../../tryon/product';

// Three.js y la prueba virtual se cargan solo cuando hacen falta.
const Viewer3D = lazy(() => import('../../components/three/Viewer3D'));
const TryOn = lazy(() => import('../../tryon/TryOn'));

/* Cuenta desde cero cuando entra en pantalla. */
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
  return <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>{shown.toLocaleString('es-PE')}</span>;
}

function Chapter({ no, label }) {
  return <Reveal><p className="eyebrow eyebrow--line"><span className="text-accent">{no}</span> — {label}</p></Reveal>;
}

const services = [
  { n: 'I', title: 'Autenticidad certificada', text: 'Cada pieza llega con documentación de origen y verificación independiente.' },
  { n: 'II', title: 'Envío asegurado', text: 'Entrega en mano, asegurada por el valor total y con seguimiento en tiempo real.' },
  { n: 'III', title: 'Garantía de manufactura', text: 'Cobertura oficial del fabricante y servicio técnico especializado.' },
  { n: 'IV', title: 'Asesoría privada', text: 'Un concierge (y una IA) le acompañan antes, durante y después de su elección.' },
];

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);
  const [tryOn, setTryOn] = useState(false);

  useEffect(() => {
    Promise.allSettled([api.get('/catalog/watches/featured/'), api.get('/catalog/brands/')])
      .then(([fw, bw]) => {
        if (fw.status === 'fulfilled') setFeatured(fw.value.data.results || fw.value.data);
        if (bw.status === 'fulfilled') setBrands(bw.value.data.results || bw.value.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPieces = brands.reduce((sum, b) => sum + (b.watch_count || 0), 0);
  const brandNames = brands.length ? brands.map((b) => b.name) : ['Rolex', 'Patek Philippe', 'Audemars Piguet', 'Omega', 'Cartier', 'TAG Heuer'];
  const sortedBrands = [...brands].filter((b) => b.watch_count > 0).sort((a, b) => b.watch_count - a.watch_count);
  const atelier = featured.slice(0, 6);
  const piece = atelier[selected];

  const stats = [
    { value: totalPieces || 150, label: 'Piezas en catálogo, todas modeladas en 3D.', suffix: 'pzs' },
    { value: brands.length || 20, label: 'Casas relojeras, de Ginebra a Tokio.' },
    { value: 340, label: 'Cuadros renderizados en Blender para la portada.', suffix: 'fps' },
    { value: 28800, label: 'Alternancias por hora del calibre de un Submariner.', suffix: 'A/h' },
  ];

  return (
    <div>
      <WatchStory />

      <div className="marquee" aria-label="Casas relojeras">
        {[0, 1].map((copy) => (
          <div key={copy} className="marquee__track" aria-hidden={copy === 1}>
            {brandNames.map((name) => <span key={name} className="marquee__item">{name}</span>)}
          </div>
        ))}
      </div>

      {/* I — Selección */}
      <section className="section">
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-end mb-[clamp(40px,6vw,80px)]">
            <div className="grid gap-6">
              <Chapter no="I" label="La selección" />
              <RevealLines as="h2" className="display-lg" lines={['Piezas elegidas,', <>vistas desde <em>todos</em></>, 'sus ángulos.']} />
            </div>
            <Reveal delay={120} className="grid gap-6 lg:justify-items-end lg:text-right">
              <p className="lede">Cada reloj del catálogo tiene su modelo 3D: frente, detalle y perfil renderizados con la misma luz de estudio.</p>
              <Link to="/catalogo" className="btn-line">Todo el catálogo <ArrowRight size={14} /></Link>
            </Reveal>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {loading
              ? Array.from({ length: 8 }, (_, i) => <WatchCardSkeleton key={i} />)
              : featured.slice(0, 8).map((w, i) => <Reveal key={w.id} delay={(i % 4) * 80}><WatchCard watch={w} index={i} /></Reveal>)}
          </div>
        </div>
      </section>

      {/* II — Atelier 3D */}
      <section className="section section--night overflow-hidden">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <Reveal variant="scale" className="relative">
              {piece
                ? <Suspense fallback={<div className="viewer3d" />}><Viewer3D watch={piece} /></Suspense>
                : <div className="viewer3d" />}
              <span className="absolute left-4 top-4 font-mono text-[10px] tracking-[0.14em] uppercase text-[#111]/50">N° {String(selected + 1).padStart(3, '0')} · {piece?.reference}</span>
            </Reveal>
            <div className="grid gap-8">
              <Chapter no="II" label="El atelier 3D" />
              <RevealLines as="h2" className="display-lg" lines={['Gírelo.', <>Acérquese. <em>Póngaselo.</em></>]} />
              <Reveal delay={100}><p className="lede">Arrastre el reloj para verlo por todos lados. Con la cámara de su celular o computadora, el mismo modelo aparece en su muñeca: el video nunca sale de su dispositivo.</p></Reveal>
              <Reveal delay={160}>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Elegir reloj para ver en 3D">
                  {atelier.map((w, i) => (
                    <button key={w.id} type="button" role="radio" aria-checked={i === selected} onClick={() => setSelected(i)}
                      className="h-16 w-14 overflow-hidden border transition-colors" style={{ borderColor: i === selected ? '#d6b779' : 'rgba(242,239,232,.18)' }} title={`${w.brand_name} ${w.name}`}>
                      {w.primary_image && <img src={w.primary_image} alt={`${w.brand_name} ${w.name}`} className="h-full w-full object-cover" />}
                    </button>
                  ))}
                </div>
              </Reveal>
              {piece && (
                <Reveal delay={220} className="grid gap-4 border-t pt-6" style={{ borderColor: 'var(--line)' }}>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <p className="product-card__brand">{piece.brand_name}</p>
                      <p className="display-sm mt-1">{piece.name}</p>
                    </div>
                    <span className="price price--lg">{formatPrice(piece.price)}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" className="btn btn-accent" onClick={() => setTryOn(true)}><Camera size={16} /> Pruébalo en tu muñeca</button>
                    <Link to={`/catalogo/${piece.slug}`} className="btn btn-ghost">Ver la pieza <ArrowUpRight size={15} /></Link>
                  </div>
                </Reveal>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Cifras */}
      <section className="section section--tight">
        <div className="container">
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

      {/* III — Las casas */}
      <section className="section blueprint">
        <div className="container relative">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="grid content-start gap-6 lg:sticky lg:top-[120px]">
              <Chapter no="III" label="Las casas" />
              <RevealLines as="h2" className="display-lg" lines={['Un índice', <>de <em>manufacturas.</em></>]} />
              <Reveal delay={120}><p className="lede">De la Vallée de Joux a Shiojiri: cada casa con su historia, sus calibres y sus piezas en el catálogo.</p></Reveal>
            </div>
            <Reveal className="index-list">
              {(sortedBrands.length ? sortedBrands : []).slice(0, 14).map((b, i) => (
                <Link key={b.id} to={`/catalogo?brand=${b.id}`} className="index-row">
                  <span className="index-row__no">{String(i + 1).padStart(2, '0')}</span>
                  <span className="index-row__name">{b.name}</span>
                  <span className="index-row__count">{b.watch_count} {b.watch_count === 1 ? 'pieza' : 'piezas'}</span>
                  <ArrowUpRight size={20} strokeWidth={1.3} />
                </Link>
              ))}
              {!sortedBrands.length && Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-16 my-2" />)}
            </Reveal>
          </div>
        </div>
      </section>

      {/* IV — Concierge */}
      <section className="section section--tight">
        <div className="container">
          <Reveal className="cta-band lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div className="grid gap-6">
              <p className="eyebrow eyebrow--line"><span style={{ color: '#e3c995' }}>IV</span> — Le Concierge</p>
              <h2 className="display-lg" style={{ color: '#f6f2eb' }}>Dígale su presupuesto. <em>Él conoce cada pieza.</em></h2>
              <p className="lede">Un asesor con inteligencia artificial (Gemini) que solo recomienda relojes de este catálogo y dentro de lo que usted quiere gastar, en soles, dólares o euros.</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn btn-lg" onClick={() => window.dispatchEvent(new Event('concierge:open'))}><MessageCircle size={16} /> Hablar con el concierge</button>
              </div>
            </div>
            <div className="grid gap-3 font-[15px]" aria-hidden="true">
              <p className="self-end justify-self-end max-w-[80%] px-4 py-3 text-sm" style={{ background: '#f2efe8', color: '#111', borderRadius: 2 }}>Tengo S/ 20,000 y busco un reloj de buceo.</p>
              <p className="max-w-[90%] border-l-2 pl-4 text-sm leading-relaxed" style={{ borderColor: '#d6b779', color: 'rgba(242,239,232,.86)' }}>Con S/ 20,000 le propongo tres piezas de buceo, herméticas a 300 m. Se las muestro con su precio en soles…</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Servicios */}
      <section className="section">
        <div className="container">
          <div className="tick-rule mb-14" aria-hidden="true" />
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s, i) => (
              <Reveal key={s.n} delay={i * 80} className="grid content-start gap-4">
                <span className="font-serif italic text-5xl text-accent leading-none">{s.n}</span>
                <h3 className="display-sm">{s.title}</h3>
                <p className="body-sm max-w-[34ch]">{s.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {tryOn && piece && (
        <Suspense fallback={null}>
          <TryOn product={toTryOnProduct(piece)} onClose={() => setTryOn(false)} />
        </Suspense>
      )}
    </div>
  );
}
