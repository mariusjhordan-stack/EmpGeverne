import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Minus, Plus, ArrowLeft, Check } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import WatchCard from '../../components/catalog/WatchCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

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
    <div className="max-w-7xl mx-auto px-4 py-10 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-charcoal mb-8 transition-colors duration-200">
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Images */}
        <div className="animate-fade-in-up">
          <div className="aspect-square bg-white rounded-lg overflow-hidden mb-4">
            {currentImage ? (
              <img src={currentImage.image} alt={currentImage.alt_text || watch.name} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button key={img.id} onClick={() => setSelectedImage(i)}
                  className={`w-20 h-20 rounded overflow-hidden border-2 ${i === selectedImage ? 'border-gold' : 'border-transparent'}`}>
                  <img src={img.image} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="animate-fade-in-up stagger-2">
          <div className="mb-6">
            <p className="text-gold tracking-[0.3em] text-xs mb-2">{watch.brand?.name}</p>
            <h1 className="font-serif text-3xl md:text-4xl text-charcoal mb-2">{watch.name}</h1>
            <p className="text-xs text-gray-400">Ref. {watch.reference}</p>
          </div>

          <p className="text-2xl font-semibold text-charcoal mb-6">{formatPrice(watch.price)}</p>

          <p className="text-gray-600 leading-relaxed mb-8">{watch.description}</p>

          {/* Stock */}
          <div className="mb-6">
            {watch.is_available ? (
              <span className="inline-flex items-center gap-1 text-sm text-green-600"><Check size={16} /> En stock ({watch.stock} disponibles)</span>
            ) : (
              <span className="text-sm text-red-500">Agotado</span>
            )}
          </div>

          {/* Quantity + Add */}
          {watch.is_available && (
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-gray-200 rounded-lg">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 hover:bg-gray-50"><Minus size={16} /></button>
                <span className="px-4 text-sm font-medium">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(watch.stock, quantity + 1))} className="p-3 hover:bg-gray-50"><Plus size={16} /></button>
              </div>
              <button onClick={handleAddToCart} disabled={adding}
                className="flex-1 flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-white py-3 px-6 rounded-lg text-sm tracking-wider transition-colors disabled:opacity-50">
                <ShoppingBag size={18} /> {adding ? 'AGREGANDO...' : 'AGREGAR AL CARRITO'}
              </button>
            </div>
          )}

          <button onClick={toggleFavorite}
            className={`flex items-center gap-2 text-sm ${isFavorited ? 'text-red-500' : 'text-gray-500 hover:text-red-500'} transition-colors`}>
            <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
            {isFavorited ? 'En favoritos' : 'Agregar a favoritos'}
          </button>

          {/* Specs */}
          <div className="mt-10 border-t border-gray-200 pt-8">
            <h2 className="text-sm font-semibold tracking-wider text-charcoal mb-4">ESPECIFICACIONES</h2>
            <div className="space-y-3">
              {specs.map((s) => (
                <div key={s.label} className="flex justify-between text-sm py-2 border-b border-gray-100">
                  <span className="text-gray-500">{s.label}</span>
                  <span className="text-charcoal font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Related */}
      {watch.related_watches?.length > 0 && (
        <section className="mt-20">
          <h2 className="font-serif text-2xl text-charcoal mb-8">Relojes relacionados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {watch.related_watches.map((w) => <WatchCard key={w.id} watch={w} />)}
          </div>
        </section>
      )}
    </div>
  );
}
