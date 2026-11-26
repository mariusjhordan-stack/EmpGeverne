import axios from 'axios';
import { VITRINA } from './mode';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Vitrina estática (Firebase): no hay servidor; las respuestas salen de /static-api/*.json en el navegador.
if (VITRINA) {
  api.defaults.adapter = (config) => import('./vitrina').then((m) => m.default(config));
}

api.interceptors.request.use((config) => {
  const tokens = JSON.parse(localStorage.getItem('tokens') || 'null');
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const tokens = JSON.parse(localStorage.getItem('tokens') || 'null');
      if (tokens?.refresh) {
        try {
          const { data } = await axios.post('/api/auth/token/refresh/', {
            refresh: tokens.refresh,
          });
          localStorage.setItem('tokens', JSON.stringify({
            access: data.access,
            refresh: data.refresh || tokens.refresh,
          }));
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.removeItem('tokens');
          localStorage.removeItem('user');
          window.dispatchEvent(new Event('auth:logout'));
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
