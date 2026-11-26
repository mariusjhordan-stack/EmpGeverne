import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import FloatingInput from '../common/FloatingInput';

/** Contraseña con un ojo para mostrarla u ocultarla. */
export default function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  return (
    <FloatingInput
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={(
        <button type="button" className="field-eye" onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}>
          {visible ? <EyeOff size={17} strokeWidth={1.5} /> : <Eye size={17} strokeWidth={1.5} />}
        </button>
      )}
    />
  );
}
