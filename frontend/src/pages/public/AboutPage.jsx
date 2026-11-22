import Reveal from '../../components/common/Reveal';
import SectionHeader from '../../components/common/SectionHeader';
import atelierImage from '../../assets/editorial/atelier-movement.jpg';
import interiorImage from '../../assets/editorial/luxe-interior.jpg';

const values = [
  { n: '01', title: 'Autenticidad', description: 'Garantizamos la autenticidad de cada pieza en nuestra colección.' },
  { n: '02', title: 'Excelencia', description: 'Seleccionamos solo relojes que cumplen los más altos estándares.' },
  { n: '03', title: 'Servicio', description: 'Ofrecemos asesoría personalizada para cada cliente.' },
];

export default function AboutPage() {
  return (
    <div className="page-wrap about-page editorial-section">
      <Reveal><SectionHeader titleAs="h1" eyebrow="Cronos Genève" title={<>Una pasión por el <em>tiempo</em></>} /></Reveal>
      <div className="about-lead grid lg:grid-cols-[.7fr_1.3fr] gap-8 lg:gap-24">
        <Reveal><p className="editorial-kicker about-side-note">Nuestra historia<br />desde la alta relojería</p></Reveal>
        <Reveal delay={100}>
          <div className="about-copy">
            <p>Cronos Genève nace de la pasión por la alta relojería y el compromiso con la excelencia. Nuestra plataforma reúne las piezas más distinguidas de las casas relojeras más prestigiosas del mundo.</p>
            <p>Cada reloj en nuestra colección ha sido cuidadosamente seleccionado por su maestría técnica, diseño excepcional y herencia relojera. Creemos que un reloj es más que un instrumento para medir el tiempo: es una obra de arte, una declaración de estilo y un legado que trasciende generaciones.</p>
          </div>
        </Reveal>
      </div>
      <section className="about-visual-story">
        <Reveal className="about-visual-main">
          <img src={atelierImage} alt="Detalle de un movimiento mecánico de reloj y sus engranajes" loading="lazy" />
          <span>EL CORAZÓN MECÁNICO</span>
        </Reveal>
        <Reveal delay={120} className="about-visual-secondary">
          <img src={interiorImage} alt="Arquitectura interior de mármol y madera en tonos cálidos" loading="lazy" />
          <p>Una mirada editorial a la precisión, los materiales y los espacios que inspiran la alta relojería.</p>
        </Reveal>
      </section>
      <section className="values-section section-divider mt-20 pt-12">
        <Reveal><p className="editorial-kicker mb-8">Lo que nos define</p></Reveal>
        <div className="grid md:grid-cols-3 gap-0">
          {values.map((value, index) => <Reveal key={value.n} delay={index * 75}>
            <article className="value-item">
              <span className="value-number">{value.n}</span>
              <h2 className="font-serif text-3xl text-charcoal">{value.title}</h2>
              <p className="mt-3 text-sm leading-7 text-gray-500">{value.description}</p>
            </article>
          </Reveal>)}
        </div>
      </section>
      <Reveal><p className="about-closing font-serif">Con sede en el corazón de la tradición relojera, Cronos Genève se posiciona como el destino definitivo para los amantes de la relojería de lujo.</p></Reveal>
    </div>
  );
}
