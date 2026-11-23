import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Reveal from '../../components/common/Reveal';
import FloatingInput from '../../components/common/FloatingInput';
import Button from '../../components/common/Button';

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', is_active: true });
  const [saving, setSaving] = useState(false);

  const fetch = () => {
    setLoading(true);
    api.get('/catalog/admin/collections/').then(({ data }) => setCollections(data.results || data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.slug) payload.slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (editMode === 'new') {
        await api.post('/catalog/admin/collections/', payload);
        toast.success('Colección creada');
      } else {
        await api.put(`/catalog/admin/collections/${editMode}/`, payload);
        toast.success('Colección actualizada');
      }
      setEditMode(null);
      fetch();
    } catch (err) {
      toast.error(JSON.stringify(err.response?.data || 'Error'));
    } finally { setSaving(false); }
  };

  const deleteCollection = async (id, name) => {
    if (!confirm(`¿Eliminar colección "${name}"?`)) return;
    try { await api.delete(`/catalog/admin/collections/${id}/`); toast.success('Eliminada'); fetch(); }
    catch { toast.error('No se puede eliminar'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="grid gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow eyebrow--accent mb-3">Catálogo</p><h2 className="display-md">Colecciones <em>editadas</em> <span className="num text-mute align-middle">{collections.length}</span></h2></div>
        <Button onClick={() => { setEditMode('new'); setForm({ name: '', slug: '', description: '', is_active: true }); }}><Plus size={16} /> Nueva colección</Button>
      </div>
      {editMode && <Reveal className="card">
        <p className="eyebrow eyebrow--accent mb-3">{editMode === 'new' ? 'Nueva colección' : 'Editar colección'}</p>
        <h3 className="card-title mb-6">Datos de la colección</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <FloatingInput id="collection-name" label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FloatingInput id="collection-slug" label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <FloatingInput as="textarea" id="collection-description" label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="md:col-span-2" />
        </div>
        <label className="field-label flex items-center gap-3 mt-5"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Activa</label>
        <div className="flex flex-wrap gap-3 mt-7"><Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button><Button onClick={() => setEditMode(null)} variant="ghost">Cancelar</Button></div>
      </Reveal>}
      <Reveal delay={80} className="table-wrap">
        <table className="table">
          <thead><tr><th>Nombre</th><th>Relojes</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{collections.map((c) => <tr key={c.id}>
            <td className="display-sm">{c.name}</td><td className="num">{c.watch_count || 0}</td>
            <td><span className={`badge badge--${c.is_active ? 'success' : 'warn'}`}>{c.is_active ? 'Activa' : 'Inactiva'}</span></td>
            <td><div className="flex gap-2">
              <button onClick={() => { setEditMode(c.id); setForm(c); }} className="btn btn-ghost btn-sm" aria-label={`Editar ${c.name}`}><Pencil size={15} />Editar</button>
              <button onClick={() => deleteCollection(c.id, c.name)} className="btn btn-danger btn-sm" aria-label={`Eliminar ${c.name}`}><Trash2 size={15} />Eliminar</button>
            </div></td>
          </tr>)}</tbody>
        </table>
        {collections.length === 0 && <p className="empty-state text-mute">No hay colecciones registradas.</p>}
      </Reveal>
    </div>
  );
}
