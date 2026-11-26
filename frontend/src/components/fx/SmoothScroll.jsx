import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/**
 * Desplazamiento suave con inercia (Lenis). Solo con rueda o trackpad:
 * en celulares se deja el scroll nativo. Se apaga si el usuario pidió menos movimiento.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.085,
      wheelMultiplier: 0.95,
      allowNestedScroll: true,
      anchors: true,
      // el chat del concierge y los diálogos se desplazan solos
      prevent: (node) => node.classList?.contains('concierge__body') || node.getAttribute?.('role') === 'dialog',
    });
    window.__lenis = lenis;

    // un solo lugar decide si se puede desplazar: el menú móvil (body con overflow hidden)
    // o el telón de entrada (<html class="intro-lock">) detienen a Lenis
    const root = document.documentElement;
    const sync = () => {
      const locked = document.body.style.overflow === 'hidden' || root.classList.contains('intro-lock');
      if (locked && !lenis.isStopped) lenis.stop();
      if (!locked && lenis.isStopped) lenis.start();
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    sync();

    return () => {
      observer.disconnect();
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);
  return null;
}
