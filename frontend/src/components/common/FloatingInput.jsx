export default function FloatingInput({
  as: Component = 'input', id, name, label, value, onChange, type = 'text', error,
  className = '', rows, ...props
}) {
  const fieldId = id || name;
  return (
    <div className={`floating-field ${className}`}>
      <label className="field-label" htmlFor={fieldId}>{label}</label>
      <Component id={fieldId} name={name} type={Component === 'input' ? type : undefined}
        value={value} onChange={onChange} rows={rows}
        className="w-full px-4 py-3 border border-gray-200 text-sm focus:outline-none focus:border-gold"
        aria-invalid={Boolean(error)} aria-describedby={error ? `${fieldId}-error` : undefined} {...props} />
      {error && <p id={`${fieldId}-error`} className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
