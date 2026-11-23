import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Reveal from '../../components/common/Reveal';
import FloatingInput from '../../components/common/FloatingInput';
import Button from '../../components/common/Button';

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', country: '', is_active: true });
  const [saving, setSaving] = useState(false);

  const fetchBrands = () => {
    setLoading(true);
    api.get('/catalog/admin/brands/').then(({ data }) => setBrands(data.results || data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchBrands(); }, []);

  const generateSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.slug) payload.slug = generateSlug(payload.name);
      if (editMode === 'new') {
        await api.post('/catalog/admin/brands/', payload);
        toast.success('Marca creada');
      } else {
        await api.put(`/catalog/admin/brands/${editMode}/`, payload);
        toast.success('Marca actualizada');
      }
      setEditMode(null);
      fetchBrands();
    } catch (err) {
      toast.error(JSON.stringify(err.response?.data || 'Error'));
    } finally { setSaving(false); }
  };

  const deleteBrand = async (id, name) => {
    if (!confirm(`¿Eliminar marca "${name}"?`)) return;
    try {
      await api.delete(`/catalog/admin/brands/${id}/`);
      toast.success('Marca eliminada');
      fetchBrands();
    } catch { toast.error('No se puede eliminar: tiene relojes asociados'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="grid gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow eyebrow--accent mb-3">Catálogo</p><h2 className="display-md">Marcas <em>curadas</em> <span className="num text-mute align-middle">{brands.length}</span></h2></div>
        <Button onClick={() => { setEditMode('new'); setForm({ name: '', slug: '', description: '', country: '', is_active: true }); }}><Plus size={16} /> Nueva marca</Button>
      </div>
      {editMode && <Reveal className="card">
        <p className="eyebrow eyebrow--accent mb-3">{editMode === 'new' ? 'Nueva marca' : 'Editar marca'}</p>
        <h3 className="card-title mb-6">Datos de la marca</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <FloatingInput id="brand-name" label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FloatingInput id="brand-slug" label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <FloatingInput id="brand-country" label="País" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <FloatingInput id="brand-description" label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <label className="field-label flex items-center gap-3 mt-5"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Activa</label>
        <div className="flex flex-wrap gap-3 mt-7"><Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button><Button onClick={() => setEditMode(null)} variant="ghost">Cancelar</Button></div>
      </Reveal>}
      <Reveal delay={80} className="table-wrap">
        <table className="table">
          <thead><tr><th>Nombre</th><th>País</th><th>Relojes</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{brands.map((b) => <tr key={b.id}>
            <td className="display-sm">{b.name}</td><td className="text-dim">{b.country}</td><td className="num">{b.watch_count || 0}</td>
            <td><span className={`badge badge--${b.is_active ? 'success' : 'warn'}`}>{b.is_active ? 'Activa' : 'Inactiva'}</span></td>
            <td><div className="flex gap-2">
              <button onClick={() => { setEditMode(b.id); setForm(b); }} className="btn btn-ghost btn-sm" aria-label={`Editar ${b.name}`}><Pencil size={15} />Editar</button>
              <button onClick={() => deleteBrand(b.id, b.name)} className="btn btn-danger btn-sm" aria-label={`Eliminar ${b.name}`}><Trash2 size={15} />Eliminar</button>
            </div></td>
          </tr>)}</tbody>
        </table>
        {brands.length === 0 && <p className="empty-state text-mute">No hay marcas registradas.</p>}
      </Reveal>
    </div>
  );
}
