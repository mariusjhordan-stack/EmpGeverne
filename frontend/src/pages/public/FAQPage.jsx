import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHero } from '../../components/common/SectionHeader';
import Reveal from '../../components/common/Reveal';

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
    <div>
      <PageHero eyebrow="Ayuda" title={<>Preguntas <em>frecuentes</em></>} description="Respuestas a las consultas más habituales sobre nuestra selección y servicio." />
      <section className="container container--narrow section section--tight">
        <Reveal><p className="eyebrow eyebrow--accent mb-8">Todo lo que necesita saber</p></Reveal>
        <div className="divider" />
        {faqs.map((f, i) => <Reveal key={i} delay={Math.min(i, 6) * 70}>
          <details open={open === i}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-7" onClick={(event) => { event.preventDefault(); setOpen(open === i ? null : i); }}>
              <span className="display-sm">{f.q}</span>
              <span className="btn-icon shrink-0" aria-hidden="true"><Plus size={19} style={{ transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform .3s var(--ease)' }} /></span>
            </summary>
            <p className="text-dim max-w-2xl pb-8" style={{ lineHeight: 1.75 }}>{f.a}</p>
          </details>
          <div className="divider" />
        </Reveal>)}
      </section>
    </div>
  );
}
