import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import SectionHeader from '../../components/common/SectionHeader';

const faqs = [
  { q: '¿Los relojes son originales?', a: 'Todos los relojes en nuestra plataforma son auténticos y cuentan con la garantía oficial de sus fabricantes.' },
  { q: '¿Cuáles son los métodos de pago?', a: 'Actualmente contamos con un sistema de pago demostrativo para fines académicos. En un entorno de producción se integraría una pasarela de pagos real.' },
  { q: '¿Ofrecen envío internacional?', a: 'Nuestro servicio de envío cubre el territorio nacional. Los envíos internacionales se gestionan de manera personalizada.' },
  { q: '¿Puedo devolver un reloj?', a: 'Aceptamos devoluciones dentro de los 14 días posteriores a la entrega, siempre que el producto se encuentre en su estado original.' },
  { q: '¿Cómo puedo rastrear mi pedido?', a: 'Desde la sección "Mis Pedidos" podrá consultar el estado actual de su pedido en tiempo real.' },
  { q: '¿Los precios incluyen impuestos?', a: 'Los precios mostrados incluyen el IGV (18%). El desglose completo se muestra durante el proceso de checkout.' },
];

export default function FAQPage() {
  const [open, setOpen] = useState(null);

  return (
    <div className="page-wrap editorial-section max-w-3xl">
      <SectionHeader titleAs="h1" eyebrow="Ayuda" title={<>Preguntas <em>frecuentes</em></>} description="Respuestas a las consultas más habituales sobre nuestra selección y servicio." />
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <div key={i} className="luxury-card overflow-hidden">
            <button type="button" aria-expanded={open === i} aria-controls={`faq-answer-${i}`} onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left">
              <span className="text-sm font-medium text-charcoal">{f.q}</span>
              <ChevronDown size={18} className={`text-gray-400 transition-transform ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && <div id={`faq-answer-${i}`} className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">{f.a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
