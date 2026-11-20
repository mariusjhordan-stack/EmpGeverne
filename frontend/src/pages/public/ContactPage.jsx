import { useState } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

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

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <p className="text-gold tracking-[0.3em] text-xs mb-3">CONTÁCTENOS</p>
        <h1 className="font-serif text-4xl text-charcoal">Estamos aquí para ayudarle</h1>
      </div>
      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <div className="space-y-6">
            {[
              { icon: MapPin, title: 'Dirección', text: 'Av. Javier Prado Este 4200, Lima, Perú' },
              { icon: Phone, title: 'Teléfono', text: '+51 (1) 555-0100' },
              { icon: Mail, title: 'Email', text: 'contacto@cronosgeneve.com' },
              { icon: Clock, title: 'Horario', text: 'Lun - Sáb: 10:00 - 20:00' },
            ].map((i) => (
              <div key={i.title} className="flex gap-4">
                <i.icon className="text-gold flex-shrink-0" size={20} />
                <div><h3 className="text-sm font-semibold text-charcoal">{i.title}</h3><p className="text-sm text-gray-500">{i.text}</p></div>
              </div>
            ))}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm space-y-4">
          <input placeholder="Nombre *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
          <input type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
          <input placeholder="Asunto" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
          <textarea placeholder="Mensaje *" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
          <button type="submit" className="w-full bg-gold hover:bg-gold-dark text-white py-3 rounded-lg text-sm tracking-wider">ENVIAR MENSAJE</button>
        </form>
      </div>
    </div>
  );
}
