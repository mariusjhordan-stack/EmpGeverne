import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

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
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <p className="text-gold tracking-[0.3em] text-xs mb-3">AYUDA</p>
        <h1 className="font-serif text-4xl text-charcoal">Preguntas Frecuentes</h1>
      </div>
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <button onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left">
              <span className="text-sm font-medium text-charcoal">{f.q}</span>
              <ChevronDown size={18} className={`text-gray-400 transition-transform ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">{f.a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
