import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '../../components/checkout/StripePaymentForm';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

export default function CheckoutPage() {
  const { cart, fetchCart } = useCart();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [newAddress, setNewAddress] = useState({ street: '', city: '', state: '', postal_code: '', country: 'Perú' });
  const [useNew, setUseNew] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe_card');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [clientSecret, setClientSecret] = useState('');

  const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(p);

  useEffect(() => {
    api.get('/auth/addresses/').then(({ data }) => {
      const list = data.results || data;
      setAddresses(list);
      const def = list.find((a) => a.is_default);
      if (def) setSelectedAddress(String(def.id));
    }).catch(() => {});
  }, []);

  const items = cart?.items || [];
  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const payload = { payment_method: paymentMethod };
      if (useNew || addresses.length === 0) {
        if (!newAddress.street || !newAddress.city || !newAddress.state || !newAddress.postal_code) {
          toast.error('Complete todos los campos de dirección');
          setLoading(false);
          return;
        }
        Object.assign(payload, {
          shipping_street: newAddress.street,
          shipping_city: newAddress.city,
          shipping_state: newAddress.state,
          shipping_postal_code: newAddress.postal_code,
          shipping_country: newAddress.country,
        });
      } else {
        if (!selectedAddress) {
          toast.error('Seleccione una dirección de envío');
          setLoading(false);
          return;
        }
        payload.address_id = parseInt(selectedAddress);
      }

      const { data } = await api.post('/orders/create/', payload);
      setOrder(data);
      if (data.client_secret) {
        setClientSecret(data.client_secret);
        setStep(5);
        await fetchCart();
        return;
      }
      await fetchCart();
      setStep(4);
      toast.success('Pedido creado exitosamente');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear el pedido');
    } finally {
      setLoading(false);
    }
  };

  if (step === 5 && order && clientSecret) {
    return (
      <div className="page-wrap checkout-page py-10">
        {stripePromise ? (
          <Elements stripe={stripePromise} options={{
            clientSecret,
            appearance: {
              theme: 'night',
              variables: {
                colorPrimary: '#c9a961',
                colorBackground: '#161616',
                colorText: '#f5f1e8',
                colorDanger: '#c0392b',
                fontFamily: 'Inter, system-ui, sans-serif',
                borderRadius: '2px',
                spacingUnit: '4px',
              },
            },
          }}>
            <StripePaymentForm
              orderNumber={order.order_number}
              onSuccess={(paidOrder) => { setOrder(paidOrder); setStep(4); }}
            />
          </Elements>
        ) : (
          <div className="bg-white rounded-lg p-6 shadow-sm text-red-700">
            Falta configurar la clave pública de Stripe en el entorno del frontend.
          </div>
        )}
      </div>
    );
  }

  if (step === 4 && order) {
    return (
      <div className="page-wrap confirmation-page max-w-2xl py-16 text-center animate-fade-in">
        <div className="bg-white rounded-lg p-10 shadow-sm animate-scale-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="font-serif text-3xl text-charcoal mb-2">¡Pedido Confirmado!</h1>
          <p className="text-gray-500 mb-6">Tu pedido ha sido procesado exitosamente.</p>
          <div className="bg-ivory rounded-lg p-4 mb-6 text-left">
            <p className="text-sm"><strong>N° de pedido:</strong> {order.order_number}</p>
            <p className="text-sm"><strong>Total:</strong> {formatPrice(order.total)}</p>
            <p className="text-sm"><strong>Estado:</strong> {order.status_display}</p>
            {order.payment?.is_demo && <p className="text-xs text-gray-400 mt-2">Este es un pago de demostración para fines académicos. No se ha procesado ninguna transacción bancaria real.</p>}
          </div>
          <div className="flex gap-4 justify-center">
            <Link to={`/pedidos/${order.order_number}`} className="bg-gold hover:bg-gold-dark text-white px-6 py-3 rounded-lg text-sm tracking-wider">VER PEDIDO</Link>
            <Link to="/catalogo" className="border border-gray-200 text-gray-600 px-6 py-3 rounded-lg text-sm hover:border-gold">SEGUIR COMPRANDO</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!cart || items.length === 0) {
    return (
    <div className="page-wrap checkout-page py-10 text-center">
        <p className="text-gray-500 mb-4">Tu carrito está vacío</p>
        <Link to="/catalogo" className="text-gold hover:text-gold-dark text-sm">Ir al catálogo</Link>
      </div>
    );
  }

  const subtotal = parseFloat(cart.total).toFixed(2);
  const tax = (parseFloat(cart.total) * 0.18).toFixed(2);
  const total = (parseFloat(subtotal) + parseFloat(tax)).toFixed(2);

  return (
    <div className="page-wrap checkout-page py-10">
      <p className="editorial-kicker mb-2">Tu compra</p>
      <h1 className="font-serif text-4xl md:text-5xl text-charcoal mb-8">Checkout</h1>

      {/* Steps */}
      <div className="checkout-progress flex items-center gap-4 mb-10" aria-label={`Paso ${step} de 3`}>
        {['Envío', 'Pago', 'Confirmación'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`checkout-step w-8 h-8 flex items-center justify-center text-sm ${step > i + 1 ? 'complete' : step === i + 1 ? 'active' : ''}`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${step === i + 1 ? 'text-charcoal font-medium' : 'text-gray-400'}`}>{s}</span>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 1 && (
            <div className="checkout-panel bg-white p-6 md:p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-charcoal mb-4">Dirección de envío</h2>
              {addresses.length > 0 && !useNew && (
                <div className="space-y-3 mb-4">
                  {addresses.map((a) => (
                    <label key={a.id} className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer ${selectedAddress === String(a.id) ? 'border-gold bg-gold/5' : 'border-gray-200'}`}>
                      <input type="radio" name="address" value={a.id} checked={selectedAddress === String(a.id)}
                        onChange={(e) => setSelectedAddress(e.target.value)} className="mt-1" />
                      <div>
                        <p className="text-sm font-medium">{a.label}</p>
                        <p className="text-sm text-gray-500">{a.street}, {a.city}, {a.state} {a.postal_code}</p>
                      </div>
                    </label>
                  ))}
                  <button onClick={() => setUseNew(true)} className="text-sm text-gold hover:text-gold-dark">+ Nueva dirección</button>
                </div>
              )}
              {(useNew || addresses.length === 0) && (
                <div className="space-y-3">
                  <input placeholder="Calle y número" value={newAddress.street} onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Ciudad" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      className="px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
                    <input placeholder="Departamento" value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      className="px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
                  </div>
                  <input placeholder="Código postal" value={newAddress.postal_code} onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold" />
                  {addresses.length > 0 && <button onClick={() => setUseNew(false)} className="text-sm text-gray-500 hover:text-charcoal">Usar dirección guardada</button>}
                </div>
              )}
              <button onClick={() => setStep(2)} className="mt-6 w-full bg-gold hover:bg-gold-dark text-white py-3 rounded-lg text-sm tracking-wider">
                CONTINUAR AL PAGO
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="checkout-panel bg-white p-6 md:p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-charcoal mb-4">Método de pago</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-700">Entorno de pruebas — usa una tarjeta de prueba de Stripe. No se procesará una transacción real.</p>
              </div>
              <div className="space-y-3">
                {[['stripe_card', 'Tarjeta (Stripe, modo prueba)'], ['demo_card', 'Tarjeta de demostración']].map(([v, l]) => (
                  <label key={v} className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${paymentMethod === v ? 'border-gold bg-gold/5' : 'border-gray-200'}`}>
                    <input type="radio" name="payment" value={v} checked={paymentMethod === v} onChange={() => setPaymentMethod(v)} />
                    <span className="text-sm">{l}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-4 mt-6">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg text-sm hover:border-gold">VOLVER</button>
                <button onClick={() => setStep(3)} className="flex-1 bg-gold hover:bg-gold-dark text-white py-3 rounded-lg text-sm tracking-wider">REVISAR PEDIDO</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="checkout-panel bg-white p-6 md:p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-charcoal mb-4">Resumen del pedido</h2>
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.watch_name} × {item.quantity}</span>
                    <span className="font-medium">{formatPrice(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-6">
                <button onClick={() => setStep(2)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg text-sm hover:border-gold">VOLVER</button>
                <button onClick={handlePlaceOrder} disabled={loading}
                  className="flex-1 bg-gold hover:bg-gold-dark text-white py-3 rounded-lg text-sm tracking-wider disabled:opacity-50">
                  {loading ? 'PROCESANDO...' : 'CONFIRMAR PEDIDO'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="checkout-summary bg-white p-6 shadow-sm h-fit">
          <h3 className="text-sm font-semibold text-charcoal mb-4">RESUMEN</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">IGV (18%)</span><span>{formatPrice(tax)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Envío</span><span className="text-green-600">Gratis</span></div>
            <div className="border-t pt-2 flex justify-between font-semibold text-charcoal">
              <span>Total</span><span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
