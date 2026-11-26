import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ArrowLeft, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import WatchCard from '../../components/catalog/WatchCard';
import { PageHero } from '../../components/common/SectionHeader';
import Button from '../../components/common/Button';
import Reveal from '../../components/common/Reveal';
import { WatchCardSkeleton } from '../../components/common/Skeleton';

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

  // debounce typing: query the API once the user pauses, not on every keystroke
  const [searchInput, setSearchInput] = useState(filters.search);
  useEffect(() => { setSearchInput(filters.search); }, [filters.search]);
  useEffect(() => {
    if (searchInput === filters.search) return undefined;
    const t = setTimeout(() => updateFilter('search', searchInput), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);
  const clearFilters = () => setFilters({ search: '', brand: '', collection: '', min_price: '', max_price: '', ordering: '-created_at', page: 1 });
  const totalPages = Math.ceil(totalCount / 12);
  // al cambiar de página, volver al inicio de la grilla (en celular quedaba uno al fondo)
  const goToPage = (page) => {
    setFilters((prev) => ({ ...prev, page }));
    const top = document.getElementById('catalog-results');
    if (!top) return;
    if (window.__lenis) window.__lenis.scrollTo(top, { offset: -220 });
    else window.scrollTo({ top: top.getBoundingClientRect().top + window.scrollY - 220, behavior: 'smooth' });
  };
  const hasFilters = filters.search || filters.brand || filters.collection || filters.min_price || filters.max_price;
  const activeFilters = [
    filters.brand && { key: 'brand', label: brands.find((item) => String(item.id) === String(filters.brand))?.name },
    filters.collection && { key: 'collection', label: collections.find((item) => String(item.id) === String(filters.collection))?.name },
    filters.min_price && { key: 'min_price', label: `Desde ${filters.min_price}` },
    filters.max_price && { key: 'max_price', label: `Hasta ${filters.max_price}` },
    filters.search && { key: 'search', label: `“${filters.search}”` },
  ].filter(Boolean);

  return (
    <div>
      <PageHero eyebrow="Cronos Genève · selección" title={<>El catálogo <em>completo</em></>} description="Piezas elegidas por su precisión, diseño y carácter.">
        <span className="eyebrow eyebrow--accent num" aria-live="polite">{totalCount} {totalCount === 1 ? 'pieza' : 'piezas'}</span>
      </PageHero>
      <div className="catalog-toolbar sticky-under-header">
        <div className="container catalog-toolbar__inner">
          <div className="catalog-search">
            <label className="sr-only" htmlFor="catalog-search">Buscar relojes</label>
            <Search className="catalog-search__icon" size={16} aria-hidden="true" />
            <input id="catalog-search" type="search" placeholder="Buscar marca, modelo o referencia" value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <div className="chip-scroller" role="group" aria-label="Filtrar por marca">
            <button type="button" className={`chip ${!filters.brand ? 'is-active' : ''}`} onClick={() => updateFilter('brand', '')}>Todas</button>
            {brands.map((brand) => <button type="button" key={brand.id} className={`chip ${String(filters.brand) === String(brand.id) ? 'is-active' : ''}`} onClick={() => updateFilter('brand', String(brand.id))}>{brand.name}</button>)}
          </div>
          <div className="catalog-toolbar__actions">
            <label className="sr-only" htmlFor="catalog-ordering">Ordenar</label>
            <select id="catalog-ordering" className="select-pill" value={filters.ordering} onChange={(e) => updateFilter('ordering', e.target.value)}>
              <option value="-created_at">Novedades</option>
              <option value="price">Menor precio</option>
              <option value="-price">Mayor precio</option>
              <option value="name">Nombre A–Z</option>
            </select>
            <button type="button" className={`chip ${filtersOpen ? 'is-active' : ''}`} onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="catalog-filters">
              <SlidersHorizontal size={14} /> Filtros{activeFilters.length > 0 && <span className="chip__count num">{activeFilters.length}</span>}
            </button>
          </div>
        </div>
      </div>
      <section id="catalog-results" className="container section section--tight">
        {filtersOpen && <Reveal id="catalog-filters" variant="fade" className="card mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="field"><label className="field-label" htmlFor="filter-brand">Marca</label><select id="filter-brand" value={filters.brand} onChange={(e) => updateFilter('brand', e.target.value)}><option value="">Todas</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></div>
          <div className="field"><label className="field-label" htmlFor="filter-collection">Colección</label><select id="filter-collection" value={filters.collection} onChange={(e) => updateFilter('collection', e.target.value)}><option value="">Todas</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></div>
          <div className="field"><label className="field-label" htmlFor="filter-min">Precio mínimo</label><input id="filter-min" type="number" placeholder="0" value={filters.min_price} onChange={(e) => updateFilter('min_price', e.target.value)} /></div>
          <div className="field"><label className="field-label" htmlFor="filter-max">Precio máximo</label><input id="filter-max" type="number" placeholder="99999" value={filters.max_price} onChange={(e) => updateFilter('max_price', e.target.value)} /></div>
        </Reveal>}
        {hasFilters && <Reveal className="flex flex-wrap items-center gap-2 mb-8">
          <span className="eyebrow mr-2">Filtros activos</span>
          {activeFilters.map((filter) => filter.label && <button type="button" key={filter.key} onClick={() => updateFilter(filter.key, '')} className="chip">{filter.label}<X size={12} /></button>)}
          <Button variant="link" type="button" onClick={clearFilters}>Limpiar todo</Button>
        </Reveal>}
        {loading ? <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4 md:gap-x-6" aria-label="Cargando catálogo">{Array.from({ length: 8 }, (_, i) => <WatchCardSkeleton key={i} />)}</div> : watches.length === 0 ? (
          <Reveal className="empty-state"><p className="eyebrow eyebrow--accent">Sin resultados</p><h2 className="display-sm">No encontramos esa pieza</h2><p className="text-dim">Pruebe ajustando su búsqueda o los filtros seleccionados.</p>{hasFilters && <Button variant="ghost" type="button" onClick={clearFilters}>Limpiar filtros</Button>}</Reveal>
        ) : <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4 md:gap-x-6">{watches.map((watch, index) => <Reveal key={watch.id} delay={Math.min(index, 6) * 70}><WatchCard watch={watch} /></Reveal>)}</div>
          {totalPages > 1 && <Pager page={filters.page} total={totalPages} onChange={goToPage} />}
        </>}
      </section>
    </div>
  );
}

