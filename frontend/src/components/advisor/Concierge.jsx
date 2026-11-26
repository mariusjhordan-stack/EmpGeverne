import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUp, RotateCcw, X } from 'lucide-react';
import { askAdvisor } from '../../services/advisor';
import { MiniDial } from '../common/GenevaClock';

const CURRENCIES = [
  { code: 'PEN', label: 'S/' },
  { code: 'USD', label: 'US$' },
  { code: 'EUR', label: '€' },
];
const STARTERS = {
  PEN: ['Tengo S/ 10,000, ¿qué me recomiendas?', 'Busco un reloj de buceo por S/ 20,000', 'Un reloj de vestir elegante para mi boda', '¿Qué diferencia hay entre automático y cuarzo?'],
  USD: ['Tengo US$ 3,000, ¿qué me recomiendas?', 'Busco un reloj de buceo por US$ 6,000', 'Un reloj de vestir elegante para mi boda', '¿Qué diferencia hay entre automático y cuarzo?'],
  EUR: ['Tengo €2,500, ¿qué me recomiendas?', 'Busco un reloj de buceo por €5,000', 'Un reloj de vestir elegante para mi boda', '¿Qué diferencia hay entre automático y cuarzo?'],
};
const ROMAN = ['I', 'II', 'III', 'IV'];
const WELCOME = 'Bienvenido a Cronos Genève. Soy su concierge: cuénteme qué busca y cuál es su presupuesto, y le mostraré solo las piezas que encajan.';

/** Asesor de compra con Gemini (en el servidor). Se abre con el botón redondo de la esquina. */
export default function Concierge() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState(() => { try { return localStorage.getItem('cg-currency') || 'PEN'; } catch { return 'PEN'; } });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { try { localStorage.setItem('cg-currency', currency); } catch { /* sin almacenamiento */ } }, [currency]);
  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }); }, [messages, busy, open]);
  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener('concierge:open', openIt);
    return () => window.removeEventListener('concierge:open', openIt);
  }, []);

  if (pathname.startsWith('/admin')) return null;

  const send = async (text) => {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const history = next.slice(-12).map(({ role, content: c }) => ({ role, content: c }));
      const data = await askAdvisor(history, currency);
      setMessages((m) => [...m, { role: 'assistant', content: data.reply, watches: data.watches ?? [], mode: data.mode }]);
    } catch (err) {
      const status = err.response?.status;
      setMessages((m) => [...m, { role: 'assistant', content: status === 429 ? 'Recibí muchas consultas seguidas. Espere un minuto y vuelva a escribirme, por favor.' : 'No pude responder en este momento. Inténtelo otra vez en unos segundos.', error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <button type="button" className="concierge-fab" onClick={() => setOpen(true)} aria-label="Abrir el concierge (asesor con inteligencia artificial)" title="Concierge">
          <MiniDial size={52} className="dial" />
        </button>
      )}
      {open && (
        <section className="concierge" role="dialog" aria-modal="false" aria-label="Concierge Cronos Genève">
          <header className="concierge__head">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <MiniDial size={46} />
                <div>
                  <p className="eyebrow" style={{ color: 'rgba(242,239,232,.55)' }}>Asesor · Gemini</p>
                  <p className="concierge__title">Le <em>Concierge</em></p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && <button type="button" className="header-icon" style={{ color: '#f2efe8' }} onClick={() => setMessages([])} aria-label="Empezar de nuevo" title="Empezar de nuevo"><RotateCcw size={16} /></button>}
                <button type="button" className="header-icon" style={{ color: '#f2efe8' }} onClick={() => setOpen(false)} aria-label="Cerrar el concierge"><X size={18} /></button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2" role="radiogroup" aria-label="Moneda">
              {CURRENCIES.map((c) => (
                <button key={c.code} type="button" role="radio" aria-checked={currency === c.code} onClick={() => setCurrency(c.code)}
                  className="h-8 px-3 font-mono text-[11px] tracking-widest border transition-colors"
                  style={currency === c.code ? { background: '#f2efe8', color: '#111', borderColor: '#f2efe8' } : { borderColor: 'rgba(242,239,232,.25)', color: 'rgba(242,239,232,.75)' }}>
                  {c.label} {c.code}
                </button>
              ))}
            </div>
            <div className="concierge__ticks" aria-hidden="true" />
          </header>

          <div ref={bodyRef} className="concierge__body" aria-live="polite" data-lenis-prevent>
            <p className="msg-ai">{WELCOME}</p>
            {messages.length === 0 && (
              <div className="concierge__starters">
                {STARTERS[currency].map((s, i) => (
                  <button key={s} type="button" onClick={() => send(s)}><span>{ROMAN[i]}</span>{s}</button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (m.role === 'user'
              ? <p key={i} className="msg-me">{m.content}</p>
              : (
                <div key={i}>
                  <p className="msg-ai" style={m.error ? { borderColor: 'var(--danger)' } : undefined}>{m.content}</p>
                  {m.watches?.length > 0 && (
                    <div className="msg-picks">
                      {m.watches.map((w) => (
                        <Link key={w.id} to={`/catalogo/${w.slug}`} className="msg-pick" onClick={() => window.innerWidth < 520 && setOpen(false)}>
                          {w.primary_image ? <img src={w.primary_image} alt="" /> : <span />}
                          <span className="min-w-0">
                            <span className="product-card__brand block">{w.brand_name}</span>
                            <span className="block font-serif text-lg leading-tight truncate">{w.name}</span>
                            <span className="price block mt-1">{w.shown_price ?? w.price}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {m.mode === 'basic' && <p className="body-sm mt-2">Modo básico: respuesta con el catálogo, sin IA.</p>}
                </div>
              )))}
            {busy && <div className="flex items-center gap-3 text-mute text-sm"><span className="balance" aria-hidden="true" /> Consultando el catálogo…</div>}
          </div>

          <form className="concierge__form" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <label htmlFor="concierge-input" className="sr-only">Escriba su mensaje</label>
            <input id="concierge-input" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} maxLength={600} placeholder="Ej.: tengo S/ 15,000 y busco un cronógrafo" autoComplete="off" />
            <button type="submit" className="concierge__send" disabled={busy || !input.trim()} aria-label="Enviar"><ArrowUp size={18} /></button>
          </form>
        </section>
      )}
    </>
  );
}
