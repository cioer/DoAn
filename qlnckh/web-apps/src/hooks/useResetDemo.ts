import { useCallback, useState } from 'react';
import { authApi } from '../lib/auth/auth';
import { ResetDemoResponse } from '../shared/types/auth';

/**
 * useResetDemo Hook
 *
 * Implements demo reset functionality:
 *
 * BEHAVIOR:
 * 1. Calls API to reset demo data (delete all demo data and reseed)
 * 2. Keeps current persona intact (auth cookies are not touched)
 * 3. Returns reset confirmation with counts and duration
 *
 * PERSONA PERSISTENCE:
 * - Reset only deletes demo data (users, proposals, etc.)
 * - Auth cookies (access_token, refresh_token) are NOT touched
 * - Persona switch info is in JWT payload (actingAs claim)
 * - After reset, user continues with current persona
 *
 * Usage:
 * ```tsx
 * const { resetDemo, isLoading, error } = useResetDemo();
 * await resetDemo();
 * ```
 */
export function useResetDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetDemo = useCallback(async (): Promise<ResetDemoResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Call reset API (this keeps current persona via cookies)
      const response = await authApi.resetDemo();

      // Note: Current persona is preserved because:
      // 1. Reset only deletes demo data (users, proposals, etc.)
      // 2. Auth cookies (access_token, refresh_token) are NOT touched
      // 3. Persona switch info is in JWT payload (actingAs claim)
      // 4. After reset, user can continue using current persona

      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Reset demo thất bại';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    resetDemo,
    isLoading,
    error,
  };
}
