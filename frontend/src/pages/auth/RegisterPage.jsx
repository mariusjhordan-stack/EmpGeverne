import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import FloatingInput from '../../components/common/FloatingInput';
import Button from '../../components/common/Button';
import Reveal from '../../components/common/Reveal';
import lifestyleImage from '../../assets/editorial/hero-lifestyle.jpg';

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
      if (data && typeof data === 'object') setErrors(data);
      else setErrors({ general: 'Error al crear la cuenta' });
    } finally {
      setLoading(false);
    }
  };

  const errorText = (name) => Array.isArray(errors[name]) ? errors[name][0] : errors[name];
  const field = (name, label, type = 'text', autoComplete) => <FloatingInput key={name} id={`register-${name}`} name={name} label={label} type={type} autoComplete={autoComplete} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} error={errorText(name)} />;

  return (
    <div className="grid min-h-[calc(100vh-72px)] lg:grid-cols-2">
      <aside className="tile hidden min-h-full flex-col lg:flex">
        <img src={lifestyleImage} alt="" className="tile__img" aria-hidden="true" />
        <span className="tile__shade" aria-hidden="true" />
        <Reveal><p className="eyebrow eyebrow--accent">Cronos Genève · membres</p></Reveal>
        <Reveal delay={100} className="mt-auto max-w-xl">
          <p className="quote mb-8">Una selección que <em>perdura.</em></p>
          <p className="lede">Descubra piezas distinguidas de las casas relojeras más prestigiosas.</p>
        </Reveal>
        <Reveal delay={180}><p className="eyebrow">Precisión · elegancia · tradición</p></Reveal>
      </aside>
      <section className="flex items-center justify-center px-6 py-16 md:px-12">
        <Reveal delay={80} className="w-full max-w-md">
          <form onSubmit={handleSubmit}>
            <p className="eyebrow eyebrow--accent mb-5">Su espacio Cronos</p>
            <h1 className="display-md mb-4">Crear <em>cuenta</em></h1>
            <p className="text-dim mb-10">Únase a Cronos Genève.</p>
            {errors.general && <div className="alert alert--danger mb-6" role="alert">{errors.general}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              {field('first_name', 'Nombres', 'text', 'given-name')}
              {field('last_name', 'Apellidos', 'text', 'family-name')}
            </div>
            <div className="mt-4 grid gap-4">
              {field('email', 'Correo electrónico', 'email', 'email')}
              {field('password', 'Contraseña', 'password', 'new-password')}
              {field('password_confirm', 'Confirmar contraseña', 'password', 'new-password')}
            </div>
            <Button type="submit" disabled={loading} block size="lg" className="mt-8">{loading ? 'Creando cuenta...' : 'Crear cuenta'} <ArrowUpRight size={17} /></Button>
            <p className="body-sm mt-8 text-center">¿Ya tiene cuenta? <Link to="/login" className="btn-link ml-1">Ingresar</Link></p>
          </form>
        </Reveal>
      </section>
    </div>
  );
}
