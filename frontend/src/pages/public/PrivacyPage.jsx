import SectionHeader from '../../components/common/SectionHeader';

export default function PrivacyPage() {
  return (
    <div className="page-wrap legal-page editorial-section max-w-3xl">
      <SectionHeader titleAs="h1" eyebrow="Información legal" title={<>Política de <em>privacidad</em></>} />
      <div className="legal-copy text-sm text-gray-600 space-y-6 leading-relaxed">
        <p>En Cronos Genève, valoramos su privacidad y nos comprometemos a proteger la información personal que comparte con nosotros.</p>
        <h2 className="text-lg font-semibold text-charcoal">Información que recopilamos</h2>
        <p>Recopilamos información que usted nos proporciona directamente, como nombre, dirección de correo electrónico y dirección de envío al crear una cuenta o realizar un pedido.</p>
        <h2 className="text-lg font-semibold text-charcoal">Uso de la información</h2>
        <p>Utilizamos su información para procesar pedidos, gestionar su cuenta, mejorar nuestros servicios y comunicarnos con usted sobre su pedido.</p>
        <h2 className="text-lg font-semibold text-charcoal">Protección de datos</h2>
        <p>Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal contra acceso no autorizado.</p>
        <h2 className="text-lg font-semibold text-charcoal">Sus derechos</h2>
        <p>Tiene derecho a acceder, rectificar o eliminar su información personal. Puede ejercer estos derechos contactándonos a través de nuestro formulario de contacto.</p>
        <p className="text-xs text-gray-400 mt-8">Este es un documento de demostración para un proyecto académico.</p>
      </div>
    </div>
  );
}
