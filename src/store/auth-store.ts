import { create } from 'zustand';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; newPassword?: string; message?: string; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null,
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,

  login: async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (!res.ok) {
        return { success: false, error: json.error || 'Erro ao fazer login' };
      }

      const { token, user } = json;
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isAdmin: user.role === 'admin' });
      return { success: true };
    } catch {
      return { success: false, error: 'Erro de conexão com o servidor' };
    }
  },

  logout: async () => {
    const { token } = get();
    if (token) {
      try {
        await fetch('/api/auth/me', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch { /* ignore */ }
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    set({ user: null, token: null, isAuthenticated: false, isAdmin: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (!token || !storedUser) {
      set({ isLoading: false, isAuthenticated: false, user: null, token: null, isAdmin: false });
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        set({ isLoading: false, isAuthenticated: false, user: null, token: null, isAdmin: false });
        return;
      }

      const { user } = await res.json();
      set({ user, token, isAuthenticated: true, isAdmin: user.role === 'admin', isLoading: false });
    } catch {
      // If server is unreachable, use cached user
      try {
        const cachedUser = JSON.parse(storedUser);
        set({ user: cachedUser, token, isAuthenticated: true, isAdmin: cachedUser.role === 'admin', isLoading: false });
      } catch {
        set({ isLoading: false, isAuthenticated: false, user: null, token: null, isAdmin: false });
      }
    }
  },

  forgotPassword: async (email: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();

      if (!res.ok) {
        return { success: false, error: json.error || 'Erro ao redefinir senha' };
      }

      return {
        success: true,
        newPassword: json.newPassword,
        message: json.message,
      };
    } catch {
      return { success: false, error: 'Erro de conexão com o servidor' };
    }
  },
}));
