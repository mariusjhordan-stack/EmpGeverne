/**
 * "Servidor" de la vitrina estática: responde en el navegador las mismas rutas públicas de la API
 * leyendo los JSON que exporta backend/scripts/export_vitrina.py (carpeta /static-api/).
 * Lo que necesita cuenta o servidor (ingresar, carrito, pedidos…) responde con un aviso amable.
 * El concierge responde en "modo básico": entiende presupuesto, moneda y estilo, sin IA.
 */
import { AxiosError } from 'axios';
import { VITRINA_NOTICE } from './mode';

const PAGE_SIZE = 12; // igual que la API (PAGE_SIZE en settings.py)
const cache = new Map();

function load(name) {
  if (!cache.has(name)) {
    cache.set(name, fetch(`/static-api/${name}.json`).then((r) => {
      if (!r.ok) throw new Error('404');
      return r.json(); // si Firebase devuelve index.html, esto falla y se trata como "no encontrado"
    }).catch((e) => { cache.delete(name); throw e; }));
  }
  return cache.get(name);
}

const ok = (config, data) => ({ data, status: 200, statusText: 'OK', headers: {}, config, request: null });
function fail(config, status, detail) {
  const response = { data: { detail, error: detail }, status, statusText: String(status), headers: {}, config };
  return Promise.reject(new AxiosError(detail, AxiosError.ERR_BAD_RESPONSE, config, null, response));
}

const clean = ({ _brand, _brand_slug, _collection, _collection_slug, _movement, _stock, _featured, _reference, _created, _price, ...w }) => w; // eslint-disable-line no-unused-vars

/* ------------------------------ catálogo ------------------------------ */
function listWatches(all, params) {
  const p = (k) => params.get(k) ?? '';
  let rows = all;
  const search = p('search').trim().toLowerCase();
  if (search) {
    const terms = search.split(/\s+/);
    rows = rows.filter((w) => terms.every((t) => [w.name, w.brand_name, w._reference].some((f) => (f || '').toLowerCase().includes(t))));
  }
  if (p('brand')) rows = rows.filter((w) => String(w._brand) === p('brand'));
  if (p('brand_slug')) rows = rows.filter((w) => w._brand_slug === p('brand_slug'));
  if (p('collection')) rows = rows.filter((w) => String(w._collection) === p('collection'));
  if (p('collection_slug')) rows = rows.filter((w) => w._collection_slug === p('collection_slug'));
  if (p('min_price')) rows = rows.filter((w) => w._price >= Number(p('min_price')));
  if (p('max_price')) rows = rows.filter((w) => w._price <= Number(p('max_price')));
  if (p('movement')) rows = rows.filter((w) => w._movement === p('movement'));
  if (p('is_featured')) rows = rows.filter((w) => w._featured === (p('is_featured') === 'true'));
  if (p('in_stock')) rows = rows.filter((w) => (p('in_stock') === 'true' ? w._stock > 0 : w._stock === 0));

  const ordering = p('ordering') || '-created_at';
  const desc = ordering.startsWith('-');
  const key = { price: '_price', created_at: '_created', name: 'name' }[ordering.replace('-', '')] || '_created';
  rows = [...rows].sort((a, b) => {
    const x = a[key]; const y = b[key];
    const c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'es');
    return desc ? -c : c;
  });

  const page = Math.max(1, parseInt(p('page'), 10) || 1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const link = (n) => `/api/catalog/watches/?page=${n}`;
  return {
    count: rows.length,
    next: page < pages ? link(page + 1) : null,
    previous: page > 1 ? link(page - 1) : null,
    results: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(clean),
  };
}

