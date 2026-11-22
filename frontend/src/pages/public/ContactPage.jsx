import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import SectionHeader from '../../components/common/SectionHeader';
import FloatingInput from '../../components/common/FloatingInput';
import Reveal from '../../components/common/Reveal';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Complete todos los campos requeridos');
      return;
    }
    toast.success('Mensaje enviado (demostración)');
    setForm({ name: '', email: '', subject: '', message: '' });
  };

  const contactItems = [
    { icon: MapPin, title: 'Dirección', text: 'Av. Javier Prado Este 4200, Lima, Perú' },
    { icon: Phone, title: 'Teléfono', text: '+51 (1) 555-0100' },
    { icon: Mail, title: 'Email', text: 'contacto@cronosgeneve.com' },
    { icon: Clock, title: 'Horario', text: 'Lun - Sáb: 10:00 - 20:00' },
  ];

  return (
    <div className="page-wrap contact-page editorial-section">
      <Reveal><SectionHeader titleAs="h1" eyebrow="Atención Cronos" title={<>Estamos aquí para <em>ayudarle</em></>} description="Nuestro equipo está disponible para acompañarle en su búsqueda." /></Reveal>
      <div className="grid md:grid-cols-[.8fr_1.2fr] gap-10 lg:gap-20">
        <Reveal>
          <div className="contact-details">
            {contactItems.map(({ icon: Icon, title, text }) => <div key={title} className="contact-item">
              <span className="contact-icon"><Icon size={18} strokeWidth={1.4} /></span>
              <div><h2>{title}</h2><p>{text}</p></div>
            </div>)}
            <div className="contact-note"><p className="editorial-kicker">Cronos Genève</p><p>Excelencia en relojería suiza.</p></div>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <form onSubmit={handleSubmit} className="contact-form surface-panel p-6 md:p-9 space-y-5">
            <p className="editorial-kicker mb-2">Escríbanos</p>
            <FloatingInput id="contact-name" name="name" label="Nombre *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <FloatingInput id="contact-email" name="email" label="Correo electrónico *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <FloatingInput id="contact-subject" name="subject" label="Asunto" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <FloatingInput as="textarea" id="contact-message" name="message" label="Mensaje *" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
            <button type="submit" className="button-gold w-full">Enviar mensaje <ArrowUpRight size={15} /></button>
          </form>
        </Reveal>
      </div>
    </div>
  );
}
