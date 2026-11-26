import { useEffect, useRef } from 'react';

const MAGNETIC = '.btn, .btn-icon, .header-icon, .concierge-fab, [data-magnetic]';
const INTERACTIVE = 'a, button, [role="button"], [role="radio"], label, summary, select';
const TEXT = 'input, textarea, [contenteditable="true"]';

/**
 * Cursor propio (solo con mouse): un punto exacto y un anillo que lo sigue con suavidad.
 * - Sobre enlaces y botones el anillo crece.
 * - Sobre un elemento con data-cursor="Texto" el anillo se vuelve una etiqueta ("Ver", "Girar"…).
 * - Los botones se acercan un poco al cursor (efecto magnético).
 */
export default function Cursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || still) return undefined;

    const root = document.documentElement;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    root.classList.add('has-cursor');

    const pos = { x: -100, y: -100 };
    const ringPos = { x: -100, y: -100 };
    const magnets = new Map(); // elemento -> { x, y, tx, ty }
    let current = null;
    let raf = 0;

    const setState = (target) => {
      const tagged = target?.closest?.('[data-cursor]');
      const text = target?.closest?.(TEXT);
      const interactive = target?.closest?.(INTERACTIVE);
      ring.classList.toggle('is-label', Boolean(tagged));
      ring.classList.toggle('is-link', !tagged && Boolean(interactive));
      dot.classList.toggle('is-hidden', Boolean(tagged) || Boolean(text));
      ring.classList.toggle('is-text', Boolean(text));
      if (tagged) label.textContent = tagged.getAttribute('data-cursor');
    };

    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return;
      pos.x = e.clientX;
      pos.y = e.clientY;
      dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      root.classList.add('cursor-in');

      // efecto magnético: el botón se corre hacia el puntero
      const magnet = e.target.closest?.(MAGNETIC);
      if (magnet !== current) {
        if (current && magnets.has(current)) Object.assign(magnets.get(current), { tx: 0, ty: 0 });
        current = magnet;
      }
      if (magnet) {
        const r = magnet.getBoundingClientRect();
        const strength = r.width > 160 ? 0.14 : 0.3;
        const m = magnets.get(magnet) ?? { x: 0, y: 0, tx: 0, ty: 0 };
        m.tx = (e.clientX - (r.left + r.width / 2)) * strength;
        m.ty = (e.clientY - (r.top + r.height / 2)) * strength;
        magnets.set(magnet, m);
      }
    };
    const onOver = (e) => setState(e.target);
    const onDown = () => ring.classList.add('is-down');
    const onUp = () => ring.classList.remove('is-down');
    const onLeave = () => {
      root.classList.remove('cursor-in');
      if (current && magnets.has(current)) Object.assign(magnets.get(current), { tx: 0, ty: 0 });
      current = null;
    };

    const tick = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.18;
      ringPos.y += (pos.y - ringPos.y) * 0.18;
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      magnets.forEach((m, el) => {
        m.x += (m.tx - m.x) * 0.16;
        m.y += (m.ty - m.y) * 0.16;
        if (!el.isConnected || (Math.abs(m.x) < 0.05 && Math.abs(m.y) < 0.05 && m.tx === 0 && m.ty === 0)) {
          el.style.translate = '';
          magnets.delete(el);
          return;
        }
        el.style.translate = `${m.x.toFixed(2)}px ${m.y.toFixed(2)}px`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    document.documentElement.addEventListener('pointerleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      magnets.forEach((_, el) => { el.style.translate = ''; });
      root.classList.remove('has-cursor', 'cursor-in');
    };
  }, []);

  return (
    <div className="cursor" aria-hidden="true">
      <span ref={ringRef} className="cursor__ring"><span ref={labelRef} className="cursor__label" /></span>
      <span ref={dotRef} className="cursor__dot" />
    </div>
  );
}
