import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/*
 * El reloj de Blender en la portada (tools/blender/cronos_story_pro.blend, cuadros 0–239).
 * El scroll elige el cuadro que se pinta en un <canvas>. En los acercamientos (93–142) el reloj
 * no entra en un cuadrado, así que esos cuadros se renderizaron con más campo: 2.8 × 1.4 para
 * pantallas anchas (wide_) y 1 × 2.5 para pantallas altas (tall_), con la misma escala.
 */
const COUNT = 240;
const CLOSE_UP = [93, 142];
const isCloseUp = (i) => i >= CLOSE_UP[0] && i <= CLOSE_UP[1];
// Subir cuando se vuelvan a renderizar los cuadros: el navegador guarda las imágenes en caché.
const FRAMES_VERSION = 'pro-1';
const frameUrl = (i, portrait) => `/sequence/${isCloseUp(i) ? (portrait ? 'tall' : 'wide') : 'story'}_${String(i).padStart(3, '0')}.webp?v=${FRAMES_VERSION}`;
const PIECE = '/catalogo/submariner-date';

const CHAPTERS = [
  { from: 0.07, to: 0.3, side: 'left', no: 'I', eyebrow: 'El giro', title: <>Cada ángulo, <em>otra luz.</em></>, text: 'Una vuelta completa sobre su eje: caja Oyster, bisel giratorio y brazalete de acero de tres piezas.' },
  { from: 0.33, to: 0.52, side: 'right', no: 'II', eyebrow: 'La esfera y el perfil', title: <>El detalle <em>detiene el tiempo.</em></>, text: 'La cámara se acerca al bisel, a la lupa Cyclops y al espesor de la caja.' },
  { from: 0.56, to: 0.78, side: 'left', no: 'III', eyebrow: 'Las piezas', title: <>Visto <em>desde dentro.</em></>, text: 'Cristal, bisel, esfera, caja, movimiento, fondo y brazalete se separan y vuelven a ser uno.' },
  { from: 0.83, to: 1.01, side: 'right', no: 'IV', eyebrow: 'La pieza', title: <>Submariner <em>Date.</em></>, text: 'Modelado y renderizado en Blender, cuadro por cuadro.', link: true },
];
const PARTS = ['Cristal', 'Bisel', 'Esfera', 'Caja', 'Movimiento', 'Fondo', 'Brazalete'];

