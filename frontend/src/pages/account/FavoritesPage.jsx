import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import api from '../../services/api';
import WatchCard from '../../components/catalog/WatchCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SectionHeader from '../../components/common/SectionHeader';
import Reveal from '../../components/common/Reveal';

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
    <div className="page-wrap favorites-page editorial-section animate-fade-in">
      <SectionHeader titleAs="h1" eyebrow="Su selección" title={<>Mis <em>favoritos</em></>} />
      {favorites.length === 0 ? (
        <div className="empty-state text-center py-20">
          <Heart className="mx-auto mb-4 text-gray-300" size={48} />
          <p className="text-gray-500">Aún no tienes favoritos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {favorites.map((f, index) => <Reveal key={f.id} delay={(index % 4) * 50}><WatchCard watch={f.watch} /></Reveal>)}
        </div>
      )}
    </div>
  );
}
