const variants = {
  primary: 'btn',
  gold: 'btn',
  accent: 'btn btn-accent',
  ghost: 'btn btn-ghost',
  outline: 'btn btn-ghost',
  danger: 'btn btn-danger',
  link: 'btn-link',
};
const sizes = { sm: 'btn-sm', md: '', lg: 'btn-lg' };

/** variant: primary | accent | ghost | danger | link ; size: sm | md | lg */
export default function Button({ as: Component = 'button', variant = 'primary', size = 'md', block = false, className = '', children, ...props }) {
  const cls = [variants[variant] || 'btn', variant !== 'link' && sizes[size], block && 'btn-block', className].filter(Boolean).join(' ');
  return <Component className={cls} {...props}>{children}</Component>;
}
