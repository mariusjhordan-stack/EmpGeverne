import SectionHeader from '../../components/common/SectionHeader';

export default function TermsPage() {
  return (
    <div className="page-wrap legal-page editorial-section max-w-3xl">
      <SectionHeader titleAs="h1" eyebrow="Información legal" title={<>Términos y <em>condiciones</em></>} />
      <div className="legal-copy text-sm text-gray-600 space-y-6 leading-relaxed">
        <p>Al utilizar la plataforma Cronos Genève, usted acepta los siguientes términos y condiciones.</p>
        <h2 className="text-lg font-semibold text-charcoal">Uso del servicio</h2>
        <p>La plataforma está destinada a la consulta y adquisición de relojes de lujo. El uso del servicio implica la aceptación de estas condiciones.</p>
        <h2 className="text-lg font-semibold text-charcoal">Cuentas de usuario</h2>
        <p>Usted es responsable de mantener la confidencialidad de su cuenta. Toda actividad realizada desde su cuenta es de su responsabilidad.</p>
        <h2 className="text-lg font-semibold text-charcoal">Productos y precios</h2>
        <p>Los precios están expresados en dólares estadounidenses e incluyen el IGV. Los precios pueden cambiar sin previo aviso.</p>
        <h2 className="text-lg font-semibold text-charcoal">Pedidos</h2>
        <p>La confirmación de un pedido constituye un acuerdo de compra. Los pedidos están sujetos a disponibilidad de stock.</p>
        <h2 className="text-lg font-semibold text-charcoal">Devoluciones</h2>
        <p>Los productos pueden ser devueltos dentro de los 14 días siguientes a su recepción, en su estado original y con todo su embalaje.</p>
        <p className="text-xs text-gray-400 mt-8">Este es un documento de demostración para un proyecto académico.</p>
      </div>
    </div>
  );
}
