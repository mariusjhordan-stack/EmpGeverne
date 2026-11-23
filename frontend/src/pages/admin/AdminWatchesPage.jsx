import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Reveal from '../../components/common/Reveal';
import FloatingInput from '../../components/common/FloatingInput';
import Button from '../../components/common/Button';

export default function AdminWatchesPage() {
  const [watches, setWatches] = useState([]);
  const [brands, setBrands] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editMode, setEditMode] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(p);

  const fetchData = () => {
    setLoading(true);
    const params = search ? `?search=${search}` : '';
    Promise.all([
      api.get(`/catalog/admin/watches/${params}`),
      api.get('/catalog/admin/brands/'),
      api.get('/catalog/admin/collections/'),
    ]).then(([w, b, c]) => {
      setWatches(w.data.results || w.data);
      setBrands(b.data.results || b.data);
      setCollections(c.data.results || c.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [search]);

  const defaultForm = {
    name: '', slug: '', reference: '', brand: '', collection: '', description: '',
    price: '', stock: 0, movement: 'automatic', case_material: 'Acero inoxidable',
    case_diameter: '40mm', water_resistance: '100m', crystal: 'sapphire',
    strap_material: 'Acero inoxidable', warranty: '2 años', is_active: true, is_featured: false,
  };

  const startCreate = () => { setEditMode('new'); setForm(defaultForm); };
  const startEdit = (w) => { setEditMode(w.id); setForm({ ...w, brand: w.brand, collection: w.collection || '' }); };
  const cancel = () => { setEditMode(null); setForm({}); };

  const generateSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.slug) payload.slug = generateSlug(payload.name);
      if (!payload.collection) delete payload.collection;
      delete payload.images;
      delete payload.brand_name;

      if (editMode === 'new') {
        await api.post('/catalog/admin/watches/', payload);
        toast.success('Reloj creado');
      } else {
        await api.put(`/catalog/admin/watches/${editMode}/`, payload);
        toast.success('Reloj actualizado');
      }
      cancel();
      fetchData();
    } catch (err) {
      const errors = err.response?.data?.errors || err.response?.data;
      toast.error(typeof errors === 'string' ? errors : JSON.stringify(errors));
    } finally { setSaving(false); }
  };

  const deleteWatch = async (id, name) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    try {
      await api.delete(`/catalog/admin/watches/${id}/`);
      toast.success('Reloj eliminado');
      fetchData();
    } catch { toast.error('Error al eliminar'); }
  };

  if (loading && !editMode) return <LoadingSpinner text="Cargando relojes..." />;

  const formField = (key, label, type = 'text') => (
    <FloatingInput key={key} id={`watch-${key}`} type={type} label={label} value={form[key] || ''}
      onChange={(e) => setForm({ ...form, [key]: type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })} />
  );

  return (
    <div className="grid gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow eyebrow--accent mb-3">Catálogo</p><h2 className="display-md">Relojes <em>disponibles</em> <span className="num text-mute align-middle">{watches.length}</span></h2></div>
        <Button onClick={startCreate}><Plus size={16} /> Nuevo reloj</Button>
      </div>
      <div className="field max-w-xl">
        <label className="field-label" htmlFor="watch-search">Buscar relojes</label>
        <div className="relative"><Search size={17} className="text-mute absolute left-4 top-1/2 -translate-y-1/2" /><input id="watch-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, marca o referencia" className="input pl-11" /></div>
      </div>

      {editMode && <Reveal className="card">
        <p className="eyebrow eyebrow--accent mb-3">{editMode === 'new' ? 'Nueva pieza' : 'Editar pieza'}</p>
        <h3 className="card-title mb-6">{editMode === 'new' ? 'Nuevo reloj' : 'Editar reloj'}</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {formField('name', 'Nombre')}
          {formField('slug', 'Slug')}
          {formField('reference', 'Referencia')}
          <div className="field"><label htmlFor="watch-brand" className="field-label">Marca</label><select id="watch-brand" value={form.brand || ''} onChange={(e) => setForm({ ...form, brand: Number(e.target.value) })}><option value="">Seleccionar</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div className="field"><label htmlFor="watch-collection" className="field-label">Colección</label><select id="watch-collection" value={form.collection || ''} onChange={(e) => setForm({ ...form, collection: e.target.value ? Number(e.target.value) : '' })}><option value="">Ninguna</option>{collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          {formField('price', 'Precio', 'number')}
          {formField('stock', 'Stock', 'number')}
          <div className="field"><label htmlFor="watch-movement" className="field-label">Movimiento</label><select id="watch-movement" value={form.movement || 'automatic'} onChange={(e) => setForm({ ...form, movement: e.target.value })}><option value="automatic">Automático</option><option value="manual">Cuerda manual</option><option value="quartz">Cuarzo</option></select></div>
          {formField('case_material', 'Material de caja')}
          {formField('case_diameter', 'Diámetro')}
          {formField('water_resistance', 'Resistencia al agua')}
          <div className="field"><label htmlFor="watch-crystal" className="field-label">Cristal</label><select id="watch-crystal" value={form.crystal || 'sapphire'} onChange={(e) => setForm({ ...form, crystal: e.target.value })}><option value="sapphire">Cristal de zafiro</option><option value="mineral">Cristal mineral</option><option value="acrylic">Acrílico</option></select></div>
          {formField('strap_material', 'Correa')}
          {formField('warranty', 'Garantía')}
          <FloatingInput as="textarea" id="watch-description" label="Descripción" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="md:col-span-2 xl:col-span-3" />
        </div>
        <div className="flex flex-wrap items-center gap-6 mt-6">
          <label className="field-label flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Activo</label>
          <label className="field-label flex items-center gap-2"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> Destacado</label>
        </div>
        <div className="flex flex-wrap gap-3 mt-8"><Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button><Button onClick={cancel} variant="ghost">Cancelar</Button></div>
      </Reveal>}

      <Reveal delay={80} className="table-wrap">
        <table className="table">
          <thead><tr><th>Nombre</th><th>Marca</th><th>Ref.</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{watches.map((w) => <tr key={w.id}>
            <td><div className="flex items-center gap-3"><div className="media-well h-14 w-14 shrink-0">{w.primary_image ? <img src={w.primary_image} alt="" className="p-1" /> : null}</div><span className="min-w-40">{w.name}</span></div></td>
            <td className="text-dim">{w.brand_name}</td><td className="num text-mute">{w.reference}</td><td className="price">{formatPrice(w.price)}</td><td className="num">{w.stock}</td>
            <td><span className={`badge badge--${w.is_active ? 'success' : 'warn'}`}>{w.is_active ? 'Activo' : 'Inactivo'}</span></td>
            <td><div className="flex gap-2"><button onClick={() => startEdit(w)} className="btn btn-ghost btn-sm" aria-label={`Editar ${w.name}`}><Pencil size={15} />Editar</button><button onClick={() => deleteWatch(w.id, w.name)} className="btn btn-danger btn-sm" aria-label={`Eliminar ${w.name}`}><Trash2 size={15} />Eliminar</button></div></td>
          </tr>)}</tbody>
        </table>
        {watches.length === 0 && <p className="empty-state text-mute">No se encontraron relojes.</p>}
      </Reveal>
    </div>
  );
}
