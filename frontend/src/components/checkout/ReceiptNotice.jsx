import { useState } from 'react';
import { Check, Download, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/** Descarga la boleta en PDF (la ruta pide la sesión, por eso se baja con la API y no con un enlace). */
async function downloadPdf(orderNumber) {
  const { data } = await api.get(`/orders/${orderNumber}/receipt.pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: `boleta-${orderNumber}.pdf` });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Boleta: descargar en PDF o recibirla por correo. sent=true: el correo ya salió al pagar.
 * Solo para pedidos pagados (o en preparación, en camino, entregados).
 */
export default function ReceiptNotice({ order, sent = false, className = '' }) {
  const { user } = useAuth();
  const [state, setState] = useState(sent ? 'sent' : 'idle');
  const [downloading, setDownloading] = useState(false);
  const email = user?.email;
  if (!order || ['pending', 'cancelled'].includes(order.status)) return null;

  const send = async () => {
    setState('sending');
    try {
      const { data } = await api.post(`/orders/${order.order_number}/send-receipt/`);
      setState('sent');
      toast.success(`Boleta enviada a ${data.email}`);
    } catch (err) {
      setState(sent ? 'sent' : 'idle');
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'No pudimos enviar la boleta.');
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      await downloadPdf(order.order_number);
    } catch {
      toast.error('No pudimos descargar la boleta. Inténtelo otra vez.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`receipt-notice ${className}`}>
      <span className="receipt-notice__icon" aria-hidden="true">{state === 'sent' ? <Check size={16} /> : <Mail size={16} />}</span>
      <p className="body-sm receipt-notice__text">
        {state === 'sent'
          ? <>Enviamos su boleta con el detalle y el IGV a <strong className="text-fg break-all">{email || 'su correo'}</strong>.</>
          : <>Su boleta con el detalle y el IGV: descárguela en PDF o recíbala en <strong className="text-fg break-all">{email || 'su correo'}</strong>.</>}
      </p>
      <div className="receipt-notice__actions">
        <button type="button" className="btn-link" onClick={download} disabled={downloading}>
          <Download size={14} aria-hidden="true" /> {downloading ? 'Descargando…' : 'Descargar PDF'}
        </button>
        <button type="button" className="btn-link" onClick={send} disabled={state === 'sending'}>
          {state === 'sending' ? 'Enviando…' : state === 'sent' ? 'Reenviar' : 'Enviar por correo'}
        </button>
      </div>
    </div>
  );
}
