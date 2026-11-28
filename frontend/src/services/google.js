// Ingreso con Google por Firebase Authentication (mismo proyecto que la versión Java).
// Solo se usa para obtener el token de identidad de Google; la sesión de la tienda la da el backend
// (/api/auth/google/) y Firebase no guarda nada en el navegador (persistencia en memoria).
import { initializeApp } from 'firebase/app';
import { browserPopupRedirectResolver, GoogleAuthProvider, inMemoryPersistence, initializeAuth, signInWithPopup, signOut } from 'firebase/auth';

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'cronos-geneve-relojes';
// En el propio hosting de Firebase, la ventana de Google se abre desde el mismo dominio (los celulares bloquean
// el almacenamiento de terceros); en local y en otros dominios se usa el dominio de autenticación del proyecto.
const onHosting = [`${projectId}.web.app`, `${projectId}.firebaseapp.com`].includes(window.location.hostname);

let auth;
/** Prepara Firebase antes del clic, para que la ventana de Google se abra enseguida y el navegador no la bloquee. */
export function prepareGoogle() {
  auth ??= initializeAuth(initializeApp({
    projectId,
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    authDomain: onHosting ? window.location.hostname : `${projectId}.firebaseapp.com`,
  }, 'cronos-google'), { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver });
  return auth;
}

/** Abre la ventana de Google y devuelve el token de identidad que verifica el backend. */
export async function googleIdToken() {
  const firebaseAuth = prepareGoogle();
  firebaseAuth.languageCode = 'es';
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const { user } = await signInWithPopup(firebaseAuth, provider);
  try {
    return await user.getIdToken();
  } finally {
    signOut(firebaseAuth).catch(() => {});
  }
}
