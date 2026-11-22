import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import SectionHeader from '../../components/common/SectionHeader';

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
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/auth/profile/', form);
      await fetchProfile();
      toast.success('Perfil actualizado');
    } catch { toast.error('Error al actualizar'); }
    finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/change-password/', pwForm);
      setPwForm({ old_password: '', new_password: '' });
      toast.success('Contraseña cambiada');
    } catch (err) {
      toast.error(err.response?.data?.errors?.old_password?.[0] || err.response?.data?.errors?.new_password?.[0] || 'Error');
    }
  };

  return (
    <div className="page-wrap profile-page editorial-section animate-fade-in max-w-4xl">
      <SectionHeader titleAs="h1" eyebrow="Su cuenta" title={<>Mi <em>perfil</em></>} />

      <div className="bg-white p-6 md:p-8 shadow-sm mb-6">
        <h2 className="font-serif text-2xl font-medium text-charcoal mb-5">Información personal</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nombres</label>
              <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Apellidos</label>
              <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Correo</label>
            <input value={user?.email || ''} disabled className="w-full px-4 py-3 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-400" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Teléfono</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
          </div>
          <button type="submit" disabled={saving} className="bg-gold hover:bg-gold-dark text-white px-6 py-3 rounded-lg text-sm disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 md:p-8 shadow-sm mb-6">
        <h2 className="font-serif text-2xl font-medium text-charcoal mb-5">Cambiar contraseña</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <input type="password" placeholder="Contraseña actual" value={pwForm.old_password}
            onChange={(e) => setPwForm({ ...pwForm, old_password: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
          <input type="password" placeholder="Nueva contraseña" value={pwForm.new_password}
            onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
          <button type="submit" className="bg-charcoal hover:bg-dark text-white px-6 py-3 rounded-lg text-sm">Cambiar contraseña</button>
        </form>
      </div>

      <div className="bg-white p-6 md:p-8 shadow-sm">
        <h2 className="font-serif text-2xl font-medium text-charcoal mb-5">Direcciones</h2>
        {addresses.length === 0 ? (
          <p className="text-sm text-gray-500">No tienes direcciones guardadas.</p>
        ) : (
          <div className="space-y-3">
            {addresses.map((a) => (
              <div key={a.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{a.label} {a.is_default && <span className="text-xs text-gold">(Principal)</span>}</p>
                    <p className="text-sm text-gray-500">{a.street}, {a.city}, {a.state} {a.postal_code}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
