import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHero } from '../../components/common/SectionHeader';
import FloatingInput from '../../components/common/FloatingInput';
import Reveal from '../../components/common/Reveal';
import Button from '../../components/common/Button';

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
    <div>
      <PageHero eyebrow="Atención Cronos" title={<>Estamos aquí para <em>ayudarle</em></>} description="Nuestro equipo está disponible para acompañarle en su búsqueda." />
      <section className="container section section--tight split">
        <div>
          <Reveal><p className="eyebrow eyebrow--accent mb-8">Conversemos</p><h2 className="display-md mb-10">La atención comienza con una <em>conversación.</em></h2></Reveal>
          <div className="grid gap-8">
            {contactItems.map(({ icon: Icon, title, text }, index) => <Reveal key={title} delay={index * 70} className="flex items-start gap-5">
              <span className="btn-icon shrink-0" aria-hidden="true"><Icon size={18} strokeWidth={1.4} /></span>
              <div><p className="eyebrow mb-2">{title}</p><p className="display-sm break-words">{text}</p></div>
            </Reveal>)}
          </div>
          <Reveal delay={200} className="mt-12"><div className="divider mb-6" /><p className="eyebrow eyebrow--accent">Cronos Genève · excelencia en relojería suiza</p></Reveal>
        </div>
        <Reveal delay={120}>
          <form onSubmit={handleSubmit} className="card grid gap-5">
            <p className="eyebrow eyebrow--accent">Escríbanos</p>
            <h2 className="display-md mb-3">Su mensaje, <em>en buenas manos.</em></h2>
            <FloatingInput id="contact-name" name="name" label="Nombre *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <FloatingInput id="contact-email" name="email" label="Correo electrónico *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <FloatingInput id="contact-subject" name="subject" label="Asunto" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <FloatingInput as="textarea" id="contact-message" name="message" label="Mensaje *" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
            <Button type="submit" block size="lg">Enviar mensaje <ArrowUpRight size={17} /></Button>
          </form>
        </Reveal>
      </section>
    </div>
  );
}
