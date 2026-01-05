import { useCallback, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../lib/auth/auth';
import { SwitchPersonaResponse } from '../shared/types/auth';

/**
 * usePersonaSwitch Hook
 *
 * Implements atomic persona switching following the red-green-refactor pattern:
 *
 * ATOMIC UPDATE CRITICAL:
 * 1. Call API to switch persona
 * 2. Update auth context ATOMICALLY (Zustand handles this)
 * 3. All UI using getEffectiveUser() will re-render with new permissions
 * 4. No stale UI from previous role
 *
 * Usage:
 * ```tsx
 * const { switchPersona, isLoading, error } = usePersonaSwitch();
 * await switchPersona(targetUserId);
 * ```
 */
export function usePersonaSwitch() {
  const { user, setActingAs } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchPersona = useCallback(
    async (targetUserId: string): Promise<SwitchPersonaResponse | null> => {
      if (!user?.id) {
        setError('Chưa đăng nhập');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Call API to switch persona (also updates JWT cookie with actingAs)
        const response = await authApi.switchPersona(targetUserId);

        // 2. ATOMIC UPDATE: Update actingAs in auth context
        //    Zustand handles atomic updates - all subscribers will see consistent state
        setActingAs(response.actingAs);

        // 3. UI will automatically re-render with new permissions
        //    Components using getEffectiveUser() will see the new persona
        //    Components using hasPermission() will check against new permissions

        // 4. IMPORTANT: If this project uses React Query, invalidate caches here:
        //    When queue module is implemented, add:
        //    await queryClient.invalidateQueries();
        //    await queryClient.refetchQueries(['queue']);
        //    This ensures stale data from old role is not displayed after switch

        return response;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Không thể chuyển persona';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, setActingAs],
  );

  return {
    switchPersona,
    isLoading,
    error,
  };
}
