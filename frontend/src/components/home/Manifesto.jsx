import { useEffect, useRef } from 'react';
import Reveal from '../common/Reveal';

// *palabra* = cursiva en color de acento
const TEXT = 'Un reloj no mide el tiempo: *lo* *guarda.* Cada pieza de este catálogo fue modelada, iluminada y renderizada en 3D para que usted la vea como en una vitrina de Ginebra, *y* *la* *pruebe* *en* *su* *muñeca* sin salir de casa.';
const WORDS = TEXT.split(' ').map((w) => (w.startsWith('*') ? { text: w.replaceAll('*', ''), accent: true } : { text: w, accent: false }));

/**
 * Manifiesto: las palabras se encienden una a una mientras la sección cruza la pantalla.
 * El scroll solo cambia una variable CSS (--p); el resto lo hace el CSS.
 */
export default function Manifesto() {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { node.style.setProperty('--p', '1'); return undefined; }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = node.getBoundingClientRect();
      const vh = window.innerHeight;
      // empieza cuando el texto asoma por abajo y termina cuando llega a la mitad de la pantalla
      const p = (vh * 0.88 - r.top) / (r.height + vh * 0.38);
      node.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(4));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  return (
    <section className="section manifesto" aria-label="Manifiesto">
      <div className="container">
        <Reveal><p className="eyebrow eyebrow--line mb-10"><span className="text-accent">✦</span> Manifiesto</p></Reveal>
        <p ref={ref} className="manifesto__text" style={{ '--n': WORDS.length }}>
          {WORDS.map((w, i) => (
            <span key={i} className={w.accent ? 'is-accent' : undefined} style={{ '--i': i }}>{w.text}{' '}</span>
          ))}
        </p>
        <Reveal delay={120} className="manifesto__sign">
          <span className="tick-rule" aria-hidden="true" />
          <span>Cronos Genève · Manufacture 3D · MCMLXXXVII</span>
        </Reveal>
      </div>
    </section>
  );
}
