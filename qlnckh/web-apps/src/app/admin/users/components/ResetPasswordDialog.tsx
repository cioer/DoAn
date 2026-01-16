import { useState } from 'react';
import { X, RefreshCw, AlertTriangle, Copy, Check, Eye, EyeOff, Key } from 'lucide-react';
import { usersApi } from '../../../../lib/api/users';
import type { UserListItem } from '../../../../shared/types/users';

interface ResetPasswordDialogProps {
  isOpen: boolean;
  user: UserListItem | null;
  onClose: () => void;
}

/**
 * Reset Password Dialog
 *
 * Admin dialog to reset user password
 * Shows confirmation first, then displays the new temporary password
 */
export function ResetPasswordDialog({ isOpen, user, onClose }: ResetPasswordDialogProps) {
  const [step, setStep] = useState<'confirm' | 'success'>('confirm');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleReset = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await usersApi.resetPassword(user.id);
      setTemporaryPassword(result.temporaryPassword);
      setStep('success');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || 'Không thể reset mật khẩu';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!temporaryPassword) return;

    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setStep('confirm');
    setError(null);
    setTemporaryPassword(null);
    setCopied(false);
    setShowPassword(false);
    onClose();
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Key className="h-5 w-5 text-orange-600" />
            Reset mật khẩu
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === 'confirm' ? (
            <>
              {/* Confirmation step */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-gray-700 mb-2">
                    Bạn có chắc muốn reset mật khẩu cho người dùng:
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="font-medium text-gray-900">{user.displayName}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <p className="text-sm text-orange-600 mt-3">
                    Mật khẩu mới sẽ là chuỗi 8 ký tự ngẫu nhiên.
                  </p>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Reset mật khẩu
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Success step */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Reset mật khẩu thành công!
                </h3>
                <p className="text-gray-600">
                  Mật khẩu tạm thời cho <strong>{user.email}</strong>:
                </p>
              </div>

              {/* Temporary password display */}
              <div className="bg-gray-100 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <code className="text-xl font-mono font-bold text-gray-900 tracking-wider">
                      {showPassword ? temporaryPassword : '••••••••'}
                    </code>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Đã copy
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Lưu ý:</strong> Hãy gửi mật khẩu này cho người dùng qua kênh
                  an toàn. Mật khẩu chỉ hiển thị một lần!
                </p>
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={handleClose}
                className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Đóng
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
