import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as endpoints from '../api/endpoints';
import { setTokenGetter } from '../api/client';
import type { User } from '../types';

const TOKEN_KEY = 'auth_token';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Registra el getter de token en el cliente axios
  setTokenGetter(() => get().token);

  return {
    token: null,
    user: null,
    isLoading: false,
    error: null,

    login: async (email: string, password?: string) => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken, user } = await endpoints.login(email, password);
        await AsyncStorage.setItem(TOKEN_KEY, accessToken);
        set({ token: accessToken, user, isLoading: false });
      } catch {
        set({ error: 'Impossibile accedere. Verifica le credenziali.', isLoading: false });
      }
    },

    logout: async () => {
      await AsyncStorage.removeItem(TOKEN_KEY);
      set({ token: null, user: null });
    },

    hydrate: async () => {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) return;
      set({ token });
      try {
        const { user } = await endpoints.getMe();
        set({ user });
      } catch {
        // Token expirado o inválido — limpiamos sesión
        await AsyncStorage.removeItem(TOKEN_KEY);
        set({ token: null });
      }
    },

    setUser: (user: User) => set({ user }),
  };
});
