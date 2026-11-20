import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', username: '', password: '', password_confirm: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.first_name) e.first_name = 'Campo requerido';
    if (!form.last_name) e.last_name = 'Campo requerido';
    if (!form.email) e.email = 'Campo requerido';
    if (!form.password) e.password = 'Campo requerido';
    else if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
    if (form.password !== form.password_confirm) e.password_confirm = 'Las contraseñas no coinciden';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setErrors({});
    setLoading(true);
    try {
      const username = form.username || form.email.split('@')[0];
      await register({ ...form, username });
      toast.success('Cuenta creada exitosamente');
      navigate('/');
    } catch (err) {
      const data = err.response?.data?.errors || err.response?.data;
      if (data && typeof data === 'object') {
        setErrors(data);
      } else {
        setErrors({ general: 'Error al crear la cuenta' });
      }
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, type = 'text') => (
    <div className="mb-4">
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input type={type} value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
      {errors[name] && <p className="text-xs text-red-500 mt-1">{Array.isArray(errors[name]) ? errors[name][0] : errors[name]}</p>}
    </div>
  );

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 animate-fade-in">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-charcoal mb-2">Crear Cuenta</h1>
          <p className="text-sm text-gray-500">Únete a Cronos Genève</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm animate-scale-in stagger-1">
          {errors.general && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded">{errors.general}</div>}
          <div className="grid grid-cols-2 gap-4">
            {field('first_name', 'Nombres')}
            {field('last_name', 'Apellidos')}
          </div>
          {field('email', 'Correo electrónico', 'email')}
          {field('password', 'Contraseña', 'password')}
          {field('password_confirm', 'Confirmar contraseña', 'password')}
          <button type="submit" disabled={loading}
            className="w-full bg-gold hover:bg-gold-dark text-white py-3 rounded-lg text-sm tracking-wider transition-colors disabled:opacity-50 mt-2">
            {loading ? 'CREANDO CUENTA...' : 'CREAR CUENTA'}
          </button>
          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tienes cuenta? <Link to="/login" className="text-gold hover:text-gold-dark">Ingresar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
