import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import FloatingInput from '../../components/common/FloatingInput';

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
    <div className="auth-page">
      <section className="auth-layout animate-fade-in">
        <div className="auth-editorial">
          <p className="editorial-kicker">CRONOS GENÈVE · MEMBRES</p>
          <h2>Una selección que perdura.</h2>
          <p>Descubra piezas distinguidas de las casas relojeras más prestigiosas.</p>
          <span className="auth-edition">PRECISIÓN · ELEGANCIA · TRADICIÓN</span>
        </div>
        <div className="auth-form-wrap">
          <form onSubmit={handleSubmit} className="animate-fade-in-up">
            <p className="editorial-kicker">Su espacio Cronos</p>
            <h1 className="font-serif text-4xl text-charcoal mt-2 mb-2">Crear cuenta</h1>
            <p className="text-sm text-gray-500 mb-7">Únete a Cronos Genève.</p>
            {errors.general && <div className="mb-5 border border-red-500/30 bg-red-50 p-3 text-sm text-red-600" role="alert">{errors.general}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('first_name', 'Nombres', 'text', 'given-name')}
              {field('last_name', 'Apellidos', 'text', 'family-name')}
            </div>
            <div className="mt-4 space-y-4">
              {field('email', 'Correo electrónico', 'email', 'email')}
              {field('password', 'Contraseña', 'password', 'new-password')}
              {field('password_confirm', 'Confirmar contraseña', 'password', 'new-password')}
            </div>
            <button type="submit" disabled={loading} className="button-gold w-full mt-7 disabled:opacity-50">
              {loading ? 'Creando cuenta...' : 'Crear cuenta'} <ArrowUpRight size={15} />
            </button>
            <p className="text-center text-sm text-gray-500 mt-7">¿Ya tienes cuenta? <Link to="/login" className="ml-1 text-gold hover:text-gold-light">Ingresar</Link></p>
          </form>
        </div>
      </section>
    </div>
  );
}
