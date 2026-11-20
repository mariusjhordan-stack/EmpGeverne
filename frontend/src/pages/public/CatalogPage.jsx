import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import api from '../../services/api';
import WatchCard from '../../components/catalog/WatchCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 animate-fade-in">
      <div className="mb-8 animate-fade-in-up">
        <p className="text-gold tracking-[0.3em] text-xs mb-2">CRONOS GENÈVE</p>
        <h1 className="font-serif text-3xl md:text-4xl text-charcoal">Catálogo</h1>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text" placeholder="Buscar relojes..." value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold"
          />
        </div>
        <button onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-lg text-sm hover:border-gold transition-colors">
          <SlidersHorizontal size={16} /> Filtros
        </button>
      </div>

      {/* Filters panel */}
      {filtersOpen && (
        <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in-down">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Marca</label>
            <select value={filters.brand} onChange={(e) => updateFilter('brand', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold">
              <option value="">Todas</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Colección</label>
            <select value={filters.collection} onChange={(e) => updateFilter('collection', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold">
              <option value="">Todas</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Precio mín.</label>
            <input type="number" placeholder="0" value={filters.min_price}
              onChange={(e) => updateFilter('min_price', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Precio máx.</label>
            <input type="number" placeholder="99999" value={filters.max_price}
              onChange={(e) => updateFilter('max_price', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ordenar</label>
            <select value={filters.ordering} onChange={(e) => updateFilter('ordering', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold">
              <option value="-created_at">Más recientes</option>
              <option value="price">Precio: menor a mayor</option>
              <option value="-price">Precio: mayor a menor</option>
              <option value="name">Nombre A-Z</option>
            </select>
          </div>
        </div>
      )}

      {hasFilters && (
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-gray-500">{totalCount} resultados</span>
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
            <X size={14} /> Limpiar filtros
          </button>
        </div>
      )}

      {/* Results */}
      {loading ? <LoadingSpinner text="Cargando catálogo..." /> : watches.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">No se encontraron relojes.</p>
          {hasFilters && <button onClick={clearFilters} className="text-sm text-gold hover:text-gold-dark">Limpiar filtros</button>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {watches.map((w) => <WatchCard key={w.id} watch={w} />)}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p}
                  onClick={() => setFilters((prev) => ({ ...prev, page: p }))}
                  className={`w-10 h-10 rounded text-sm ${p === filters.page ? 'bg-gold text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gold'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
