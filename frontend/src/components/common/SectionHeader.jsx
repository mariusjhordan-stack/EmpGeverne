export default function SectionHeader({ eyebrow, title, description, align = 'left', className = '', titleAs: Heading = 'h2' }) {
  return (
    <div className={`section-heading ${align === 'center' ? 'center' : ''} ${className}`}>
      {eyebrow && <p className="editorial-kicker">{eyebrow}</p>}
      {title && <Heading>{title}</Heading>}
      {description && <p>{description}</p>}
    </div>
  );
}