export default function WatchStory() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const heroRef = useRef(null);
  const wordRef = useRef(null);
  const hudRef = useRef(null);
  const partsRef = useRef(null);
  const chapterRefs = useRef([]);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const portrait = window.innerWidth < window.innerHeight;
    const unit = portrait ? 1 : 2.8;
    const step = window.innerWidth < 768 ? 2 : 1;
    const frames = Array(COUNT).fill(null);
    let target = reduced ? COUNT - 1 : 0;
    // El cuadro en pantalla "se desliza" hacia la posición del scroll: un giro rápido de la rueda
    // muestra los cuadros intermedios en vez de saltarlos.
    let shown = target;
    let painted = null;
    let raf = 0;
    let glide = 0;
    let cancelled = false;
    let ratio = 1;

    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * ratio);
      canvas.height = Math.round(canvas.clientHeight * ratio);
      painted = null;
    };

    const draw = () => {
      const at = Math.round(shown);
      let image = null;
      for (let d = 0; d < COUNT && !image; d += 1) image = frames[at - d] || frames[at + d];
      if (!image || image === painted) return;
      const { width, height } = canvas;
      const top = 84 * ratio;
      const square = Math.min(width, height - top - 40 * ratio) * (portrait ? 0.86 : 0.9);
      const centerY = top + (height - top) / 2 - (portrait ? height * 0.14 : 0);
      const scale = image.closeUp ? square / (image.naturalWidth / unit) : square / image.naturalWidth;
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      context.fillStyle = '#fff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, (width - w) / 2, centerY - h / 2, w, h);
      painted = image;
    };

    const update = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const progress = reduced ? 1 : Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - window.innerHeight)));
      target = progress * (COUNT - 1);
      if (reduced) shown = target;
      if (!glide) glide = requestAnimationFrame(tick);
      const heroOut = Math.min(1, progress / 0.06);
      heroRef.current.style.opacity = String(reduced ? 1 : 1 - heroOut);
      heroRef.current.style.transform = `translate3d(0, ${-heroOut * 40}px, 0)`;
      heroRef.current.inert = heroOut > 0.9;
      wordRef.current.style.transform = `translate3d(${(0.5 - progress) * 30}vw, 0, 0)`;
      // salida suave: en el último tramo el reloj se aleja un poco antes de dar paso a la página
      const exit = reduced ? 0 : Math.min(1, Math.max(0, (progress - 0.95) / 0.05));
      canvas.style.opacity = String(1 - exit * 0.45);
      canvas.style.scale = String(1 - exit * 0.05);
      hudRef.current.style.setProperty('--p', progress.toFixed(4));
      hudRef.current.querySelector('[data-deg]').textContent = `${String(Math.round(Math.min(progress / 0.33, 1) * 360)).padStart(3, '0')}°`;
      partsRef.current.classList.toggle('is-on', progress > 0.6 && progress < 0.75);
      CHAPTERS.forEach((chapter, i) => {
        const el = chapterRefs.current[i];
        const active = progress >= chapter.from && progress <= chapter.to;
        el.classList.toggle('is-on', active);
        el.inert = !active;
      });
    };
    const tick = () => {
      glide = 0;
      const gap = target - shown;
      shown = Math.abs(gap) < 0.25 ? target : shown + gap * 0.2;
      draw();
      if (shown !== target) glide = requestAnimationFrame(tick);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onResize = () => { resize(); onScroll(); };

    const load = (i) => new Promise((resolve) => {
      const image = new Image();
      image.closeUp = isCloseUp(i);
      image.src = frameUrl(i, portrait);
      // Se decodifica antes de usarlo, así pintarlo nunca traba el scroll.
      image.decode()
        .then(() => { if (!cancelled) { frames[i] = image; draw(); } })
        .catch(() => {})
        .finally(resolve);
    });

    const loadAll = async () => {
      await load(Math.round(target));
      if (reduced) return;
      // Primero una pasada gruesa, para que un scroll rápido siempre encuentre un cuadro cercano.
      const coarse = [];
      const fine = [];
      for (let i = step; i < COUNT; i += step) (i % 8 === 0 ? coarse : fine).push(i);
      if (step > 1) fine.push(COUNT - 1);
      const queue = [...coarse, ...fine];
      const worker = async () => { while (!cancelled && queue.length) await load(queue.shift()); };
      await Promise.all(Array.from({ length: 6 }, worker));
    };

    resize();
    update();
    loadAll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(glide);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <section ref={sectionRef} className="story" aria-label="El reloj en movimiento">
      <div className="story__stage">
        <div className="story__grid" aria-hidden="true" />
        <p ref={wordRef} className="story__word" aria-hidden="true">Genève</p>
        <canvas ref={canvasRef} className="story__canvas" role="img" aria-label="Modelo 3D de un reloj de buceo de acero que gira, se acerca y se desarma" />

        <div ref={hudRef} className="story__hud" aria-hidden="true">
          <span>N° 001 — Submariner Date · Blender</span>
          <span className="flex items-center gap-3"><span className="story__dial"><span /></span><span data-deg>000°</span></span>
        </div>

        <div ref={partsRef} className="story__parts" aria-hidden="true">
          {PARTS.map((part) => <span key={part}>{part}</span>)}
        </div>

        <div ref={heroRef} className="story__hero">
          <div>
            <p className="eyebrow eyebrow--dot mb-6 hero-fade" style={{ '--d': '0ms' }}>Ginebra · 46°12′N 6°09′E</p>
            {/* cada línea sube desde detrás de una máscara al terminar el telón de entrada */}
            <h1 className="display-xl hero-title">
              <span className="hero-line"><span style={{ '--d': '80ms' }}>El tiempo,</span></span>
              <span className="hero-line"><em style={{ '--d': '220ms' }}>en tres dimensiones.</em></span>
            </h1>
          </div>
          <div className="story__hero-side hero-fade" style={{ '--d': '520ms' }}>
            <p className="lede">Relojes de las grandes casas, modelados en 3D. Gíralos, desármalos y pruébalos en tu muñeca con la cámara.</p>
            <div className="flex flex-wrap gap-3 justify-end">
              <Link to="/catalogo" className="btn btn-lg">Ver la colección <ArrowRight size={16} /></Link>
            </div>
            <span className="story__cue"><i /> Desliza para girar</span>
          </div>
        </div>

        {CHAPTERS.map((c, i) => (
          <div key={c.no} ref={(el) => { chapterRefs.current[i] = el; }} className={`story__chapter story__chapter--${c.side}`}>
            <span className="num-big" aria-hidden="true">{c.no}</span>
            <p className="eyebrow eyebrow--line">{c.eyebrow}</p>
            <h2 className="display-md">{c.title}</h2>
            <p className="body-sm">{c.text}</p>
            {c.link && <Link to={PIECE} className="btn-line mt-2">Descubrir la pieza <ArrowRight size={14} /></Link>}
          </div>
        ))}
      </div>
    </section>
  );
}
