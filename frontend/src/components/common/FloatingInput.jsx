/**
 * Campo con etiqueta arriba.
 * trailing: algo que va dentro del campo, a la derecha (por ejemplo, el ojo para ver la contraseña).
 */
export default function FloatingInput({
  as: Component = 'input', id, name, label, value, onChange, type = 'text', error, hint,
  className = '', rows, trailing, ...props
}) {
  const fieldId = id || name;
  return (
    <div className={`field ${className}`}>
      <label className="field-label" htmlFor={fieldId}>{label}</label>
      <div className="field-control">
        <Component id={fieldId} name={name} type={Component === 'input' ? type : undefined}
          value={value} onChange={onChange} rows={rows} className="input"
          aria-invalid={Boolean(error)} aria-describedby={error ? `${fieldId}-error` : undefined} {...props} />
        {trailing}
      </div>
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && <p id={`${fieldId}-error`} className="field-error">{error}</p>}
    </div>
  );
}
