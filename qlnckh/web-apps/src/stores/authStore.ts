import { create } from 'zustand';
import { User, UserRole } from '../shared/types/auth';
import { Permission } from '../shared/types/permissions';
import { DemoPersona } from '../shared/types/auth';

interface AuthState {
  user: User | null;
  actingAs: User | null; // Demo mode: acting as this user
  demoMode: boolean; // Whether demo mode is enabled
  demoPersonas: DemoPersona[]; // Available personas in demo mode
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setActingAs: (actingAs: User | null) => void;
  setDemoMode: (enabled: boolean, personas?: DemoPersona[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasRole: (role: UserRole) => boolean;
  // Get the effective user (actingAs if set, otherwise user)
  getEffectiveUser: () => User | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  actingAs: null,
  demoMode: false,
  demoPersonas: [],
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      error: null,
    }),

  setActingAs: (actingAs) =>
    set({ actingAs }),

  setDemoMode: (enabled, personas = []) =>
    set({
      demoMode: enabled,
      demoPersonas: personas,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  logout: () =>
    set({
      user: null,
      actingAs: null,
      isAuthenticated: false,
      error: null,
    }),

  hasPermission: (permission: Permission) => {
    const { getEffectiveUser } = get();
    const user = getEffectiveUser();
    return user?.permissions.includes(permission) ?? false;
  },

  hasAnyPermission: (permissions: Permission[]) => {
    const { getEffectiveUser } = get();
    const user = getEffectiveUser();
    if (!user) return false;
    return permissions.some((p) => user.permissions.includes(p));
  },

  hasRole: (role: UserRole) => {
    const { getEffectiveUser } = get();
    const user = getEffectiveUser();
    return user?.role === role ?? false;
  },

  getEffectiveUser: () => {
    const { actingAs, user } = get();
    return actingAs || user;
  },
}));
