import Reveal, { RevealLines } from './Reveal';

export default function SectionHeader({ eyebrow, title, description, align = 'left', className = '', titleAs: Heading = 'h2', action }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-6 ${className}`}>
      <Reveal className={`section-heading ${align === 'center' ? 'center mx-auto' : ''}`} style={{ marginBottom: 0 }}>
        {eyebrow && <p className="eyebrow eyebrow--line">{eyebrow}</p>}
        {title && <Heading>{title}</Heading>}
        {description && <p>{description}</p>}
      </Reveal>
      {action && <Reveal delay={150}>{action}</Reveal>}
    </div>
  );
}

/** Top-of-page heading used by every inner page. */
export function PageHero({ eyebrow, title, description, children }) {
  return (
    <header className="page-hero">
      <div className="container">
        {eyebrow && <Reveal><p className="eyebrow eyebrow--line">{eyebrow}</p></Reveal>}
        <RevealLines as="h1" className="display-lg" delay={80} lines={[title]} />
        <Reveal variant="fade" delay={200} className="my-7"><div className="tick-rule" aria-hidden="true" /></Reveal>
        {description && <Reveal delay={160}><p className="lede">{description}</p></Reveal>}
        {children && <Reveal delay={220} className="mt-8">{children}</Reveal>}
      </div>
    </header>
  );
}
