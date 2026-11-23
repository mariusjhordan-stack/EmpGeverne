import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import FloatingInput from '../../components/common/FloatingInput';
import Button from '../../components/common/Button';
import Reveal from '../../components/common/Reveal';
import lifestyleImage from '../../assets/editorial/hero-lifestyle.jpg';

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
    <div className="grid min-h-[calc(100vh-72px)] lg:grid-cols-2">
      <aside className="tile hidden min-h-full flex-col lg:flex">
        <img src={lifestyleImage} alt="" className="tile__img" aria-hidden="true" />
        <span className="tile__shade" aria-hidden="true" />
        <Reveal><p className="eyebrow eyebrow--accent">Cronos Genève · cuenta</p></Reveal>
        <Reveal delay={100} className="mt-auto max-w-xl">
          <p className="quote mb-8">El tiempo, <em>a su manera.</em></p>
          <p className="lede">Acceda a su espacio Cronos Genève y continúe explorando nuestra selección.</p>
        </Reveal>
        <Reveal delay={180}><p className="eyebrow">Haute horlogerie · Lima</p></Reveal>
      </aside>
      <section className="flex items-center justify-center px-6 py-16 md:px-12">
        <Reveal delay={80} className="w-full max-w-md">
          <form onSubmit={handleSubmit}>
            <p className="eyebrow eyebrow--accent mb-5">Bienvenido de nuevo</p>
            <h1 className="display-md mb-4">Iniciar <em>sesión</em></h1>
            <p className="text-dim mb-10">Acceda a su cuenta Cronos Genève.</p>
            {errors.general && <div className="alert alert--danger mb-6" role="alert">{errors.general}</div>}
            <div className="grid gap-5">
              <FloatingInput id="login-email" name="email" label="Correo electrónico" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
              <FloatingInput id="login-password" name="password" label="Contraseña" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
            </div>
            <Button type="submit" disabled={loading} block size="lg" className="mt-8">{loading ? 'Ingresando...' : 'Ingresar'} <ArrowUpRight size={17} /></Button>
            <p className="body-sm mt-8 text-center">¿Aún no tiene cuenta? <Link to="/registro" className="btn-link ml-1">Regístrese</Link></p>
          </form>
        </Reveal>
      </section>
    </div>
  );
}
