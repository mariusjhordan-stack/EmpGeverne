import { useEffect, useState } from 'react';

const fmt = new Intl.DateTimeFormat('es-PE', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

/** Hora de Ginebra en vivo. */
export function useGenevaTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function GenevaClock({ className = '' }) {
  const now = useGenevaTime();
  return <span className={className}><span className="eyebrow--dot inline-flex items-center gap-2" />GVA {fmt.format(now)}</span>;
}

/** Pequeña esfera con las agujas a la hora de Ginebra (para el botón del asesor y el logo). */
export function MiniDial({ size = 52, className = '', ticks = true }) {
  const now = useGenevaTime();
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false })
    .formatToParts(now).map((p) => [p.type, Number(p.value)]));
  const h = ((parts.hour % 12) + parts.minute / 60) * 30;
  const m = (parts.minute + parts.second / 60) * 6;
  const s = parts.second * 6;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      {ticks && Array.from({ length: 60 }, (_, i) => (
        <line key={i} x1="50" y1="4" x2="50" y2={i % 5 ? 8 : 12} stroke="currentColor" strokeOpacity={i % 5 ? 0.35 : 0.9} strokeWidth={i % 5 ? 1 : 2} transform={`rotate(${i * 6} 50 50)`} />
      ))}
      <line x1="50" y1="50" x2="50" y2="28" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${h} 50 50)`} />
      <line x1="50" y1="50" x2="50" y2="17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" transform={`rotate(${m} 50 50)`} />
      {/* segundero en el color de acento: bronce sobre claro, champán sobre negro */}
      <line x1="50" y1="58" x2="50" y2="14" style={{ stroke: 'var(--champagne)' }} strokeWidth="1.2" transform={`rotate(${s} 50 50)`} />
      <circle cx="50" cy="50" r="2.6" style={{ fill: 'var(--champagne)' }} />
    </svg>
  );
}
