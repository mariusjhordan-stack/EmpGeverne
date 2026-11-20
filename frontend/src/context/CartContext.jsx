import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) { setCart(null); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/cart/');
      setCart(data);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addToCart = async (watchId, quantity = 1) => {
    try {
      const { data } = await api.post('/cart/add/', { watch_id: watchId, quantity });
      setCart(data);
      toast.success('Agregado al carrito');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al agregar al carrito');
      throw err;
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      const { data } = await api.patch(`/cart/items/${itemId}/`, { quantity });
      setCart(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar cantidad');
    }
  };

  const removeItem = async (itemId) => {
    try {
      const { data } = await api.delete(`/cart/items/${itemId}/`);
      setCart(data);
      toast.success('Producto eliminado del carrito');
    } catch {
      toast.error('Error al eliminar del carrito');
    }
  };

  const clearCart = async () => {
    try {
      await api.delete('/cart/clear/');
      setCart(null);
    } catch {
      toast.error('Error al vaciar el carrito');
    }
  };

  const itemCount = cart?.item_count || 0;

  return (
    <CartContext.Provider value={{ cart, loading, itemCount, fetchCart, addToCart, updateQuantity, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
