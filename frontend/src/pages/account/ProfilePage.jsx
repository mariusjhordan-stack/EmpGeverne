import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { PageHero } from '../../components/common/SectionHeader';
import Reveal from '../../components/common/Reveal';
import FloatingInput from '../../components/common/FloatingInput';
import Button from '../../components/common/Button';

export default function ProfilePage() {
  const { user, fetchProfile } = useAuth();
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '' });
  const [addresses, setAddresses] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (user) setForm({ first_name: user.first_name || '', last_name: user.last_name || '', phone: user.phone || '' });
    api.get('/auth/addresses/').then(({ data }) => setAddresses(data.results || data)).catch(() => {});
  }, [user]);
  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.patch('/auth/profile/', form); await fetchProfile(); toast.success('Perfil actualizado'); }
    catch { toast.error('Error al actualizar'); }
    finally { setSaving(false); }
  };
  const changePassword = async (e) => {
    e.preventDefault();
    try { await api.post('/auth/change-password/', pwForm); setPwForm({ old_password: '', new_password: '' }); toast.success('Contraseña cambiada'); }
    catch (err) { toast.error(err.response?.data?.errors?.old_password?.[0] || err.response?.data?.errors?.new_password?.[0] || 'Error'); }
  };
  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || 'C';
  return (
    <>
      <PageHero eyebrow="Su cuenta" title={<>Mi <em>perfil</em></>} description="Sus datos personales y direcciones en un solo lugar." />
      <div className="container section--tight grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        <Reveal className="card lg:sticky lg:top-24">
          <div className="mb-6 grid h-16 w-16 place-items-center rounded-full num" style={{ color: 'var(--ink)', background: 'var(--champagne)' }}>{initials}</div>
          <p className="eyebrow eyebrow--accent mb-3">Cuenta personal</p>
          <h2 className="card-title">{[user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Cliente Cronos'}</h2>
          <p className="body-sm mt-3 break-all">{user?.email}</p>
          <div className="divider my-6" />
          <p className="body-sm">{addresses.length} {addresses.length === 1 ? 'dirección guardada' : 'direcciones guardadas'}</p>
        </Reveal>
        <div className="grid gap-6">
          <Reveal delay={70} className="card">
            <p className="eyebrow eyebrow--accent mb-3">Datos de cuenta</p>
            <h2 className="card-title mb-6">Información personal</h2>
            <form onSubmit={saveProfile} className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FloatingInput id="profile-first-name" label="Nombres" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                <FloatingInput id="profile-last-name" label="Apellidos" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
              <FloatingInput id="profile-email" label="Correo electrónico" value={user?.email || ''} disabled />
              <FloatingInput id="profile-phone" label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <div><Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button></div>
            </form>
          </Reveal>
          <Reveal delay={140} className="card">
            <p className="eyebrow eyebrow--accent mb-3">Seguridad</p>
            <h2 className="card-title mb-6">Cambiar contraseña</h2>
            <form onSubmit={changePassword} className="grid gap-5">
              <FloatingInput id="old-password" type="password" label="Contraseña actual" value={pwForm.old_password} onChange={(e) => setPwForm({ ...pwForm, old_password: e.target.value })} />
              <FloatingInput id="new-password" type="password" label="Nueva contraseña" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} />
              <div><Button type="submit" variant="ghost">Cambiar contraseña</Button></div>
            </form>
          </Reveal>
          <Reveal delay={210} className="card">
            <p className="eyebrow eyebrow--accent mb-3">Destinos</p>
            <h2 className="card-title mb-6">Direcciones</h2>
            {addresses.length === 0 ? <p className="text-dim">No tiene direcciones guardadas.</p> : (
              <div className="grid gap-3">
                {addresses.map((a) => <div key={a.id} className="panel">
                  <div className="flex flex-wrap items-center gap-3"><strong>{a.label}</strong>{a.is_default && <span className="badge badge--accent">Principal</span>}</div>
                  <p className="body-sm mt-2">{a.street}, {a.city}, {a.state} {a.postal_code}</p>
                </div>)}
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </>
  );
}
