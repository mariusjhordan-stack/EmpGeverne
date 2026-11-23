import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '../../components/checkout/StripePaymentForm';
import { PageHero } from '../../components/common/SectionHeader';
import Reveal from '../../components/common/Reveal';
import FloatingInput from '../../components/common/FloatingInput';
import Button from '../../components/common/Button';

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
      <div>
        <PageHero eyebrow="Pago seguro" title={<>Finalizar <em>compra</em></>} description={`Pedido ${order.order_number}`} />
        <div className="container section--tight">
        {stripePromise ? (
          <Elements stripe={stripePromise} options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#9a7a43',
                colorBackground: '#fffdf9',
                colorText: '#17150f',
                colorDanger: '#b8442f',
                fontFamily: 'Geist, system-ui, sans-serif',
                borderRadius: '12px',
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
          <div className="alert alert--danger">
            Falta configurar la clave pública de Stripe en el entorno del frontend.
          </div>
        )}
        </div>
      </div>
    );
  }

  if (step === 4 && order) {
    return (
      <>
        <PageHero eyebrow="Confirmación" title={<>Pedido <em>confirmado</em></>} description="Su pedido ha sido procesado exitosamente." />
        <div className="container container--narrow section--tight">
          <Reveal className="card">
            <p className="eyebrow eyebrow--accent mb-3">Gracias por su compra</p>
            <h2 className="card-title mb-6">La espera comienza aquí.</h2>
            <dl className="spec-list mb-8">
              <div className="spec-row"><dt>N.º de pedido</dt><dd className="num">{order.order_number}</dd></div>
              <div className="spec-row"><dt>Total</dt><dd className="price">{formatPrice(order.total)}</dd></div>
              <div className="spec-row"><dt>Estado</dt><dd><span className="badge badge--success">{order.status_display}</span></dd></div>
            </dl>
            {order.payment?.is_demo && <p className="body-sm mb-6">Este es un pago de demostración para fines académicos. No se ha procesado ninguna transacción bancaria real.</p>}
            <div className="flex flex-wrap gap-3">
              <Button as={Link} to={`/pedidos/${order.order_number}`}>Ver pedido</Button>
              <Button as={Link} to="/catalogo" variant="ghost">Seguir comprando</Button>
            </div>
          </Reveal>
        </div>
      </>
    );
  }

  if (!cart || items.length === 0) {
    return (
      <><PageHero eyebrow="Su compra" title={<>Finalizar <em>compra</em></>} /><div className="container section--tight"><Reveal className="empty-state"><h2 className="display-sm">Su carrito está <em>vacío</em></h2><Button as={Link} to="/catalogo">Ir al catálogo</Button></Reveal></div></>
    );
  }

  const subtotal = parseFloat(cart.total).toFixed(2);
  const tax = (parseFloat(cart.total) * 0.18).toFixed(2);
  const total = (parseFloat(subtotal) + parseFloat(tax)).toFixed(2);

  return (
    <>
      <PageHero eyebrow="Su compra" title={<>Finalizar <em>compra</em></>} description="Tres pasos para recibir su nueva pieza." />
      <div className="container section--tight">
        <Reveal className="flex flex-wrap items-center gap-3 mb-10" aria-label={`Paso ${step} de 3`}>
          {['Envío', 'Pago', 'Confirmación'].map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              {i > 0 && <span className="divider w-5 sm:w-10" />}
              <span className={`badge badge--plain ${step === i + 1 ? 'badge--accent' : ''}`}>{String(i + 1).padStart(2, '0')}</span>
              <span className={step === i + 1 ? 'text-accent body-sm' : 'text-mute body-sm'}>{label}</span>
            </div>
          ))}
        </Reveal>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div>
            {step === 1 && <Reveal className="card">
              <p className="eyebrow eyebrow--accent mb-3">Paso 01</p>
              <h2 className="card-title mb-6">Dirección de envío</h2>
              {addresses.length > 0 && !useNew && <div className="grid gap-3 mb-6">
                {addresses.map((a) => <label key={a.id} className={`card card--hover flex items-start gap-3 cursor-pointer `} style={selectedAddress === String(a.id) ? { borderColor: 'var(--champagne)' } : undefined}>
                  <input type="radio" name="address" value={a.id} checked={selectedAddress === String(a.id)} onChange={(e) => setSelectedAddress(e.target.value)} className="mt-1" />
                  <span><strong className="block">{a.label}</strong><span className="body-sm">{a.street}, {a.city}, {a.state} {a.postal_code}</span></span>
                </label>)}
                <button onClick={() => setUseNew(true)} className="btn-link justify-self-start mt-2">+ Nueva dirección</button>
              </div>}
              {(useNew || addresses.length === 0) && <div className="grid gap-4 mb-6">
                <FloatingInput id="checkout-street" label="Calle y número" value={newAddress.street} onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FloatingInput id="checkout-city" label="Ciudad" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} />
                  <FloatingInput id="checkout-state" label="Departamento" value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} />
                </div>
                <FloatingInput id="checkout-postal" label="Código postal" value={newAddress.postal_code} onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })} />
                {addresses.length > 0 && <button onClick={() => setUseNew(false)} className="btn-link justify-self-start">Usar dirección guardada</button>}
              </div>}
              <Button onClick={() => setStep(2)} block size="lg">Continuar al pago</Button>
            </Reveal>}

            {step === 2 && <Reveal className="card">
              <p className="eyebrow eyebrow--accent mb-3">Paso 02</p>
              <h2 className="card-title mb-6">Método de pago</h2>
              <div className="alert mb-6">Entorno de pruebas — use una tarjeta de prueba de Stripe. No se procesará una transacción real.</div>
              <div className="grid gap-3 mb-6">
                {[['stripe_card', 'Tarjeta (Stripe, modo prueba)'], ['demo_card', 'Tarjeta de demostración']].map(([v, label]) => <label key={v} className="card card--hover flex items-center gap-3 cursor-pointer" style={paymentMethod === v ? { borderColor: 'var(--champagne)' } : undefined}>
                  <input type="radio" name="payment" value={v} checked={paymentMethod === v} onChange={() => setPaymentMethod(v)} />
                  <span>{label}</span>
                </label>)}
              </div>
              <div className="flex flex-wrap gap-3"><Button onClick={() => setStep(1)} variant="ghost">Volver</Button><Button onClick={() => setStep(3)}>Revisar pedido</Button></div>
            </Reveal>}

            {step === 3 && <Reveal className="card">
              <p className="eyebrow eyebrow--accent mb-3">Paso 03</p>
              <h2 className="card-title mb-6">Revise su pedido</h2>
              {items.map((item) => <div key={item.id} className="spec-row"><span>{item.watch_name} × {item.quantity}</span><span className="price">{formatPrice(item.subtotal)}</span></div>)}
              <div className="flex flex-wrap gap-3 mt-8"><Button onClick={() => setStep(2)} variant="ghost">Volver</Button><Button onClick={handlePlaceOrder} disabled={loading}>{loading ? 'Procesando...' : 'Confirmar pedido'}</Button></div>
            </Reveal>}
          </div>

          <Reveal delay={120} className="card lg:sticky lg:top-24">
            <p className="eyebrow eyebrow--accent mb-3">Su selección</p>
            <h2 className="card-title mb-6">Resumen</h2>
            <div className="grid gap-4 mb-6">
              {items.map((item) => <div key={item.id} className="flex items-center gap-3">
                <div className="media-well h-16 w-16 shrink-0">{item.watch_image ? <img src={item.watch_image} alt="" className="p-2" /> : null}</div>
                <div className="min-w-0 flex-1"><p className="body-sm line-clamp-2">{item.watch_name}</p><p className="eyebrow mt-1">Cantidad {item.quantity}</p></div>
                <span className="price">{formatPrice(item.subtotal)}</span>
              </div>)}
            </div>
            <dl className="spec-list">
              <div className="spec-row"><dt>Subtotal</dt><dd className="num">{formatPrice(subtotal)}</dd></div>
              <div className="spec-row"><dt>IGV (18%)</dt><dd className="num">{formatPrice(tax)}</dd></div>
              <div className="spec-row"><dt>Envío</dt><dd className="text-accent">Gratis</dd></div>
              <div className="spec-row"><dt>Total</dt><dd className="price price--lg">{formatPrice(total)}</dd></div>
            </dl>
          </Reveal>
        </div>
      </div>
    </>
  );
}
