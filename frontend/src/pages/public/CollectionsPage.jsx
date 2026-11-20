import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/catalog/collections/')
      .then(({ data }) => setCollections(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Cargando colecciones..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <p className="text-gold tracking-[0.3em] text-xs mb-3">NUESTRAS LÍNEAS</p>
        <h1 className="font-serif text-4xl text-charcoal">Colecciones</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {collections.map((c) => (
          <Link key={c.id} to={`/catalogo?collection=${c.id}`}
            className="group bg-white rounded-lg p-10 text-center shadow-sm hover:shadow-md transition-shadow">
            <h2 className="font-serif text-2xl text-charcoal mb-3 group-hover:text-gold transition-colors">{c.name}</h2>
            <p className="text-gray-500 mb-4">{c.description}</p>
            <span className="text-sm text-gold tracking-wider">{c.watch_count} relojes →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
