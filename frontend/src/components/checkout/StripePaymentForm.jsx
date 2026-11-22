import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import api from '../../services/api';

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
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 shadow-sm max-w-xl mx-auto">
      <h2 className="text-lg font-semibold text-charcoal mb-1">Pagar con tarjeta</h2>
      <p className="text-xs text-gray-400 mb-4">Pedido {orderNumber} · Pago de prueba</p>
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        className="w-full mt-6 bg-gold hover:bg-gold-dark text-white py-3 rounded-lg text-sm tracking-wider disabled:opacity-50"
      >
        {loading ? 'PROCESANDO...' : 'PAGAR'}
      </button>
    </form>
  );
}
