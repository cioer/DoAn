/**
 * ResetDemoButton Component
 *
 * Displays a button to reset demo data in demo mode.
 * Only visible when DEMO_MODE is enabled and APP_MODE=demo.
 * - Uses UI components (Button, Dialog, Alert)
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
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useResetDemo } from '../../hooks/useResetDemo';
import { Button } from '../ui';
import { Dialog, DialogBody, DialogFooter } from '../ui';
import { Alert } from '../ui';

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
      {/* Reset Button - using Button component */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setShowConfirm(true)}
        isLoading={isLoading}
        leftIcon={<RotateCcw className="w-4 h-4" />}
        title="Reset tất cả dữ liệu demo về trạng thái ban đầu"
        className="border-secondary-300 bg-secondary-50 text-secondary-700 hover:bg-secondary-100 focus:ring-secondary-500"
      >
        Reset Demo
      </Button>

      {/* Confirmation Dialog - using Dialog component */}
      {showConfirm && (
        <Dialog
          isOpen={showConfirm}
          onClose={() => !isLoading && setShowConfirm(false)}
          title="Xác nhận Reset Demo"
          size="md"
        >
          <DialogBody>
            <Alert variant="warning">
              Bạn có chắc? Mọi dữ liệu demo sẽ bị xóa và tạo lại:
            </Alert>
            <ul className="mt-3 text-sm text-gray-600 list-disc list-inside ml-4">
              <li>Đề tài (proposals)</li>
              <li>Người dùng (users)</li>
              <li>Khoa (faculties)</li>
              <li>Lịch ngày nghỉ (holidays)</li>
            </ul>
            <p className="mt-2 text-sm text-warning-700 font-medium">
              Persona hiện tại sẽ được giữ nguyên.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowConfirm(false)}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              isLoading={isLoading}
            >
              Reset Demo
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-modal px-4 py-3 rounded-md shadow-lg flex items-center gap-3 ${
          toastType === 'success'
            ? 'bg-success-600 text-white'
            : 'bg-error-600 text-white'
        }`}>
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
