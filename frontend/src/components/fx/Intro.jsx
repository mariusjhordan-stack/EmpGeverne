import { useEffect, useRef, useState } from 'react';
import { MiniDial } from '../common/GenevaClock';

const KEY = 'cg-intro-seen';
const LETTERS = 'CRONOS'.split('');
const COUNT_MS = 1700;

function shouldPlay(enabled) {
  if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try { return sessionStorage.getItem(KEY) !== '1'; } catch { return true; }
}

/**
 * Telón de entrada: la primera vez que se abre la portada en la sesión aparece
 * la esfera, el nombre letra por letra y un contador; luego el telón sube.
 * Al terminar (o si no hay telón) marca <html class="is-ready"> para que
 * la portada haga su propia entrada.
 */
export default function Intro({ enabled }) {
  const [phase, setPhase] = useState(() => (shouldPlay(enabled) ? 'in' : 'done'));
  const playedRef = useRef(phase === 'in');
  const countRef = useRef(null);

  // solo al montar: contador, temporizador y tecla para saltar
  useEffect(() => {
    if (!playedRef.current) return undefined;
    try { sessionStorage.setItem(KEY, '1'); } catch { /* sin almacenamiento */ }
    const root = document.documentElement;
    root.classList.add('intro-lock'); // sin scroll mientras está el telón
    const start = performance.now();
    let raf = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / COUNT_MS);
      if (countRef.current) countRef.current.textContent = String(Math.round((1 - (1 - t) ** 3) * 100)).padStart(3, '0');
      if (t < 1) raf = requestAnimationFrame(step);
    });
    // el telón sube cuando el contador llegó a 100 y el nombre ya terminó de entrar
    const letters = () => Promise.all(document.getAnimations().filter((x) => x.animationName === 'intro-letter').map((x) => x.finished.catch(() => {})));
    let lift = setTimeout(() => letters().then(() => { lift = setTimeout(() => setPhase((p) => (p === 'in' ? 'out' : p)), 450); }), COUNT_MS);
    const skip = () => setPhase((p) => (p === 'in' ? 'out' : p));
    window.addEventListener('keydown', skip);
    window.addEventListener('wheel', skip, { passive: true });
    return () => {
      root.classList.remove('intro-lock');
      cancelAnimationFrame(raf);
      clearTimeout(lift);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('wheel', skip);
    };
  }, []);

  // cuando el telón empieza a subir, la página ya puede animarse y desplazarse
  useEffect(() => {
    if (phase === 'in') return undefined;
    document.documentElement.classList.add('is-ready');
    document.documentElement.classList.remove('intro-lock');
    if (phase !== 'out') return undefined;
    const done = setTimeout(() => setPhase('done'), 1300);
    return () => clearTimeout(done);
  }, [phase]);

  if (phase === 'done') return null;
  return (
    <div className={`intro ${phase === 'out' ? 'is-out' : ''}`} aria-hidden="true" onClick={() => setPhase('out')}>
      <div className="intro__inner">
        <MiniDial size={150} className="intro__dial" />
        <p className="intro__word">
          {LETTERS.map((l, i) => <span key={i} style={{ '--i': i }}>{l}</span>)}
        </p>
        <p className="intro__sub">Genève · MCMLXXXVII</p>
      </div>
      <div className="intro__foot">
        <span>Manufacture 3D</span>
        <span ref={countRef} className="intro__count">000</span>
      </div>
      <span className="intro__line" />
    </div>
  );
}
