import api from './api';

/** Envía la conversación al asesor (Gemini en el servidor; la clave nunca llega al navegador). */
export async function askAdvisor(messages, currency = 'PEN') {
  const { data } = await api.post('/advisor/chat/', { messages, currency, language: 'es' }, { timeout: 40000 });
  return data;
}
