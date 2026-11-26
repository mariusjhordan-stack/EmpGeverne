// Textos en español de la prueba virtual (la clave es el texto original en inglés).
const ES = {
  'Close': 'Cerrar',
  'Illustrative 3D model': 'Modelo 3D ilustrativo',
  'Reset size': 'Restablecer tamaño',
  'Show the back of your hand and your whole wrist, with good light': 'Muestra el dorso de la mano y la muñeca completa, con buena luz',
  'Size': 'Tamaño',
  'Starting the camera…': 'Encendiendo la cámara…',
  'Switch camera': 'Cambiar de cámara',
  'Take a photo': 'Tomar una foto',
  'The video is processed on your device: it is not recorded or sent anywhere.': 'El video se procesa en tu dispositivo: no se graba ni se envía a ningún lugar.',
  'Turn on the camera': 'Encender la cámara',
  'Turn the watch over': 'Dar la vuelta al reloj',
  'Virtual try-on': 'Prueba virtual',
  'The camera only works on a secure connection (https). Open this page with https:// or on localhost.': 'La cámara solo funciona con conexión segura (https). Abre esta página con https:// o en localhost.',
  'Camera access was not allowed. Enable it for this site in your browser and try again.': 'No se permitió usar la cámara. Actívala para este sitio en tu navegador y vuelve a intentarlo.',
  'We could not find a camera on this device.': 'No encontramos una cámara en este dispositivo.',
  'The camera is being used by another application. Close it and try again.': 'Otra aplicación está usando la cámara. Ciérrala y vuelve a intentarlo.',
  'Hand tracking could not start in this browser.': 'El seguimiento de la mano no pudo iniciar en este navegador.',
  'The 3D watch could not load. Reload the page and try again.': 'No se pudo cargar el reloj 3D. Recargue la página e inténtelo otra vez.',
};

export const t = (text) => ES[text] ?? text;
export const useLanguage = () => ({ t });
