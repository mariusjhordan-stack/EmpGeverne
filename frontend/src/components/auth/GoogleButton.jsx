import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { VITRINA, VITRINA_NOTICE } from '../../services/mode';

/** Sin la configuración de Firebase (VITE_FIREBASE_API_KEY) el botón no aparece; en la vitrina muestra el aviso. */
export const GOOGLE_READY = VITRINA || Boolean(import.meta.env.VITE_FIREBASE_API_KEY);

// Errores de Firebase que se explican al cliente; cerrar la ventana de Google no es un error.
const QUIET = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'];
const MESSAGES = {
  'auth/popup-blocked': 'Su navegador bloqueó la ventana de Google. Permita las ventanas emergentes para este sitio e inténtelo otra vez.',
  'auth/unauthorized-domain': 'Este sitio todavía no está autorizado para ingresar con Google.',
  'auth/network-request-failed': 'No hay conexión con Google. Revise su internet e inténtelo otra vez.',
  'auth/operation-not-allowed': 'El ingreso con Google no está activado en este momento.',
};

/** Logo oficial de Google ("G" de cuatro colores). */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/**
 * "Continuar con Google": abre la ventana de Google, el backend verifica el token y entrega la sesión.
 * onDone se llama al entrar; onError recibe el texto que se muestra en el formulario.
 */
export default function GoogleButton({ onDone, onError, disabled = false }) {
  const { loginWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const google = useRef(null);

  // Firebase se carga al mostrar el botón (no con la página), así la ventana se abre al instante al hacer clic.
  useEffect(() => {
    if (VITRINA || !GOOGLE_READY) return;
    import('../../services/google').then((module) => { google.current = module; module.prepareGoogle(); }).catch(() => {});
  }, []);

  const signIn = async () => {
    onError?.(null);
    if (VITRINA) { onError?.(VITRINA_NOTICE); return; }
    setBusy(true);
    try {
      const module = google.current ?? await import('../../services/google');
      const token = await module.googleIdToken();
      await loginWithGoogle(token);
      onDone?.();
    } catch (err) {
      if (QUIET.includes(err?.code)) return;
      onError?.(MESSAGES[err?.code] || err?.response?.data?.detail || 'No pudimos ingresar con Google. Inténtelo otra vez.');
    } finally {
      setBusy(false);
    }
  };

  if (!GOOGLE_READY) return null;
  return (
    <button type="button" className="btn btn-lg btn-block auth-google" onClick={signIn} disabled={busy || disabled} aria-busy={busy}>
      {busy ? <span className="auth-form__spin" aria-hidden="true" /> : <GoogleLogo />}
      {busy ? 'Conectando con Google…' : 'Continuar con Google'}
    </button>
  );
}
