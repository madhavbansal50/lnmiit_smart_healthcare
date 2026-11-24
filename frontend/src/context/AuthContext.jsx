import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('lnmiit_health_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const storedToken = localStorage.getItem('lnmiit_health_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        const socket = getSocket();
        socket.emit('AUTHENTICATE', storedToken);
      } catch (err) {
        console.error('Failed to verify user session:', err);
        localStorage.removeItem('lnmiit_health_token');
        localStorage.removeItem('lnmiit_health_user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data;

    localStorage.setItem('lnmiit_health_token', receivedToken);
    localStorage.setItem('lnmiit_health_user', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);

    const socket = getSocket();
    socket.emit('AUTHENTICATE', receivedToken);

    return receivedUser;
  };

  const logout = () => {
    localStorage.removeItem('lnmiit_health_token');
    localStorage.removeItem('lnmiit_health_user');
    setUser(null);
    setToken(null);
    window.location.href = '/login';
  };

  const updateUser = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
    localStorage.setItem('lnmiit_health_user', JSON.stringify({ ...user, ...updatedUser }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isDoctor: user?.role === 'DOCTOR',
        isStudent: user?.role === 'STUDENT'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
