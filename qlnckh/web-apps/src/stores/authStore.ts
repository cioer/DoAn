import { create } from 'zustand';
import { User, UserRole } from '../shared/types/auth';
import { Permission } from '../shared/types/permissions';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasRole: (role: UserRole) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      error: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    }),

  hasPermission: (permission: Permission) => {
    const { user } = get();
    return user?.permissions.includes(permission) ?? false;
  },

  hasAnyPermission: (permissions: Permission[]) => {
    const { user } = get();
    if (!user) return false;
    return permissions.some((p) => user.permissions.includes(p));
  },

  hasRole: (role: UserRole) => {
    const { user } = get();
    return user?.role === role ?? false;
  },
}));
