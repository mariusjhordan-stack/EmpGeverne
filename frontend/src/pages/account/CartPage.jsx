import { Link } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function CartPage() {
  const { cart, loading, updateQuantity, removeItem, clearCart } = useCart();
  const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(p);

  if (loading) return <LoadingSpinner text="Cargando carrito..." />;

  const items = cart?.items || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-fade-in">
      <h1 className="font-serif text-3xl text-charcoal mb-8 animate-fade-in-up">Carrito de Compras</h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag className="mx-auto mb-4 text-gray-300" size={48} />
          <p className="text-gray-500 mb-6">Tu carrito está vacío</p>
          <Link to="/catalogo" className="inline-block bg-gold hover:bg-gold-dark text-white px-8 py-3 rounded-lg text-sm tracking-wider">
            EXPLORAR CATÁLOGO
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-8">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-lg p-4 flex items-center gap-4 shadow-sm">
                <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  {item.watch_image ? (
                    <img src={item.watch_image} alt={item.watch_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Sin imagen</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gold tracking-wider">{item.watch_brand}</p>
                  <Link to={`/catalogo/${item.watch_slug}`} className="text-sm font-medium text-charcoal hover:text-gold">{item.watch_name}</Link>
                  <p className="text-sm text-gray-500">{formatPrice(item.watch_price)} c/u</p>
                </div>
                <div className="flex items-center border border-gray-200 rounded">
                  <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} className="p-2 hover:bg-gray-50"><Minus size={14} /></button>
                  <span className="px-3 text-sm">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, Math.min(item.watch_stock, item.quantity + 1))} className="p-2 hover:bg-gray-50"><Plus size={14} /></button>
                </div>
                <div className="text-right w-28">
                  <p className="text-sm font-semibold text-charcoal">{formatPrice(item.subtotal)}</p>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-4">
            <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-700">Vaciar carrito</button>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center text-lg font-semibold text-charcoal mb-6">
              <span>Total</span>
              <span>{formatPrice(cart?.total || 0)}</span>
            </div>
            <Link to="/checkout"
              className="block w-full text-center bg-gold hover:bg-gold-dark text-white py-3 rounded-lg text-sm tracking-wider transition-colors">
              PROCEDER AL CHECKOUT
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
