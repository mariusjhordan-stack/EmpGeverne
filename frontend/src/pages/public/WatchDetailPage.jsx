import { lazy, Suspense, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Minus, Plus, ArrowLeft, Check, Camera, Box, ChevronRight, MessageCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import WatchCard from '../../components/catalog/WatchCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import Reveal from '../../components/common/Reveal';
import SectionHeader from '../../components/common/SectionHeader';
import Button from '../../components/common/Button';
import { toTryOnProduct } from '../../tryon/product';

const Viewer3D = lazy(() => import('../../components/three/Viewer3D'));
const TryOn = lazy(() => import('../../tryon/TryOn'));

const MOVEMENT = { automatic: 'Automático', manual: 'Cuerda manual', quartz: 'Cuarzo', solar: 'Solar', spring_drive: 'Spring Drive' };
const CRYSTAL = { sapphire: 'Cristal de zafiro', mineral: 'Cristal mineral', acrylic: 'Acrílico (Hesalite)' };
const isRender = (url) => /\/3d\//.test(url ?? '');
const VIEW_NAMES = ['Frente', 'Detalle', 'Perfil'];

/** "300m" → "300 m · 30 bar" */
function waterLabel(value) {
  const m = Number.parseInt(value, 10);
  return Number.isFinite(m) && m > 0 ? `${m} m · ${Math.round(m / 10)} bar` : value;
}

export default function WatchDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [watch, setWatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [mode, setMode] = useState('photo'); // photo | 3d
  const [tryOn, setTryOn] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/catalog/watches/${slug}/`)
      .then(({ data }) => {
        setWatch(data);
        setIsFavorited(data.is_favorited);
        setQuantity(1);
        setSelectedImage(0);
        setMode('photo');
      })
      .catch(() => navigate('/catalogo'))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setAdding(true);
    try {
      await addToCart(watch.id, quantity);
    } catch { /* el contexto ya mostró el error */ }
    setAdding(false);
  };

  const toggleFavorite = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    try {
      if (isFavorited) {
        const { data } = await api.get('/catalog/favorites/');
        const fav = (data.results || data).find((f) => f.watch.id === watch.id);
        if (fav) await api.delete(`/catalog/favorites/${fav.id}/`);
        setIsFavorited(false);
        toast.success('Eliminado de favoritos');
      } else {
        await api.post('/catalog/favorites/', { watch_id: watch.id });
        setIsFavorited(true);
        toast.success('Agregado a favoritos');
      }
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0] || 'Error');
    }
  };

  if (loading) return <LoadingSpinner text="Cargando la pieza..." />;
  if (!watch) return null;

  const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p);
  const images = watch.images || [];
  const currentImage = images[selectedImage];
  const rendered = images.some((img) => isRender(img.image));

  const groups = [
    { no: 'I', title: 'Movimiento', rows: [['Calibre', MOVEMENT[watch.movement] ?? watch.movement], ['Referencia', watch.reference], ['Garantía', watch.warranty]] },
    { no: 'II', title: 'Caja', rows: [['Material', watch.case_material], ['Diámetro', watch.case_diameter], ['Hermeticidad', waterLabel(watch.water_resistance)], ['Cristal', CRYSTAL[watch.crystal] ?? watch.crystal]] },
    { no: 'III', title: 'Esfera y correa', rows: [['Esfera', watch.dial_color || '—'], ['Correa', watch.strap_material]] },
  ];
  const diameter = Number.parseFloat(watch.case_diameter) || 40;

  return (
    <div className="container section section--tight">
      <Reveal className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="link" type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Volver</Button>
        <p className="eyebrow">Catálogo <ChevronRight size={12} /> {watch.brand?.name} <ChevronRight size={12} /> <span className="text-[var(--fg)]">{watch.reference}</span></p>
      </Reveal>
      <div className="grid gap-10 pt-8 lg:grid-cols-[1.12fr_.88fr] lg:gap-16">
        <Reveal className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="relative">
            {mode === '3d'
              ? <Suspense fallback={<div className="viewer3d aspect-[4/5]" />}><Viewer3D watch={watch} className="!aspect-[4/5]" /></Suspense>
              : (
                <div className={`media-well aspect-[4/5] ${currentImage && !isRender(currentImage.image) ? 'p-8 md:p-14' : ''}`}>
                  {currentImage
                    ? <img key={selectedImage} src={currentImage.image} alt={currentImage.alt_text || `${watch.brand?.name} ${watch.name}`} className="animate-fade-in" style={isRender(currentImage.image) ? undefined : { objectFit: 'contain', mixBlendMode: 'multiply' }} />
                    : <div className="grid h-full place-items-center text-mute"><ShoppingBag size={56} strokeWidth={1} /></div>}
                </div>
              )}
            <span className="absolute left-4 top-4 font-mono text-[10px] tracking-[0.14em] uppercase text-[#111]/55 pointer-events-none">
              {mode === '3d' ? 'Modelo 3D interactivo' : `${rendered ? 'Render' : 'Foto'} · ${VIEW_NAMES[selectedImage] ?? selectedImage + 1}`}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pt-4" role="tablist" aria-label="Vistas del reloj">
            {images.map((img, i) => (
              <button type="button" role="tab" key={img.id} onClick={() => { setMode('photo'); setSelectedImage(i); }} aria-label={`Ver ${VIEW_NAMES[i] ?? `imagen ${i + 1}`}`} aria-selected={mode === 'photo' && i === selectedImage}
                className="media-well h-24 w-20 shrink-0" style={{ outline: mode === 'photo' && i === selectedImage ? '1px solid var(--fg)' : '1px solid var(--line)', outlineOffset: 2 }}>
                <img src={img.image} alt="" style={isRender(img.image) ? undefined : { objectFit: 'contain', mixBlendMode: 'multiply', padding: 6 }} />
              </button>
            ))}
            <button type="button" role="tab" aria-selected={mode === '3d'} onClick={() => setMode('3d')}
              className="h-24 w-20 shrink-0 grid place-items-center content-center gap-1 font-mono text-[10px] tracking-widest uppercase"
              style={{ background: mode === '3d' ? 'var(--fg)' : 'var(--ink-2)', color: mode === '3d' ? 'var(--ink-2)' : 'var(--fg)', border: '1px solid var(--line-strong)' }}>
              <Box size={20} strokeWidth={1.4} /> 3D
            </button>
          </div>
        </Reveal>

        <Reveal delay={120} className="min-w-0">
          <p className="eyebrow eyebrow--accent mb-5">{watch.brand?.name}{watch.brand?.country ? ` · ${watch.brand.country}` : ''}</p>
          <h1 className="display-lg mb-6">{watch.name}</h1>
          <div className="tick-rule mb-6" aria-hidden="true" />
          <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
            <p className="price price--lg">{formatPrice(watch.price)}</p>
            {watch.is_available
              ? <span className="badge badge--success"><Check size={13} /> En stock · {watch.stock} disponibles</span>
              : <span className="badge badge--danger">Agotado</span>}
          </div>
          <p className="lede mb-8">{watch.description}</p>

          <button type="button" className="tryon-card mb-6" onClick={() => setTryOn(true)}>
            <span className="tryon-card__icon"><Camera size={20} /></span>
            <span>
              <span className="block font-serif text-2xl leading-tight">Pruébalo en tu muñeca</span>
              <span className="block text-sm opacity-70 mt-1">Con tu cámara, en tu navegador. El video no sale de tu dispositivo.</span>
            </span>
            <ChevronRight size={20} className="opacity-70" />
          </button>

          <div className="grid gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              {watch.is_available && (
                <div className="flex items-center gap-1 border" style={{ borderColor: 'var(--line-strong)', borderRadius: 2 }}>
                  <button type="button" aria-label="Reducir cantidad" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="btn-icon border-0"><Minus size={15} /></button>
                  <span className="num min-w-6 text-center">{quantity}</span>
                  <button type="button" aria-label="Aumentar cantidad" onClick={() => setQuantity(Math.min(watch.stock, quantity + 1))} className="btn-icon border-0"><Plus size={15} /></button>
                </div>
              )}
              {watch.is_available && <Button size="lg" type="button" onClick={handleAddToCart} disabled={adding} className="flex-1 basis-[230px]"><ShoppingBag size={17} /> {adding ? 'Agregando...' : 'Agregar al carrito'}</Button>}
              <button type="button" onClick={toggleFavorite} aria-label={isFavorited ? 'Quitar de favoritos' : 'Agregar a favoritos'} aria-pressed={isFavorited} className={`btn-icon h-[58px] w-[58px] shrink-0 ${isFavorited ? 'text-accent' : ''}`}>
                <Heart size={19} fill={isFavorited ? 'currentColor' : 'none'} />
              </button>
            </div>
            <button type="button" className="btn-line w-fit mt-2" onClick={() => window.dispatchEvent(new Event('concierge:open'))}><MessageCircle size={14} /> Preguntar al concierge</button>
          </div>
          <p className="body-sm mb-12">Precio en dólares · IGV calculado al pagar · Compra segura</p>

          {/* Ficha técnica, como el certificado que viene en la caja */}
          <section className="card" aria-labelledby="ficha">
            <div className="flex items-center justify-between gap-6 border-b pb-6 mb-2" style={{ borderColor: 'var(--line)' }}>
              <div>
                <p className="eyebrow">Ficha técnica</p>
                <h2 id="ficha" className="display-sm mt-2">{watch.reference}</h2>
              </div>
              <svg viewBox="0 0 120 60" width="120" height="60" aria-label={`Caja de ${diameter} mm junto a una de 40 mm`} role="img">
                <circle cx="34" cy="30" r={(40 / 2) * 1.2} fill="none" stroke="var(--mute)" strokeDasharray="2 3" />
                <circle cx="86" cy="30" r={(diameter / 2) * 1.2} fill="none" stroke="var(--champagne)" strokeWidth="1.5" />
                <text x="34" y="33" textAnchor="middle" fontSize="8" fill="var(--mute)" fontFamily="JetBrains Mono">40</text>
                <text x="86" y="33" textAnchor="middle" fontSize="8" fill="var(--champagne)" fontFamily="JetBrains Mono">{diameter}</text>
              </svg>
            </div>
            {groups.map((g) => (
              <div key={g.no} className="pt-5">
                <p className="eyebrow mb-1"><span className="text-accent font-serif italic text-base normal-case tracking-normal">{g.no}</span> {g.title}</p>
                <dl className="spec-list">{g.rows.map(([label, value]) => <div key={label} className="spec-row"><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
              </div>
            ))}
            {rendered && <p className="body-sm mt-5">Imágenes generadas con el modelo 3D de la pieza (ilustrativas).</p>}
          </section>
        </Reveal>
      </div>

      {watch.related_watches?.length > 0 && <section className="section">
        <div className="tick-rule mb-16" aria-hidden="true" />
        <SectionHeader eyebrow="También en la selección" title={<>Piezas <em>afines</em></>} />
        <div className="rail mt-10">{watch.related_watches.map((w, index) => <Reveal key={w.id} delay={Math.min(index, 6) * 70}><WatchCard watch={w} /></Reveal>)}</div>
      </section>}

      {tryOn && <Suspense fallback={null}><TryOn product={toTryOnProduct(watch)} onClose={() => setTryOn(false)} /></Suspense>}
    </div>
  );
}
