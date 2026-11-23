import { PageHero } from '../../components/common/SectionHeader';
import Reveal from '../../components/common/Reveal';

export default function PrivacyPage() {
  return (
    <div>
      <PageHero eyebrow="Información legal" title={<>Política de <em>privacidad</em></>} description="Cómo cuidamos la información que comparte con Cronos Genève." />
      <section className="container container--narrow section section--tight">
        <Reveal><p className="lede mb-12">En Cronos Genève, valoramos su privacidad y nos comprometemos a proteger la información personal que comparte con nosotros.</p></Reveal>
        {[
          ['Información que recopilamos', 'Recopilamos información que usted nos proporciona directamente, como nombre, dirección de correo electrónico y dirección de envío al crear una cuenta o realizar un pedido.'],
          ['Uso de la información', 'Utilizamos su información para procesar pedidos, gestionar su cuenta, mejorar nuestros servicios y comunicarnos con usted sobre su pedido.'],
          ['Protección de datos', 'Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal contra acceso no autorizado.'],
          ['Sus derechos', 'Tiene derecho a acceder, rectificar o eliminar su información personal. Puede ejercer estos derechos contactándonos a través de nuestro formulario de contacto.'],
        ].map(([title, body], index) => <Reveal key={title} delay={Math.min(index, 6) * 70} className="mb-10">
          <div className="divider mb-8" /><h2 className="display-sm mb-5">{title}</h2><p className="text-dim" style={{ lineHeight: 1.75 }}>{body}</p>
        </Reveal>)}
        <Reveal><p className="body-sm pt-5">Este es un documento de demostración para un proyecto académico.</p></Reveal>
      </section>
    </div>
  );
}
