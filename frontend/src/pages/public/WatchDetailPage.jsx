import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Minus, Plus, ArrowLeft, Check } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import WatchCard from '../../components/catalog/WatchCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import Reveal from '../../components/common/Reveal';
import SectionHeader from '../../components/common/SectionHeader';
import Button from '../../components/common/Button';

export default function WatchDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [watch, setWatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
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
      })
      .catch(() => navigate('/catalogo'))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setAdding(true);
    try {
      await addToCart(watch.id, quantity);
    } catch {}
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

  if (loading) return <LoadingSpinner text="Cargando producto..." />;
  if (!watch) return null;

  const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(p);
  const images = watch.images || [];
  const currentImage = images[selectedImage];

  const specs = [
    { label: 'Referencia', value: watch.reference },
    { label: 'Movimiento', value: watch.movement === 'automatic' ? 'Automático' : watch.movement === 'manual' ? 'Cuerda manual' : watch.movement === 'quartz' ? 'Cuarzo' : watch.movement },
    { label: 'Material de caja', value: watch.case_material },
    { label: 'Diámetro', value: watch.case_diameter },
    { label: 'Resistencia al agua', value: watch.water_resistance },
    { label: 'Cristal', value: watch.crystal === 'sapphire' ? 'Cristal de zafiro' : watch.crystal === 'mineral' ? 'Cristal mineral' : watch.crystal },
    { label: 'Correa', value: watch.strap_material },
    { label: 'Garantía', value: watch.warranty },
  ];

  return (
    <div className="container section section--tight">
      <Reveal><Button variant="link" type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Volver a la selección</Button></Reveal>
      <div className="grid gap-10 pt-10 lg:grid-cols-[1.1fr_.9fr] lg:gap-20">
        <Reveal className="min-w-0">
          <div className="media-well aspect-[4/5] p-8 md:p-14">
            {currentImage ? <img key={selectedImage} src={currentImage.image} alt={currentImage.alt_text || watch.name} className="animate-fade-in" />
              : <div className="grid h-full place-items-center text-mute"><ShoppingBag size={56} strokeWidth={1} /></div>}
          </div>
          {images.length > 1 && <div className="flex gap-3 overflow-x-auto pt-4">
            {images.map((img, i) => <button type="button" key={img.id} onClick={() => setSelectedImage(i)} aria-label={`Ver imagen ${i + 1} de ${watch.name}`} aria-pressed={i === selectedImage}
              className="media-well h-20 w-20 shrink-0 p-2" style={{ border: i === selectedImage ? '2px solid var(--champagne)' : '2px solid var(--line)' }}>
              <img src={img.image} alt="" />
            </button>)}
          </div>}
        </Reveal>
        <Reveal delay={120} className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow eyebrow--accent mb-5">{watch.brand?.name}</p>
          <h1 className="display-lg mb-5">{watch.name}</h1>
          <p className="eyebrow mb-9">Referencia · {watch.reference}</p>
          <p className="price price--lg mb-8">{formatPrice(watch.price)}</p>
          <div className="mb-7">{watch.is_available
            ? <span className="badge badge--success"><Check size={13} /> En stock · {watch.stock} disponibles</span>
            : <span className="badge badge--danger">Agotado</span>}</div>
          <p className="lede mb-9">{watch.description}</p>
          <div className="grid gap-3 mb-4">
            {watch.is_available && <>
              <div className="card flex w-fit items-center gap-2 !p-1">
                <button type="button" aria-label="Reducir cantidad" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="btn-icon"><Minus size={15} /></button>
                <span className="num min-w-6 text-center">{quantity}</span>
                <button type="button" aria-label="Aumentar cantidad" onClick={() => setQuantity(Math.min(watch.stock, quantity + 1))} className="btn-icon"><Plus size={15} /></button>
              </div>
            </>}
            <div className="flex items-center gap-3">
              {watch.is_available && <Button size="lg" block type="button" onClick={handleAddToCart} disabled={adding}><ShoppingBag size={18} /> {adding ? 'Agregando...' : 'Agregar al carrito'}</Button>}
              <button type="button" onClick={toggleFavorite} aria-label={isFavorited ? 'Quitar de favoritos' : 'Agregar a favoritos'} aria-pressed={isFavorited} className={`btn-icon h-14 w-14 shrink-0 ${isFavorited ? 'text-accent' : ''}`}>
                <Heart size={19} fill={isFavorited ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
          <p className="body-sm mb-10">{isFavorited ? 'Guardado en favoritos' : 'Guarde esta pieza en sus favoritos'} · Compra segura · Atención personalizada</p>
          <div className="divider mb-8" />
          <h2 className="display-sm mb-5">Los <em>detalles</em></h2>
          <dl className="spec-list">{specs.map((s) => <div key={s.label} className="spec-row"><dt>{s.label}</dt><dd>{s.value}</dd></div>)}</dl>
        </Reveal>
      </div>
      {watch.related_watches?.length > 0 && <section className="section">
        <div className="divider mb-16" />
        <Reveal><SectionHeader eyebrow="También en la selección" title={<>También le puede <em>interesar</em></>} /></Reveal>
        <div className="rail mt-10">{watch.related_watches.map((w, index) => <Reveal key={w.id} delay={Math.min(index, 6) * 70}><WatchCard watch={w} /></Reveal>)}</div>
      </section>}
    </div>
  );
}
