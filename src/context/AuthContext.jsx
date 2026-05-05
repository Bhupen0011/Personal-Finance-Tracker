import { createContext, useMemo, useState } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext(null);

function getStoredAuth() {
  try {
    return JSON.parse(localStorage.getItem('pft-auth') || 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(getStoredAuth);
  const [loading, setLoading] = useState(false);

  const persistAuth = (payload) => {
    if (!payload) {
      localStorage.removeItem('pft-auth');
      setAuthState(null);
      return;
    }

    localStorage.setItem('pft-auth', JSON.stringify(payload));
    setAuthState(payload);
  };

  const login = async (credentials) => {
    setLoading(true);

    try {
      const response = await authService.login(credentials);
      persistAuth(response);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);

    try {
      const response = await authService.register(payload);
      persistAuth(response);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    persistAuth(null);
  };

  const refreshProfile = async () => {
    if (!authState?.token) {
      return null;
    }

    const response = await authService.getProfile();
    const next = {
      ...authState,
      user: response.user,
    };
    persistAuth(next);
    return response.user;
  };

  const updatePreferences = async (preferences) => {
    const response = await authService.updatePreferences(preferences);
    const next = {
      ...authState,
      user: response.user,
    };
    persistAuth(next);
    return response.user;
  };

  const value = useMemo(
    () => ({
      user: authState?.user ?? null,
      token: authState?.token ?? null,
      isAuthenticated: Boolean(authState?.token),
      loading,
      login,
      register,
      logout,
      refreshProfile,
      updatePreferences,
    }),
    [authState, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
