import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

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
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type={type} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })}
        className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-charcoal">Relojes</h1>
        <button onClick={startCreate} className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-white px-4 py-2 rounded-lg text-sm">
          <Plus size={16} /> Nuevo reloj
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
      </div>

      {/* Form */}
      {editMode && (
        <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-charcoal mb-4">{editMode === 'new' ? 'Nuevo reloj' : 'Editar reloj'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {formField('name', 'Nombre')}
            {formField('slug', 'Slug')}
            {formField('reference', 'Referencia')}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Marca</label>
              <select value={form.brand || ''} onChange={(e) => setForm({ ...form, brand: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold">
                <option value="">Seleccionar</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Colección</label>
              <select value={form.collection || ''} onChange={(e) => setForm({ ...form, collection: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold">
                <option value="">Ninguna</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {formField('price', 'Precio', 'number')}
            {formField('stock', 'Stock', 'number')}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Movimiento</label>
              <select value={form.movement || 'automatic'} onChange={(e) => setForm({ ...form, movement: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold">
                <option value="automatic">Automático</option>
                <option value="manual">Cuerda manual</option>
                <option value="quartz">Cuarzo</option>
              </select>
            </div>
            {formField('case_material', 'Material de caja')}
            {formField('case_diameter', 'Diámetro')}
            {formField('water_resistance', 'Resistencia al agua')}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cristal</label>
              <select value={form.crystal || 'sapphire'} onChange={(e) => setForm({ ...form, crystal: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold">
                <option value="sapphire">Cristal de zafiro</option>
                <option value="mineral">Cristal mineral</option>
                <option value="acrylic">Acrílico</option>
              </select>
            </div>
            {formField('strap_material', 'Correa')}
            {formField('warranty', 'Garantía')}
          </div>
          <div className="col-span-full mt-4">
            <label className="block text-xs text-gray-500 mb-1">Descripción</label>
            <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold" />
          </div>
          <div className="flex items-center gap-6 mt-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Activo</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> Destacado</label>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={save} disabled={saving} className="bg-gold hover:bg-gold-dark text-white px-6 py-2 rounded-lg text-sm disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={cancel} className="border border-gray-200 text-gray-600 px-6 py-2 rounded-lg text-sm hover:border-gold">Cancelar</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b bg-gray-50">
            <th className="p-4">Nombre</th><th className="p-4">Marca</th><th className="p-4">Ref.</th><th className="p-4">Precio</th><th className="p-4">Stock</th><th className="p-4">Estado</th><th className="p-4">Acciones</th>
          </tr></thead>
          <tbody>
            {watches.map((w) => (
              <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-medium">{w.name}</td>
                <td className="p-4 text-gray-600">{w.brand_name}</td>
                <td className="p-4 text-gray-500 text-xs">{w.reference}</td>
                <td className="p-4">{formatPrice(w.price)}</td>
                <td className="p-4"><span className={w.stock === 0 ? 'text-red-500' : ''}>{w.stock}</span></td>
                <td className="p-4">{w.is_active ? <span className="text-green-600 text-xs">Activo</span> : <span className="text-gray-400 text-xs">Inactivo</span>}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(w)} className="text-gray-400 hover:text-blue-600"><Pencil size={16} /></button>
                    <button onClick={() => deleteWatch(w.id, w.name)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {watches.length === 0 && <p className="text-center py-10 text-gray-500">No se encontraron relojes</p>}
      </div>
    </div>
  );
}
