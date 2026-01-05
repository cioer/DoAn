import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../lib/auth/auth';
import { DemoPersona } from '../../shared/types/auth';

/**
 * PersonaDropdown Component
 *
 * Displays a dropdown for switching personas in demo mode.
 * Only visible when DEMO_MODE is enabled.
 *
 * Shows:
 * - Current active persona
 * - List of available personas to switch to
 * - Visual indicator for demo mode
 * - Error message if switch fails
 */
export function PersonaDropdown() {
  const { demoMode, demoPersonas, setDemoMode, actingAs, user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load demo config on mount
  useEffect(() => {
    const loadDemoConfig = async () => {
      try {
        const config = await authApi.getDemoConfig();
        setDemoMode(config.enabled, config.personas);
      } catch (error) {
        console.error('Failed to load demo config:', error);
      }
    };
    loadDemoConfig();
  }, [setDemoMode]);

  // Don't render if demo mode is disabled
  if (!demoMode) {
    return null;
  }

  const currentPersona = actingAs || user;
  const personaName = currentPersona?.displayName || 'Unknown';

  const handleSwitchPersona = async (persona: DemoPersona) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.switchPersona(persona.id);
      // Update auth store with new acting-as user
      useAuthStore.getState().setActingAs(response.actingAs);
      setIsOpen(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'Không thể chuyển persona. Vui lòng thử lại.';
      setError(errorMessage);
      // Auto-clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Demo Mode Badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
          <span className="w-2 h-2 mr-1.5 bg-blue-500 rounded-full animate-pulse" />
          DEMO
        </span>

        {/* Persona Dropdown Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Đang đóng vai:</span>
          <span className="font-semibold text-blue-600">{personaName}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 shadow-sm z-30">
          {error}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown Panel */}
          <div className="absolute right-0 z-20 mt-2 w-72 bg-white rounded-md shadow-lg border border-gray-200 py-1">
            <div className="px-3 py-2 border-b border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase">
                Chọn Persona
              </p>
            </div>

            {isLoading ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                <div className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                Đang chuyển...
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {demoPersonas.map((persona) => {
                  const isActive = currentPersona?.id === persona.id;
                  return (
                    <button
                      key={persona.id}
                      type="button"
                      onClick={() => handleSwitchPersona(persona)}
                      disabled={isActive || isLoading}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {/* Avatar placeholder */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {persona.name.charAt(0)}
                      </div>

                      {/* Persona info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{persona.name}</p>
                        <p className="text-xs text-gray-500 truncate">{persona.description}</p>
                      </div>

                      {/* Active indicator */}
                      {isActive && (
                        <svg
                          className="w-5 h-5 text-blue-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
