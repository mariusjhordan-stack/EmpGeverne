import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import api from '../../services/api';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const ORDER = ['deportiva', 'clasica', 'lujo', 'edicion-limitada'];

/**
 * Las colecciones en una fila horizontal que avanza con el scroll vertical
 * (en pantallas anchas la sección queda fija mientras pasan los paneles).
 * En celular es una fila que se desliza con el dedo.
 */
export default function CollectionsRail() {
  const [items, setItems] = useState([]);
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const barRef = useRef(null);
  const countRef = useRef(null);

  useEffect(() => {
    let alive = true;
    // una sola consulta: cada colección ya trae tres imágenes de muestra
    api.get('/catalog/collections/').then(({ data }) => {
      const list = (data.results || data).filter((c) => c.watch_count > 0)
        .sort((a, b) => (ORDER.indexOf(a.slug) + 99) % 99 - (ORDER.indexOf(b.slug) + 99) % 99);
      if (alive) setItems(list);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track || !items.length) return undefined;
    const wide = window.matchMedia('(min-width: 900px)');
    let raf = 0;
    let distance = 0;

    const measure = () => {
      if (!wide.matches) { section.style.height = ''; track.style.transform = ''; return; }
      distance = Math.max(0, track.scrollWidth - window.innerWidth);
      // la altura de la sección es la distancia horizontal que hay que recorrer
      section.style.height = `${distance + window.innerHeight}px`;
      update();
    };
    const update = () => {
      raf = 0;
      if (!wide.matches) return;
      const top = section.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, -top / Math.max(1, distance)));
      track.style.transform = `translate3d(${(-p * distance).toFixed(1)}px, 0, 0)`;
      track.style.setProperty('--p', p.toFixed(4));
      if (barRef.current) barRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
      if (countRef.current) countRef.current.textContent = String(Math.min(items.length, Math.floor(p * items.length * 0.999) + 1)).padStart(2, '0');
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    wide.addEventListener('change', measure);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      wide.removeEventListener('change', measure);
    };
  }, [items]);

  if (!items.length) return null;
  return (
    <section ref={sectionRef} className="rail-section" aria-label="Colecciones">
      <div className="rail-section__sticky">
        <div ref={trackRef} className="rail-track" style={{ '--n': items.length }}>
          <div className="rail-intro">
            <p className="eyebrow eyebrow--line"><span className="text-accent">III</span> — Las colecciones</p>
            <h2 className="display-lg">Cuatro colecciones, <em>una sola obsesión.</em></h2>
            <p className="lede">Del acero que baja a trescientos metros al oro que no sale de una caja fuerte. Deslice para recorrerlas.</p>
          </div>
          {items.map((c, i) => (
            <article key={c.id} className="rail-panel" style={{ '--k': i }}>
              <span className="rail-panel__no" aria-hidden="true">{ROMAN[i]}</span>
              <div className="rail-panel__stage" aria-hidden="true">
                {(c.preview_images ?? []).map((src, j) => (
                  <img key={src} src={src} alt="" className={`rail-panel__watch rail-panel__watch--${j}`} />
                ))}
              </div>
              <div className="rail-panel__text">
                <p className="product-card__brand">{String(c.watch_count).padStart(3, '0')} piezas</p>
                <h3 className="display-md">{c.name}</h3>
                <p className="body-sm max-w-[34ch]">{c.description}</p>
                <Link to={`/catalogo?collection=${c.id}`} className="btn-line w-fit">Ver la colección <ArrowUpRight size={14} /></Link>
              </div>
            </article>
          ))}
        </div>
        <div className="rail-progress" aria-hidden="true">
          <span className="num"><span ref={countRef}>01</span> / {String(items.length).padStart(2, '0')}</span>
          <span className="rail-progress__bar"><span ref={barRef} /></span>
        </div>
      </div>
    </section>
  );
}
