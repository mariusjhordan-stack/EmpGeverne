import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowUp, ArrowUpRight, RotateCcw, X } from 'lucide-react';
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
const PLACEHOLDER = { PEN: 'Ej.: tengo S/ 15,000 y busco un cronógrafo', USD: 'Ej.: tengo US$ 4,500 y busco un cronógrafo', EUR: 'Ej.: tengo €4,000 y busco un cronógrafo' };

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
  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, busy, open]);
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

  const empty = messages.length === 0;
  const activeIndex = CURRENCIES.findIndex((c) => c.code === currency);

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
            <div className="concierge__top">
              <span className="concierge__seal"><MiniDial size={46} /></span>
              <div className="min-w-0">
                <p className="concierge__kicker">Asesor<span className="concierge__wide"> privado</span> · Gemini</p>
                <p className="concierge__title">Le <em>Concierge</em></p>
                <p className="concierge__status"><i aria-hidden="true" /> En línea<span className="concierge__wide"> · responde en segundos</span></p>
              </div>
              <div className="concierge__tools">
                <button type="button" className="concierge__close" onClick={() => setOpen(false)} aria-label="Cerrar el chat" title="Cerrar (Esc)"><X size={15} /> Cerrar</button>
              </div>
            </div>
            {/* moneda: control segmentado con un indicador que se desliza */}
            <div className="concierge__seg" role="radiogroup" aria-label="Moneda" style={{ '--k': activeIndex }}>
              <span className="concierge__seg-pill" aria-hidden="true" />
              {CURRENCIES.map((c) => (
                <button key={c.code} type="button" role="radio" aria-checked={currency === c.code} onClick={() => setCurrency(c.code)}>
                  <strong>{c.label}</strong> {c.code}
                </button>
              ))}
            </div>
            <div className="concierge__ticks" aria-hidden="true" />
          </header>

          <div ref={bodyRef} className="concierge__body" aria-live="polite" data-lenis-prevent>
            <div className="concierge__welcome">
              <p className="concierge__hello">Bienvenido a <em>Cronos Genève.</em></p>
              <p>Cuénteme qué busca y cuál es su presupuesto: le mostraré solo las piezas que encajan, con su precio en {currency === 'PEN' ? 'soles' : currency === 'USD' ? 'dólares' : 'euros'}.</p>
            </div>

            {empty && (
              <div className="concierge__starters">
                <p className="concierge__label">Puede empezar por aquí</p>
                {STARTERS[currency].map((s, i) => (
                  <button key={s} type="button" onClick={() => send(s)} style={{ '--i': i }}>
                    <span className="concierge__no">{ROMAN[i]}</span>
                    <span className="min-w-0">{s}</span>
                    <ArrowRight size={15} className="concierge__go" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (m.role === 'user'
              ? <p key={i} className="msg-me">{m.content}</p>
              : (
                <div key={i} className="msg-ai-wrap">
                  <p className="concierge__label">Le Concierge</p>
                  <p className={`msg-ai ${m.error ? 'is-error' : ''}`}>{m.content}</p>
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
                          <ArrowUpRight size={16} className="msg-pick__go" aria-hidden="true" />
                        </Link>
                      ))}
                    </div>
                  )}
                  {m.mode === 'basic' && <p className="concierge__note">Modo básico: respuesta con el catálogo, sin IA.</p>}
                </div>
              )))}

            {busy && (
              <div className="concierge__typing" role="status">
                <span className="concierge__dots" aria-hidden="true"><i /><i /><i /></span> Consultando el catálogo…
              </div>
            )}
          </div>

          <form className="concierge__form" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <div className="concierge__composer">
              <label htmlFor="concierge-input" className="sr-only">Escriba su mensaje</label>
              <input id="concierge-input" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} maxLength={600} placeholder={PLACEHOLDER[currency]} autoComplete="off" />
              <button type="submit" className="concierge__send" disabled={busy || !input.trim()} aria-label="Enviar"><ArrowUp size={17} /></button>
            </div>
            <div className={`concierge__fine ${empty ? '' : 'has-reset'}`}>
              {empty
                ? <span>Solo recomienda piezas de este catálogo · Precios referenciales</span>
                : (
                  <>
                    <button type="button" onClick={() => { setMessages([]); inputRef.current?.focus(); }}><RotateCcw size={11} /> Nueva consulta</button>
                    <span>Precios referenciales</span>
                  </>
                )}
            </div>
          </form>
        </section>
      )}
    </>
  );
}
