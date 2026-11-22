export default function Button({ as: Component = 'button', variant = 'gold', className = '', children, ...props }) {
  return <Component className={`button-${variant} ${className}`} {...props}>{children}</Component>;
}
