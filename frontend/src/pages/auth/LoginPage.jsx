import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!form.email) { setErrors({ email: 'Ingrese su correo' }); return; }
    if (!form.password) { setErrors({ password: 'Ingrese su contraseña' }); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Bienvenido');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Credenciales inválidas';
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 animate-fade-in">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-charcoal mb-2">Iniciar Sesión</h1>
          <p className="text-sm text-gray-500">Accede a tu cuenta Cronos Genève</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm animate-scale-in stagger-1">
          {errors.general && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded">{errors.general}</div>}
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">Correo electrónico</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div className="mb-6">
            <label className="block text-sm text-gray-600 mb-1">Contraseña</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-gold hover:bg-gold-dark text-white py-3 rounded-lg text-sm tracking-wider transition-colors disabled:opacity-50">
            {loading ? 'INGRESANDO...' : 'INGRESAR'}
          </button>
          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tienes cuenta? <Link to="/registro" className="text-gold hover:text-gold-dark">Regístrate</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
