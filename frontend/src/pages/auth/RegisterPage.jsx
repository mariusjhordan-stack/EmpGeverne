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
    const validation = validate();
    if (Object.keys(validation).length) { setErrors(validation); return; }
    setErrors({});
    setLoading(true);
    try {
      const username = form.username || form.email.split('@')[0];
      await register({ ...form, username });
      toast.success('Cuenta creada exitosamente');
      navigate('/');
    } catch (err) {
      const data = err.response?.data?.errors || err.response?.data;
      if (data?.detail) setErrors({ general: data.detail });
      else if (data && typeof data === 'object') setErrors(data);
      else setErrors({ general: 'Error al crear la cuenta' });
    } finally {
      setLoading(false);
    }
  };

  const errorText = (name) => (Array.isArray(errors[name]) ? errors[name][0] : errors[name]);
  const bind = (name) => ({ id: `register-${name}`, name, value: form[name], onChange: (e) => setForm({ ...form, [name]: e.target.value }), error: errorText(name), className: 'field--line' });

  return (
    <AuthShell kicker="Membresía" quote={['Una selección', <em key="e">que perdura.</em>]}>
      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <Reveal><p className="eyebrow eyebrow--line eyebrow--accent">Su espacio Cronos</p></Reveal>
        <RevealLines as="h1" className="auth-form__title" delay={80} lines={[<>Crear <em>cuenta</em></>]} />
        <Reveal delay={160}><p className="auth-form__lede">Guarde sus piezas favoritas, siga sus pedidos y reciba recomendaciones a su medida.</p></Reveal>

        {errors.general && <div className="alert alert--danger mb-6" role="alert">{errors.general}</div>}

        <Reveal delay={220} className="auth-form__fields">
          <div className="auth-form__pair">
            <FloatingInput {...bind('first_name')} label="Nombres" autoComplete="given-name" />
            <FloatingInput {...bind('last_name')} label="Apellidos" autoComplete="family-name" />
          </div>
          <FloatingInput {...bind('email')} label="Correo electrónico" type="email" autoComplete="email" placeholder="nombre@correo.com" />
          <PasswordField {...bind('password')} label="Contraseña" autoComplete="new-password" hint="Mínimo 8 caracteres" />
          <PasswordField {...bind('password_confirm')} label="Confirmar contraseña" autoComplete="new-password" />
        </Reveal>

        <Reveal delay={300}>
          <Button type="submit" disabled={loading} block size="lg" className="auth-form__submit">
            {loading ? <><span className="auth-form__spin" aria-hidden="true" /> Creando cuenta…</> : <>Crear cuenta <ArrowUpRight size={17} /></>}
          </Button>
          <p className="auth-form__or"><span>o</span></p>
          <Link to="/login" className="btn btn-ghost btn-lg btn-block">Ya tengo cuenta · Ingresar</Link>
        </Reveal>
      </form>
    </AuthShell>
  );
}
