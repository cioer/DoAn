import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  _hasHydrated: boolean; // Track if zustand persist has hydrated
  _setHasHydrated: (hasHydrated: boolean) => void; // Set hydration state
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

export const useAuthStore = create<AuthState>()(
  persist(
      (set, get) => ({
        user: null,
        actingAs: null,
        demoMode: false,
        demoPersonas: [],
        isAuthenticated: false,
        isLoading: false,
        error: null,
        _hasHydrated: false,
        _setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),

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
          return user?.permissions?.includes(permission) ?? false;
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
          return user?.role === role;
        },

        getEffectiveUser: () => {
          const { actingAs, user } = get();
          return actingAs || user;
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          actingAs: state.actingAs,
          demoMode: state.demoMode,
          demoPersonas: state.demoPersonas,
          isAuthenticated: state.isAuthenticated,
        }),
        onRehydrateStorage: () => (state) => {
          // Mark hydration as complete
          state?._setHasHydrated?.(true);
        },
      }
  )
);

// Hook to get hydration state
export const useHasHydrated = () => {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  return hasHydrated;
};
