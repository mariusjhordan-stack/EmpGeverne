import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import FloatingInput from '../../components/common/FloatingInput';

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
    <div className="auth-page">
      <section className="auth-layout animate-fade-in">
        <div className="auth-editorial">
          <p className="editorial-kicker">CRONOS GENÈVE · CUENTA</p>
          <h2>El tiempo, a su manera.</h2>
          <p>Acceda a su espacio Cronos Genève y continúe explorando nuestra selección.</p>
          <span className="auth-edition">HAUTE HORLOGERIE · LIMA</span>
        </div>
        <div className="auth-form-wrap">
          <form onSubmit={handleSubmit} className="animate-fade-in-up">
            <p className="editorial-kicker">Bienvenido de nuevo</p>
            <h1 className="font-serif text-4xl text-charcoal mt-2 mb-2">Iniciar sesión</h1>
            <p className="text-sm text-gray-500 mb-8">Accede a tu cuenta Cronos Genève.</p>
            {errors.general && <div className="mb-5 border border-red-500/30 bg-red-50 p-3 text-sm text-red-600" role="alert">{errors.general}</div>}
            <div className="space-y-5">
              <FloatingInput id="login-email" name="email" label="Correo electrónico" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
              <FloatingInput id="login-password" name="password" label="Contraseña" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
            </div>
            <button type="submit" disabled={loading} className="button-gold w-full mt-7 disabled:opacity-50">
              {loading ? 'Ingresando...' : 'Ingresar'} <ArrowUpRight size={15} />
            </button>
            <p className="text-center text-sm text-gray-500 mt-7">¿No tienes cuenta? <Link to="/registro" className="ml-1 text-gold hover:text-gold-light">Regístrate</Link></p>
          </form>
        </div>
      </section>
    </div>
  );
}
