import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SectionHeader from '../../components/common/SectionHeader';
import Reveal from '../../components/common/Reveal';
import interiorImage from '../../assets/editorial/luxe-interior.jpg';
import movementImage from '../../assets/editorial/atelier-movement.jpg';
import wristImage from '../../assets/editorial/hero-lifestyle.jpg';

const collectionImages = [interiorImage, movementImage, wristImage];

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
    <div className="collections-page">
      <div className="page-wrap editorial-section">
        <Reveal><SectionHeader titleAs="h1" eyebrow="Nuestras líneas" title={<>Colecciones <em>Cronos</em></>} description="Cada colección reúne piezas con una identidad y una presencia propias." /></Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {collections.map((collection, index) => <Reveal key={collection.id} delay={index * 70}>
            <Link to={`/catalogo?collection=${collection.id}`} className="collection-feature group">
              <img src={collectionImages[index % collectionImages.length]} alt="" aria-hidden="true" loading="lazy" />
              <span className="collection-feature-shade" aria-hidden="true" />
              <span className="editorial-kicker">Selección 0{index + 1}</span>
              <h2 className="font-serif text-4xl md:text-5xl text-charcoal group-hover:text-gold transition-colors">{collection.name}</h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-gray-500">{collection.description}</p>
              <span className="mt-8 inline-flex items-center gap-3 text-xs uppercase tracking-[.14em] text-gold">{collection.watch_count} relojes <span aria-hidden="true">↗</span></span>
            </Link>
          </Reveal>)}
        </div>
      </div>
    </div>
  );
}
