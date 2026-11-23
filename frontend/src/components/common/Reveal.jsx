import { useEffect, useRef } from 'react';

function useInView(ref) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      node.classList.add('is-visible');
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        node.classList.add('is-visible');
        observer.disconnect();
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
}

/**
 * Scroll reveal wrapper.
 * variant: 'up' (default) | 'fade' | 'scale' | 'left' | 'right' | 'clip'
 */
export default function Reveal({ as: Element = 'div', children, className = '', delay = 0, variant = 'up', style, ...props }) {
  const ref = useRef(null);
  useInView(ref);
  return (
    <Element ref={ref} data-reveal={variant} className={`reveal ${className}`} style={{ '--delay': `${delay}ms`, ...style }} {...props}>
      {children}
    </Element>
  );
}

/**
 * Line-by-line masked text reveal for editorial headings.
 * lines: array of strings / nodes, each rendered on its own masked line.
 */
export function RevealLines({ as: Element = 'h2', lines, className = '', delay = 0 }) {
  const ref = useRef(null);
  useInView(ref);
  return (
    <Element ref={ref} className={`reveal-lines ${className}`} style={{ '--delay': `${delay}ms` }}>
      {lines.map((line, i) => (
        <span className="line" key={i}><span style={{ '--i': i }}>{line}</span></span>
      ))}
    </Element>
  );
}
