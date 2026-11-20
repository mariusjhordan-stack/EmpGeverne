import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import api from '../../services/api';
import WatchCard from '../../components/catalog/WatchCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/catalog/favorites/')
      .then(({ data }) => setFavorites(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Cargando favoritos..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 animate-fade-in">
      <h1 className="font-serif text-3xl text-charcoal mb-8 animate-fade-in-up">Mis Favoritos</h1>
      {favorites.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="mx-auto mb-4 text-gray-300" size={48} />
          <p className="text-gray-500">Aún no tienes favoritos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {favorites.map((f) => <WatchCard key={f.id} watch={f.watch} />)}
        </div>
      )}
    </div>
  );
}
