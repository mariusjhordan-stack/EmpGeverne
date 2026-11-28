import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import FloatingInput from '../../components/common/FloatingInput';
import Button from '../../components/common/Button';
import Reveal, { RevealLines } from '../../components/common/Reveal';
import AuthShell from '../../components/auth/AuthShell';
import PasswordField from '../../components/auth/PasswordField';
import GoogleButton from '../../components/auth/GoogleButton';

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
    <AuthShell kicker="Salon privé" quote={['El tiempo,', <em key="e">a su manera.</em>]}>
      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <Reveal><p className="eyebrow eyebrow--line eyebrow--accent">Bienvenido de nuevo</p></Reveal>
        <RevealLines as="h1" className="auth-form__title" delay={80} lines={[<>Iniciar <em>sesión</em></>]} />
        <Reveal delay={160}><p className="auth-form__lede">Entre a su espacio para ver sus pedidos, sus favoritos y hablar con su asesor privado.</p></Reveal>

        {errors.general && <div className="alert alert--danger mb-6" role="alert">{errors.general}</div>}

        <Reveal delay={220} className="auth-form__fields">
          <FloatingInput className="field--line" id="login-email" name="email" label="Correo electrónico" type="email" autoComplete="email" placeholder="nombre@correo.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
          <PasswordField className="field--line" id="login-password" name="password" label="Contraseña" autoComplete="current-password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
        </Reveal>

        <Reveal delay={300}>
          <Button type="submit" disabled={loading} block size="lg" className="auth-form__submit">
            {loading ? <><span className="auth-form__spin" aria-hidden="true" /> Ingresando…</> : <>Ingresar <ArrowUpRight size={17} /></>}
          </Button>
          <p className="auth-form__or"><span>o</span></p>
          <GoogleButton disabled={loading} onDone={() => { toast.success('Bienvenido'); navigate('/'); }} onError={(msg) => setErrors(msg ? { general: msg } : {})} />
          <Link to="/registro" className="btn btn-ghost btn-lg btn-block">Crear una cuenta</Link>
        </Reveal>
      </form>
    </AuthShell>
  );
}
