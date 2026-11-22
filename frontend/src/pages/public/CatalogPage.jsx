import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import api from '../../services/api';
import WatchCard from '../../components/catalog/WatchCard';
import SectionHeader from '../../components/common/SectionHeader';
import Reveal from '../../components/common/Reveal';
import Skeleton from '../../components/common/Skeleton';

function WatchSkeleton() {
  return <div className="luxury-card overflow-hidden"><Skeleton className="aspect-square w-full" /><div className="space-y-3 p-5"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></div>;
}

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [watches, setWatches] = useState([]);
  const [brands, setBrands] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    brand: searchParams.get('brand') || '',
    collection: searchParams.get('collection') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    ordering: searchParams.get('ordering') || '-created_at',
    page: parseInt(searchParams.get('page')) || 1,
  });

  useEffect(() => {
    Promise.all([api.get('/catalog/brands/'), api.get('/catalog/collections/')])
      .then(([b, c]) => {
        setBrands(b.data.results || b.data);
        setCollections(c.data.results || c.data);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.brand) params.set('brand', filters.brand);
    if (filters.collection) params.set('collection', filters.collection);
    if (filters.min_price) params.set('min_price', filters.min_price);
    if (filters.max_price) params.set('max_price', filters.max_price);
    if (filters.ordering) params.set('ordering', filters.ordering);
    params.set('page', filters.page);
    setSearchParams(params);
    api.get(`/catalog/watches/?${params.toString()}`)
      .then(({ data }) => {
        setWatches(data.results || data);
        setTotalCount(data.count || (data.results || data).length);
      })
      .catch(() => setWatches([]))
      .finally(() => setLoading(false));
  }, [filters, setSearchParams]);

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  const clearFilters = () => setFilters({ search: '', brand: '', collection: '', min_price: '', max_price: '', ordering: '-created_at', page: 1 });
  const totalPages = Math.ceil(totalCount / 12);
  const hasFilters = filters.search || filters.brand || filters.collection || filters.min_price || filters.max_price;
  const activeFilters = [
    filters.brand && { key: 'brand', label: brands.find((item) => String(item.id) === String(filters.brand))?.name },
    filters.collection && { key: 'collection', label: collections.find((item) => String(item.id) === String(filters.collection))?.name },
    filters.min_price && { key: 'min_price', label: `Desde ${filters.min_price}` },
    filters.max_price && { key: 'max_price', label: `Hasta ${filters.max_price}` },
    filters.search && { key: 'search', label: `“${filters.search}”` },
  ].filter(Boolean);

  return (
    <div className="page-wrap catalog-page py-10 md:py-16">
      <Reveal>
        <SectionHeader titleAs="h1" eyebrow="CRONOS GENÈVE · SELECCIÓN" title={<>El catálogo <em>completo</em></>} description="Descubra piezas elegidas por su precisión, diseño y carácter." />
      </Reveal>

      <div className="catalog-toolbar flex flex-col gap-4 md:flex-row md:items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={17} />
          <input aria-label="Buscar relojes" type="search" placeholder="Buscar por marca, modelo o referencia" value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)} className="w-full pl-11 pr-4 py-3 border border-gray-200 text-sm" />
        </div>
        <div className="flex items-center gap-4">
          <span className="catalog-count"><strong>{totalCount}</strong> piezas</span>
          <button type="button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} className="button-outline">
            <SlidersHorizontal size={15} /> Filtros
          </button>
        </div>
      </div>

      {filtersOpen && <div className="filter-panel grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-5 md:p-6 mb-6 animate-fade-in-down">
        <div><label className="field-label" htmlFor="filter-brand">Marca</label><select id="filter-brand" value={filters.brand} onChange={(e) => updateFilter('brand', e.target.value)} className="w-full px-3 py-3 border border-gray-200 text-sm"><option value="">Todas</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></div>
        <div><label className="field-label" htmlFor="filter-collection">Colección</label><select id="filter-collection" value={filters.collection} onChange={(e) => updateFilter('collection', e.target.value)} className="w-full px-3 py-3 border border-gray-200 text-sm"><option value="">Todas</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></div>
        <div><label className="field-label" htmlFor="filter-min">Precio mínimo</label><input id="filter-min" type="number" placeholder="0" value={filters.min_price} onChange={(e) => updateFilter('min_price', e.target.value)} className="w-full px-3 py-3 border border-gray-200 text-sm" /></div>
        <div><label className="field-label" htmlFor="filter-max">Precio máximo</label><input id="filter-max" type="number" placeholder="99999" value={filters.max_price} onChange={(e) => updateFilter('max_price', e.target.value)} className="w-full px-3 py-3 border border-gray-200 text-sm" /></div>
        <div><label className="field-label" htmlFor="filter-ordering">Ordenar</label><select id="filter-ordering" value={filters.ordering} onChange={(e) => updateFilter('ordering', e.target.value)} className="w-full px-3 py-3 border border-gray-200 text-sm"><option value="-created_at">Más recientes</option><option value="price">Precio: menor a mayor</option><option value="-price">Precio: mayor a menor</option><option value="name">Nombre A-Z</option></select></div>
      </div>}

      {hasFilters && <div className="active-filter-row flex flex-wrap items-center gap-2 mb-6">
        <span className="mr-1 text-xs text-gray-500">Filtros activos</span>
        {activeFilters.map((filter) => filter.label && <button type="button" key={filter.key} onClick={() => updateFilter(filter.key, '')} className="filter-chip">{filter.label}<X size={12} /></button>)}
        <button type="button" onClick={clearFilters} className="ml-1 text-xs text-gold hover:text-gold-light">Limpiar todo</button>
      </div>}

      {loading ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" aria-label="Cargando catálogo">{Array.from({ length: 8 }, (_, i) => <WatchSkeleton key={i} />)}</div> : watches.length === 0 ? (
        <div className="empty-state py-24 text-center">
          <p className="editorial-kicker mb-3">Sin resultados</p><h2 className="font-serif text-3xl text-charcoal mb-4">No encontramos esa pieza</h2>
          <p className="mb-6 text-sm text-gray-500">Pruebe ajustando su búsqueda o los filtros seleccionados.</p>
          {hasFilters && <button type="button" onClick={clearFilters} className="button-outline">Limpiar filtros</button>}
        </div>
      ) : <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {watches.map((watch, index) => <Reveal key={watch.id} delay={(index % 4) * 45}><WatchCard watch={watch} /></Reveal>)}
        </div>
        {totalPages > 1 && <nav className="flex justify-center gap-2 mt-12" aria-label="Paginación del catálogo">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => <button type="button" key={page} aria-current={page === filters.page ? 'page' : undefined} onClick={() => setFilters((prev) => ({ ...prev, page }))} className={`pagination-button ${page === filters.page ? 'active' : ''}`}>{String(page).padStart(2, '0')}</button>)}
        </nav>}
      </>}
    </div>
  );
}
