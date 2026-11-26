import { RevealLines } from '../common/Reveal';
import { MiniDial, useGenevaTime } from '../common/GenevaClock';
// render 3D del Submariner de acero (el mismo de la portada) con el fondo quitado
import watch from '../../assets/editorial/submariner-steel.webp';

const fmt = new Intl.DateTimeFormat('es-PE', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

// lo que de verdad gana el cliente al tener cuenta
const PRIVILEGES = [
  ['I', 'Favoritos', 'Guarde las piezas que le interesan.'],
  ['II', 'Pedidos', 'Siga cada compra paso a paso.'],
  ['III', 'Concierge', 'Un asesor que conoce el catálogo.'],
];

/**
 * Marco de "salón privado" para ingresar y registrarse:
 * a la izquierda el reloj de acero flotando sobre negro, con la hora de Ginebra en vivo;
 * a la derecha el formulario.
 */
export default function AuthShell({ kicker, quote, children }) {
  const now = useGenevaTime();
  return (
    <div className="auth">
      <aside className="auth__salon">
        <span className="auth__ring" aria-hidden="true" />
        <img src={watch} alt="" className="auth__watch" aria-hidden="true" />
        <span className="auth__veil" aria-hidden="true" />
        <div className="auth__top">
          <p className="auth__kicker"><MiniDial size={30} /> Cronos Genève · {kicker}</p>
          <p className="auth__time">Genève <span>{fmt.format(now)}</span></p>
        </div>
        <div className="auth__bottom">
          <RevealLines as="p" className="auth__quote" delay={150} lines={quote} />
          {/* entran al cargar (no al hacer scroll): siempre están a la vista */}
          <span className="auth__rule auth__in" style={{ '--d': '450ms' }} aria-hidden="true" />
          <ul className="auth__perks">
            {PRIVILEGES.map(([no, title, text], i) => (
              <li key={no} className="auth__in" style={{ '--d': `${600 + i * 120}ms` }}>
                <b>{no}</b>
                <strong>{title}</strong>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <section className="auth__panel">
        <div className="auth__form">{children}</div>
        <p className="auth__foot">Acceso privado · Cronos Genève · MCMLXXXVII</p>
      </section>
    </div>
  );
}