/* --------------------------- concierge básico --------------------------- */
const CURRENCY = {
  USD: { rate: 1, symbol: 'US$ ', name: 'dólares' },
  PEN: { rate: 3.38, symbol: 'S/ ', name: 'soles' },
  EUR: { rate: 0.86, symbol: '€', name: 'euros' },
};
const money = (code, value) => `${CURRENCY[code].symbol}${Math.round(value).toLocaleString('en-US')}`;
const normalize = (t) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// "20000", "20 000", "20.000", "20,000", "20k", "20 mil"; no medidas, profundidades ni horas
const AMOUNT = /(?<![\w.,])(\d{1,3}(?:[.,\s]\d{3})+|\d{1,7})(?:[.,]\d{1,2})?\s*(k\b|mil\b|thousand\b)?(?!\s*(?:mm|m|cm|metros?|meters?|atm|bar|horas?|hours?|anos?|years?)\b)(?!\w)/g;
const STYLE_ASK = [
  [/buce|buzo|\bdiv(e|er|ing)|\bmar\b|nadar|swim/, 'div', 'de buceo'],
  [/cronog|chrono/, 'chrono', 'cronógrafos'],
  [/deport|sport/, 'sport', 'deportivas'],
  [/formal|vestir|elegan|dress|boda|wedding|oficina|office/, 'dress', 'de vestir'],
  [/pilot|aviador|aviacion|campo\b|field|explorad|aventura|adventure/, 'field', 'de piloto o de campo'],
  [/\bgmt\b|viaj|travel|zona horaria/, 'gmt', 'GMT para viajar'],
  [/minimal|sencill|simple/, 'minimal', 'minimalistas'],
];
const STYLE_WATCH = {
  div: /buceo|buzo|diver|submarin|inmersion|fathoms|dweller|deepsea|pelagos|marinemaster|superocean|aquanaut|abismo|seamaster|black bay/,
  sport: /deport|sport|regata|carrera|racing|offshore/,
  dress: /vestir|elegan|dress|formal|clasic|classic|ultra thin|calatrava|reverso|tank|alba|petite|reserva/,
  chrono: /cronograf|chronograph|chronomat|daytona|speedmaster/,
  field: /piloto|pilot|aviaci|navitimer|campo|field|explor|militar|andes/,
  gmt: /\bgmt\b|zona horaria|world ?time|travel/,
  minimal: /minimal|sencill|simple|pureza/,
};
const FAQ = [
  [/automatic.*(cuarzo|quartz)|(cuarzo|quartz).*automatic/, 'Un automático se da cuerda con el movimiento de la muñeca y se valora por su mecánica. Uno de cuarzo usa pila, es más preciso y necesita menos cuidado.'],
  [/(que es|que significa|diferencia|como funciona|explica).*(cronografo|chronograph)/, 'Un cronógrafo es un reloj que además mide intervalos de tiempo, como un cronómetro, con pulsadores.'],
  [/(que es|que significa|para que sirve|explica).*\bgmt\b/, 'GMT indica que el reloj muestra una segunda zona horaria, útil para viajar.'],
  [/(que es|que significa|para que sirve|explica).*(bisel|bezel)/, 'El bisel es el anillo que rodea el cristal. En los relojes de buceo gira para medir el tiempo de inmersión.'],
  [/(que es|que significa|explica|mejor).*(zafiro|sapphire)/, 'El cristal de zafiro es muy duro y resiste muy bien las rayaduras.'],
  [/(que es|que significa|explica).*(reserva de marcha|power reserve)/, 'La reserva de marcha es el tiempo que un reloj mecánico funciona sin darle cuerda.'],
  [/resistencia al agua|water resistance|\batm\b/, 'La resistencia al agua es la presión soportada en pruebas: como guía, 50 m resiste salpicaduras, 100 m sirve para nadar y 200 m o más para deportes acuáticos.'],
  [/cuidar|cuidado|limpi|manten/, 'Límpielo con un paño suave, evite golpes, imanes y químicos, y enjuáguelo con agua dulce tras el mar si es resistente al agua. Los mecánicos conviene revisarlos según indique el fabricante.'],
  [/que tamano|que talla|muneca/, 'Como guía, en muñecas pequeñas (menos de 16 cm) quedan bien 36–39 mm; en medianas (16–18 cm), 39–42 mm; y en grandes, 42 mm o más.'],
];

function budgetIn(text, shown) {
  const found = [...text.matchAll(AMOUNT)].map((m) => {
    const n = parseInt(m[1].replace(/[.,\s]/g, ''), 10) * (m[2] ? 1000 : 1);
    return n;
  }).filter((n) => n >= 100);
  if (!found.length) return null;
  const amount = found[found.length - 1];
  const code = /\b(soles?|pen)\b|s\//.test(text) ? 'PEN' : /\b(euros?|eur)\b|€/.test(text) ? 'EUR' : /\$|\busd\b|dolar|dollar/.test(text) ? 'USD' : shown;
  return { amount, code, usd: amount / CURRENCY[code].rate };
}

