export default function RevealText({ as: Element = 'span', children, className = '' }) {
  return <Element className={`reveal-text ${className}`}>{children}</Element>;
}
