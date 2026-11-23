import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { PageHero } from '../../components/common/SectionHeader';
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

  return (
    <div>
      <PageHero eyebrow="Nuestras líneas" title={<>Colecciones <em>Cronos</em></>} description="Cada colección revela una identidad propia. Explore las piezas que la definen." />
      <section className="container section section--tight">
        {loading ? <LoadingSpinner text="Cargando colecciones..." /> : collections.length === 0 ? <Reveal className="empty-state"><h2 className="display-sm">Próximamente, nuevas <em>colecciones</em></h2></Reveal> :
          <div className="bento">
            {collections.map((collection, index) => <Reveal key={collection.id} delay={Math.min(index, 6) * 70} className={index % 3 === 0 ? 'span-6 lg-span-7 tile--tall' : 'span-3 lg-span-5'}>
              <Link to={`/catalogo?collection=${collection.id}`} className="tile h-full min-h-[280px]">
                <img className="tile__img" src={collectionImages[index % collectionImages.length]} alt="" aria-hidden="true" loading="lazy" />
                <span className="tile__shade" aria-hidden="true" />
                <span className="eyebrow eyebrow--accent">Selección {String(index + 1).padStart(2, '0')}</span>
                <div className="mt-auto">
                  <h2 className="tile__title mb-3">{collection.name}</h2>
                  <p className="body-sm text-dim max-w-md">{collection.description}</p>
                  <p className="eyebrow mt-5">{collection.watch_count} relojes</p>
                </div>
                <span className="tile__arrow" aria-hidden="true">↗</span>
              </Link>
            </Reveal>)}
          </div>}
      </section>
    </div>
  );
}