const pad = (n) => String(n).padStart(2, '0');

/* páginas a mostrar: la primera, la última y las vecinas de la actual; el resto se resume con "…" */
function pageList(page, total) {
  const keep = new Set([1, total, page - 1, page, page + 1]);
  const out = [];
  for (let n = 1; n <= total; n += 1) {
    if (keep.has(n)) out.push(n);
    else if (out[out.length - 1] !== '…') out.push('…');
  }
  return out;
}

/** Paginación: en computadora muestra los números; en celular, solo «← 03 / 13 →». */
function Pager({ page, total, onChange }) {
  return (
    <Reveal as="nav" className="pager" aria-label="Paginación del catálogo">
      <button type="button" className="chip pager__step" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior">
        <ArrowLeft size={15} /><span className="pager__word">Anterior</span>
      </button>
      <ol className="pager__nums">
        {pageList(page, total).map((n, i) => (n === '…'
          ? <li key={`gap-${i}`} className="pager__gap" aria-hidden="true">…</li>
          : <li key={n}><button type="button" aria-current={n === page ? 'page' : undefined} aria-label={`Página ${n}`} onClick={() => onChange(n)} className={`chip num ${n === page ? 'is-active' : ''}`}>{pad(n)}</button></li>))}
      </ol>
      <p className="pager__count num" aria-live="polite">{pad(page)} <span>/ {pad(total)}</span></p>
      <button type="button" className="chip pager__step" disabled={page >= total} onClick={() => onChange(page + 1)} aria-label="Página siguiente">
        <span className="pager__word">Siguiente</span><ArrowRight size={15} />
      </button>
    </Reveal>
  );
}
