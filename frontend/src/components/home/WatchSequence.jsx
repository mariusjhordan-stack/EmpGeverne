import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/*
 * The "Apple trick": a tall section with a sticky stage. Scroll progress through the
 * section selects which pre-rendered frame of the watch is painted on a <canvas>, so the
 * product turns as the user scrolls. Overlays (hero copy, giant blended wordmark and
 * captions) are driven from the same progress value without React re-renders.
 */

const FRAME_COUNT = 120;
// bump SEQ_VERSION whenever the frames are regenerated so browsers drop cached frames
const SEQ_VERSION = 'rolex-oysterflex-2';
const framePath = (i) => `/sequence/watch_${String(i).padStart(3, '0')}.webp?v=${SEQ_VERSION}`;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const range = (p, start, end) => clamp((p - start) / (end - start));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
// opacity window: fade in over `fade`, hold, fade out
const windowed = (p, start, end, fade = 0.05) => Math.min(range(p, start, start + fade), 1 - range(p, end - fade, end));

const captions = [
  { at: [0.2, 0.42], side: 'left', eyebrow: '01 — El perfil', title: <>Caja Oyster, <em>corona Triplock.</em></>, text: 'Cuarenta milímetros de acero con protectores de corona integrados en la caja.' },
  { at: [0.46, 0.68], side: 'right', eyebrow: '02 — El reverso', title: <>Fondo atornillado, <em>correa Oysterflex.</em></>, text: 'Caucho de alto rendimiento con alma metálica y cierre desplegable Oysterlock.' },
  { at: [0.72, 0.95], side: 'left', eyebrow: '03 — La esfera', title: <>Negro profundo, <em>hermético a 300 m.</em></>, text: 'Rolex Submariner Date · bisel giratorio de 60 minutos · lupa Cyclops sobre la fecha.' },
];

export default function WatchSequence() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const heroRef = useRef(null);
  const bigRef = useRef(null);
  const glowRef = useRef(null);
  const progressRef = useRef(null);
  const captionRefs = useRef([]);
  const images = useRef([]);
  const current = useRef(-1);
  const [loaded, setLoaded] = useState(0);

  // Preload frames: first frame immediately, then the rest in order.
  useEffect(() => {
    let cancelled = false;
    let count = 0;
    const list = [];
    for (let i = 0; i < FRAME_COUNT; i += 1) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (cancelled) return;
        count += 1;
        if (count % 6 === 0 || count === FRAME_COUNT) setLoaded(count);
        if (i === 0 || current.current === i) draw(i, true);
      };
      img.src = framePath(i);
      list.push(img);
    }
    images.current = list;
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = (index, force = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!force && index === current.current) return;
    // fall back to the nearest frame that has finished loading
    let img = images.current[index];
    for (let d = 1; (!img || !img.complete || !img.naturalWidth) && d < FRAME_COUNT; d += 1) {
      img = images.current[index - d] || images.current[index + d];
      if (img && !(img.complete && img.naturalWidth)) img = null;
    }
    if (!img) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    current.current = index;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      draw(Math.max(current.current, 0), true);
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const update = () => {
      raf = 0;
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const p = clamp(-rect.top / total);

      // product rotation
      const frame = Math.round(easeInOut(range(p, 0.04, 0.96)) * (FRAME_COUNT - 1));
      draw(reduced ? 0 : frame);
      const scale = 0.78 + 0.22 * easeInOut(range(p, 0, 0.22));
      const lift = (1 - range(p, 0, 0.22)) * 6;
      canvas.style.transform = `translate3d(0, ${lift}vh, 0) scale(${scale})`;

      // hero copy fades and drifts up
      const heroOut = range(p, 0.03, 0.12);
      heroRef.current.style.opacity = String(1 - heroOut);
      heroRef.current.style.transform = `translate3d(0, ${-heroOut * 60}px, 0)`;
      heroRef.current.style.pointerEvents = heroOut > 0.6 ? 'none' : 'auto';

      // giant wordmark blended over the product (mix-blend-mode: difference)
      const bigOut = range(p, 0.02, 0.2);
      bigRef.current.style.opacity = String(1 - bigOut);
      bigRef.current.style.transform = `scale(${1 + bigOut * 0.5}) translate3d(0, ${-bigOut * 8}vh, 0)`;

      glowRef.current.style.setProperty('--glow', String(0.35 + 0.65 * range(p, 0.1, 0.4)));
      progressRef.current.style.setProperty('--p', p.toFixed(4));

      captions.forEach((c, i) => {
        const el = captionRefs.current[i];
        if (!el) return;
        const o = windowed(p, c.at[0], c.at[1]);
        el.style.opacity = String(o);
        el.style.transform = `translate3d(0, ${(1 - o) * 28}px, 0)`;
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };

    resize();
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollIntoSequence = () => {
    const section = sectionRef.current;
    window.scrollTo({ top: section.offsetTop + window.innerHeight * 1.2, behavior: 'smooth' });
  };

  return (
    <section ref={sectionRef} className="seq grain" aria-label="Presentación del reloj Cronos">
      <div className="seq__stage">
        <div ref={glowRef} className="seq__glow" aria-hidden="true" />
        <canvas ref={canvasRef} className="seq__canvas" role="img" aria-label="Rolex Submariner Date con correa Oysterflex girando sobre un expositor mientras se desplaza la página" />
        <div ref={bigRef} className="seq__bigtype" aria-hidden="true">Cronos</div>

        <div ref={heroRef} className="seq__hero">
          <div>
            <p className="eyebrow eyebrow--line eyebrow--accent mb-6 animate-fade-in">Rolex · Submariner Date</p>
            <h1 className="display-xl animate-fade-in-up">El tiempo,<br /><em>esculpido.</em></h1>
          </div>
          <div className="seq__hero-side animate-fade-in-up" style={{ animationDelay: '.15s' }}>
            <p className="lede">Piezas de manufactura suiza elegidas una a una, para quien entiende que un reloj se hereda.</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/catalogo" className="btn btn-lg">Explorar colección <ArrowRight size={16} /></Link>
              <button type="button" className="btn btn-ghost btn-lg" onClick={scrollIntoSequence}>Ver la pieza</button>
            </div>
            <span className="seq__scrollcue" aria-hidden="true"><i /> Desliza para girar</span>
          </div>
        </div>

        {captions.map((c, i) => (
          <div key={c.eyebrow} ref={(el) => { captionRefs.current[i] = el; }} className={`seq__caption seq__caption--${c.side}`}>
            <p className="eyebrow eyebrow--accent">{c.eyebrow}</p>
            <h2 className="display-md">{c.title}</h2>
            <p className="body-sm" style={{ color: 'var(--fg-dim)' }}>{c.text}</p>
          </div>
        ))}

        <div ref={progressRef} className="seq__progress" aria-hidden="true">
          <span>0°</span>
          <div className="seq__progress-bar"><span /></div>
          <span>360°</span>
        </div>
        <span className="seq__loader" style={{ opacity: loaded >= FRAME_COUNT ? 0 : 1 }} aria-hidden="true">
          {String(Math.round((loaded / FRAME_COUNT) * 100)).padStart(2, '0')}%
        </span>
      </div>
    </section>
  );
}
