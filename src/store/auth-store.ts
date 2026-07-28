import { create } from 'zustand';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  forgotPassword: (email: string, newPassword?: string) => Promise<{ success: boolean; newPassword?: string; message?: string; error?: string; requested?: boolean; alreadyRequested?: boolean }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,

  login: async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin',
      });
      const json = await res.json();

      if (!res.ok) {
        return { success: false, error: json.error || 'Erro ao fazer login' };
      }

      const { user } = json;
      set({ user, isAuthenticated: true, isAdmin: user.role === 'admin' });
      return { success: true };
    } catch {
      return { success: false, error: 'Erro de conexão com o servidor' };
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/me', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch { /* ignore */ }
    set({ user: null, isAuthenticated: false, isAdmin: false });
  },

  checkAuth: async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });

      if (!res.ok) {
        set({ isLoading: false, isAuthenticated: false, user: null, isAdmin: false });
        return;
      }

      const { user } = await res.json();
      set({ user, isAuthenticated: true, isAdmin: user.role === 'admin', isLoading: false });
    } catch {
      // Server unreachable — keep optimistic state, just stop loading
      set({ isLoading: false });
    }
  },

  forgotPassword: async (email: string, newPassword?: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      });
      const json = await res.json();

      if (!res.ok) {
        return { success: false, error: json.error || 'Erro ao redefinir senha' };
      }

      return {
        success: true,
        newPassword: json.newPassword,
        message: json.message,
        requested: json.requested,
        alreadyRequested: json.alreadyRequested,
      };
    } catch {
      return { success: false, error: 'Erro de conexão com o servidor' };
    }
  },
}));
