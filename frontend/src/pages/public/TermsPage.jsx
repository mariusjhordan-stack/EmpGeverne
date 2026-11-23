import { PageHero } from '../../components/common/SectionHeader';
import Reveal from '../../components/common/Reveal';

export default function TermsPage() {
  return (
    <div>
      <PageHero eyebrow="Información legal" title={<>Términos y <em>condiciones</em></>} description="Las condiciones de uso y compra en Cronos Genève." />
      <section className="container container--narrow section section--tight">
        <Reveal><p className="lede mb-12">Al utilizar la plataforma Cronos Genève, usted acepta los siguientes términos y condiciones.</p></Reveal>
        {[
          ['Uso del servicio', 'La plataforma está destinada a la consulta y adquisición de relojes de lujo. El uso del servicio implica la aceptación de estas condiciones.'],
          ['Cuentas de usuario', 'Usted es responsable de mantener la confidencialidad de su cuenta. Toda actividad realizada desde su cuenta es de su responsabilidad.'],
          ['Productos y precios', 'Los precios están expresados en dólares estadounidenses e incluyen el IGV. Los precios pueden cambiar sin previo aviso.'],
          ['Pedidos', 'La confirmación de un pedido constituye un acuerdo de compra. Los pedidos están sujetos a disponibilidad de stock.'],
          ['Devoluciones', 'Los productos pueden ser devueltos dentro de los 14 días siguientes a su recepción, en su estado original y con todo su embalaje.'],
        ].map(([title, body], index) => <Reveal key={title} delay={Math.min(index, 6) * 70} className="mb-10">
          <div className="divider mb-8" /><h2 className="display-sm mb-5">{title}</h2><p className="text-dim" style={{ lineHeight: 1.75 }}>{body}</p>
        </Reveal>)}
        <Reveal><p className="body-sm pt-5">Este es un documento de demostración para un proyecto académico.</p></Reveal>
      </section>
    </div>
  );
}
