import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || 'null');
    if (!tokens?.access) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/profile/');
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
    } catch {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('tokens');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  useEffect(() => {
    const handleForceLogout = () => {
      setUser(null);
      localStorage.removeItem('tokens');
      localStorage.removeItem('user');
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login/', { email, password });
    localStorage.setItem('tokens', JSON.stringify(data));
    await fetchProfile();
  };

  const register = async (userData) => {
    const { data } = await api.post('/auth/register/', userData);
    localStorage.setItem('tokens', JSON.stringify(data.tokens));
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const logout = () => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || 'null');
    if (tokens?.refresh) {
      api.post('/auth/logout/', { refresh: tokens.refresh }).catch(() => {});
    }
    localStorage.removeItem('tokens');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.is_staff === true;

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, isAdmin, login, register, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
