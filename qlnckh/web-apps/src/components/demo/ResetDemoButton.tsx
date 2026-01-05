import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useResetDemo } from '../../hooks/useResetDemo';

/**
 * ResetDemoButton Component
 *
 * Displays a button to reset demo data in demo mode.
 * Only visible when DEMO_MODE is enabled and APP_MODE=demo.
 *
 * Shows:
 * - Reset button with confirmation modal
 * - Progress indicator during reset
 * - Toast notification on success/error
 * - Disabled state while resetting
 *
 * Behavior:
 * - Requires explicit confirmation to prevent accidental resets
 * - Shows progress indicator during reset operation
 * - Displays toast notification on completion
 * - Preserves current persona after reset
 */
export function ResetDemoButton() {
  const { demoMode } = useAuthStore();
  const { resetDemo, isLoading } = useResetDemo();
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Don't render if demo mode is disabled
  if (!demoMode) {
    return null;
  }

  const handleReset = async () => {
    try {
      const result = await resetDemo();
      if (result) {
        setShowConfirm(false);
        setToastType('success');
        setToast(`✅ ${result.message} (${result.counts.proposals} đề tài, ${result.counts.users} người dùng)`);
        setTimeout(() => setToast(null), 5000);

        // Redirect to worklist after successful reset (AC6)
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);

        // Note: Current persona is preserved because reset only touches demo data
        // Auth cookies are NOT affected, so actingAs remains intact
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Reset demo thất bại';
      setToastType('error');
      setToast(`❌ ${message}`);
      setTimeout(() => setToast(null), 5000);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Reset tất cả dữ liệu demo về trạng thái ban đầu"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            Đang reset...
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Reset Demo
          </>
        )}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => !isLoading && setShowConfirm(false)}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              {/* Warning icon */}
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Xác nhận Reset Demo
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Bạn có chắc? Mọi dữ liệu demo sẽ bị xóa và tạo lại:
                </p>
                <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                  <li>Đề tài (proposals)</li>
                  <li>Người dùng (users)</li>
                  <li>Khoa (faculties)</li>
                  <li>Lịch ngày nghỉ (holidays)</li>
                </ul>
                <p className="mt-2 text-sm text-orange-600 font-medium">
                  Persona hiện tại sẽ được giữ nguyên.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang reset...
                  </span>
                ) : (
                  'Reset Demo'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-md shadow-lg flex items-center gap-3 ${
            toastType === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          <span className="text-sm font-medium">{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white hover:text-gray-200"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