async function advise(config) {
  const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
  const shown = CURRENCY[body.currency] ? body.currency : 'PEN';
  const said = (body.messages || []).filter((m) => m.role === 'user').map((m) => normalize(m.content));
  const last = said[said.length - 1] || '';
  await new Promise((r) => setTimeout(r, 650)); // que se vean los puntos de "escribiendo"

  const faq = FAQ.find(([re]) => re.test(last));
  if (faq) return { reply: faq[1], watches: [], mode: 'basic' };
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hi|hello|hey|gracias)\b[\s!.,]*$/.test(last)) {
    return { reply: `${last.startsWith('gracias') ? 'Con mucho gusto.' : 'Bienvenido a Cronos Genève.'} ¿Qué estilo de reloj busca y cuál es su presupuesto aproximado, en ${CURRENCY[shown].name}?`, watches: [], mode: 'basic' };
  }

  let budget = null;
  for (let i = said.length - 1; i >= 0 && !budget; i -= 1) budget = budgetIn(said[i], shown);
  let style = null;
  for (let i = said.length - 1; i >= 0 && !style; i -= 1) style = STYLE_ASK.find(([re]) => re.test(said[i])) || null;

  if (!budget && !style) {
    return { reply: `Con gusto le ayudo. ¿Cuál es su presupuesto aproximado, en ${CURRENCY[shown].name}? Si prefiere, dígame también el estilo: buceo, vestir, cronógrafo, piloto…`, watches: [], mode: 'basic' };
  }

  const all = (await load('watches')).filter((w) => w._stock > 0);
  const blob = (w) => normalize(`${w.name} ${w.collection_name || ''} ${w._collection_slug} ${w._reference}`);
  const styled = style ? all.filter((w) => STYLE_WATCH[style[1]]?.test(blob(w)) || (style[1] === 'sport' && w._collection_slug.startsWith('deport')) || (style[1] === 'dress' && w._collection_slug.startsWith('clasic'))) : all;
  const pool = styled.length ? styled : all;

  let picks = budget ? pool.filter((w) => w._price <= budget.usd).sort((a, b) => b._price - a._price) : [...pool].sort((a, b) => a._price - b._price);
  let reply;
  const styleText = style ? ` ${style[2]}` : '';
  const show = (w) => ({ ...clean(w), shown_price: money(shown, w._price * CURRENCY[shown].rate) });

  if (budget && !picks.length) {
    picks = [...pool].sort((a, b) => a._price - b._price).slice(0, 3);
    reply = `Con ${money(budget.code, budget.amount)} no tengo piezas${styleText} disponibles por ahora. Las más accesibles empiezan en ${money(shown, picks[0]._price * CURRENCY[shown].rate)}:`;
  } else if (budget) {
    picks = picks.slice(0, 3);
    reply = `Con ${money(budget.code, budget.amount)}, estas son las piezas${styleText} que mejor aprovechan su presupuesto:`;
  } else {
    picks = picks.slice(0, 3);
    reply = `Estas son algunas piezas${styleText} de nuestro catálogo. Si me dice su presupuesto, afino la búsqueda:`;
  }
  if (style && !styled.length) reply = `No encontré piezas${styleText} en este momento, así que le muestro otras opciones. ${reply}`;
  return { reply, watches: picks.map(show), mode: 'basic' };
}

/* ------------------------------ enrutador ------------------------------ */
export default async function vitrinaAdapter(config) {
  const method = (config.method || 'get').toLowerCase();
  const url = new URL(config.url, 'http://vitrina');
  const path = url.pathname.replace(/^\/api/, '');
  const params = new URLSearchParams(url.search);
  Object.entries(config.params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, v); });

  try {
    if (method === 'get') {
      if (path === '/catalog/brands/') return ok(config, await load('brands'));
      if (path === '/catalog/collections/') return ok(config, await load('collections'));
      if (path === '/catalog/watches/featured/') return ok(config, await load('featured'));
      if (path === '/catalog/watches/') return ok(config, listWatches(await load('watches'), params));
      const detail = path.match(/^\/catalog\/watches\/([\w-]+)\/$/);
      if (detail) return ok(config, await load(`watches/${detail[1]}`));
    }
    if (method === 'post' && path === '/advisor/chat/') return ok(config, await advise(config));
  } catch {
    return fail(config, 404, 'No encontrado.');
  }
  return fail(config, 503, VITRINA_NOTICE);
}
