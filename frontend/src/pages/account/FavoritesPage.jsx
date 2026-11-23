import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import api from '../../services/api';
import WatchCard from '../../components/catalog/WatchCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { PageHero } from '../../components/common/SectionHeader';
import Reveal from '../../components/common/Reveal';
import Button from '../../components/common/Button';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/catalog/favorites/').then(({ data }) => setFavorites(data.results || data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  if (loading) return <LoadingSpinner text="Cargando favoritos..." />;
  return (
    <>
      <PageHero eyebrow="Su selección" title={<>Mis <em>favoritos</em></>} description="Piezas que merecen una segunda mirada." />
      <div className="container section--tight">
        {favorites.length === 0 ? (
          <Reveal className="empty-state">
            <Heart size={40} strokeWidth={1} className="text-accent" />
            <h2 className="display-sm">Aún no tiene <em>favoritos</em></h2>
            <p className="text-dim">Guarde sus relojes preferidos mientras explora el catálogo.</p>
            <Button as={Link} to="/catalogo">Explorar catálogo</Button>
          </Reveal>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {favorites.map((f, index) => <Reveal key={f.id} delay={Math.min(index, 5) * 70}><WatchCard watch={f.watch} /></Reveal>)}
          </div>
        )}
      </div>
    </>
  );
}
