import Reveal from '../../components/common/Reveal';
import { PageHero } from '../../components/common/SectionHeader';
import Button from '../../components/common/Button';
import { Link } from 'react-router-dom';
import atelierImage from '../../assets/editorial/atelier-movement.jpg';
import interiorImage from '../../assets/editorial/luxe-interior.jpg';

const values = [
  { n: '01', title: 'Autenticidad', description: 'Garantizamos la autenticidad de cada pieza en nuestra colección.' },
  { n: '02', title: 'Excelencia', description: 'Seleccionamos solo relojes que cumplen los más altos estándares.' },
  { n: '03', title: 'Servicio', description: 'Ofrecemos asesoría personalizada para cada cliente.' },
];

export default function AboutPage() {
  return (
    <div>
      <PageHero eyebrow="Cronos Genève · savoir-faire" title={<>Una pasión por el <em>tiempo</em></>} description="Excelencia, herencia suiza y devoción por los detalles que perduran." />
      <section className="container section">
        <div className="split">
          <Reveal>
            <p className="eyebrow eyebrow--accent mb-8">Nuestra historia</p>
            <h2 className="display-xl mb-10">Cada segundo <em>merece</em> una historia.</h2>
            <p className="lede mb-6">Cronos Genève nace de la pasión por la alta relojería y el compromiso con la excelencia.</p>
            <p className="text-dim" style={{ lineHeight: 1.75 }}>Nuestra plataforma reúne las piezas más distinguidas de las casas relojeras más prestigiosas. Cada reloj ha sido seleccionado por su maestría técnica, diseño excepcional y herencia relojera.</p>
          </Reveal>
          <Reveal delay={120} className="parallax-frame"><img src={atelierImage} alt="Detalle de un movimiento mecánico de reloj y sus engranajes" loading="lazy" /></Reveal>
        </div>
      </section>
      <section className="section section--ink-2">
        <div className="container">
          <div className="split">
            <Reveal className="parallax-frame"><img src={interiorImage} alt="Arquitectura interior de mármol y madera en tonos cálidos" loading="lazy" /></Reveal>
            <Reveal delay={120}>
              <p className="eyebrow eyebrow--accent mb-8">Más que un instrumento</p>
              <blockquote className="quote mb-8">Un reloj es una obra de arte, una declaración de estilo y un <em>legado</em> que trasciende generaciones.</blockquote>
              <p className="text-dim" style={{ lineHeight: 1.75 }}>La precisión, los materiales y la atención al detalle guían cada elección de nuestra colección.</p>
            </Reveal>
          </div>
          <Reveal delay={160} className="stats mt-20">
            <div className="stat"><span className="stat__value">01</span><span className="stat__label">Una selección con criterio</span></div>
            <div className="stat"><span className="stat__value">03</span><span className="stat__label">Valores que nos definen</span></div>
            <div className="stat"><span className="stat__value">100<sup>%</sup></span><span className="stat__label">Compromiso con la autenticidad</span></div>
            <div className="stat"><span className="stat__value">∞</span><span className="stat__label">Historias por descubrir</span></div>
          </Reveal>
        </div>
      </section>
      <section className="container section">
        <Reveal><p className="eyebrow eyebrow--line mb-8">Lo que nos define</p><h2 className="display-lg mb-14">Nuestros <em>valores</em></h2></Reveal>
        <div className="grid gap-10 md:grid-cols-3">
          {values.map((value, index) => <Reveal key={value.n} delay={index * 70} as="article">
            <div className="divider mb-7" /><span className="eyebrow eyebrow--accent">{value.n}</span>
            <h3 className="display-sm my-5">{value.title}</h3><p className="text-dim" style={{ lineHeight: 1.75 }}>{value.description}</p>
          </Reveal>)}
        </div>
      </section>
      <section className="container pb-20">
        <Reveal className="cta-band">
          <p className="eyebrow">Cronos Genève</p>
          <h2 className="display-xl">Encuentre su próxima <em>historia.</em></h2>
          <Button as={Link} to="/catalogo" variant="accent" className="justify-self-start">Explorar el catálogo</Button>
        </Reveal>
      </section>
    </div>
  );
}
