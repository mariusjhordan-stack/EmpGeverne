import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Button from '../common/Button';
import Reveal from '../common/Reveal';

export default function StripePaymentForm({ orderNumber, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || loading) return;
    setLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Stripe no pudo confirmar el pago.');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        const { data } = await api.post(`/orders/${orderNumber}/confirm-payment/`);
        onSuccess(data);
        return;
      }

      toast.error(`El pago todavía no se completó (${paymentIntent?.status || 'sin estado'}).`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo confirmar el pago.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Reveal as="form" onSubmit={handleSubmit} className="card max-w-xl mx-auto">
      <p className="eyebrow eyebrow--accent mb-3">Pago seguro</p>
      <h2 className="card-title mb-2">Pagar con tarjeta</h2>
      <p className="body-sm mb-6">Pedido <span className="num">{orderNumber}</span> · Pago de prueba</p>
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || !elements || loading}
        block size="lg" className="mt-8"
      >
        {loading ? 'Procesando...' : 'Pagar'}
      </Button>
    </Reveal>
  );
}
