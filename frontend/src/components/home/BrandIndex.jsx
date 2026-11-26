import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

/**
 * Índice de casas relojeras. Con mouse, al pasar por una fila aparece
 * una lámina flotante con uno de sus relojes que sigue al puntero.
 */
export default function BrandIndex({ brands }) {
  const [preview, setPreview] = useState(null); // { src, name }
  const floatRef = useRef(null);
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine) return undefined;
    const pos = { x: 0, y: 0 };
    let raf = 0;
    const tick = () => {
      const el = floatRef.current;
      if (el) {
        const dx = target.current.x - pos.x;
        pos.x += dx * 0.14;
        pos.y += (target.current.y - pos.y) * 0.14;
        // se inclina un poco según la velocidad, como una tarjeta sostenida
        el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${Math.max(-8, Math.min(8, dx * 0.06)).toFixed(2)}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onMove = (e) => { target.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); };
  }, []);

  // cada casa ya trae una imagen de muestra desde la API: se precargan para que aparezcan al instante
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return; // en celular no hay lámina flotante
    brands.forEach((b) => { if (b.preview_image) new Image().src = b.preview_image; });
  }, [brands]);

  const enter = (b) => (e) => {
    if (e.pointerType !== 'mouse') return;
    setPreview(b.preview_image ? { src: b.preview_image, name: b.name } : null);
  };
  const leave = () => setPreview(null);

  return (
    <div className="index-list" onPointerLeave={leave}>
      {brands.map((b, i) => (
        <Link key={b.id} to={`/catalogo?brand=${b.id}`} className="index-row" onPointerEnter={enter(b)} data-cursor="Explorar">
          <span className="index-row__no">{String(i + 1).padStart(2, '0')}</span>
          <span className="index-row__name">{b.name}</span>
          <span className="index-row__count">{b.watch_count} {b.watch_count === 1 ? 'pieza' : 'piezas'}</span>
          <ArrowUpRight size={20} strokeWidth={1.3} />
        </Link>
      ))}
      <div ref={floatRef} className={`index-float ${preview ? 'is-on' : ''}`} aria-hidden="true">
        <div className="index-float__card">
          {preview && <img key={preview.src} src={preview.src} alt="" />}
          <span>{preview?.name}</span>
        </div>
      </div>
    </div>
  );
}
