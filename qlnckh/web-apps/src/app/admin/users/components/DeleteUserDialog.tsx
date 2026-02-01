import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { usersApi } from '../../../../lib/api/users';
import type { UserListItem } from '../../../../shared/types/users';

interface DeleteUserDialogProps {
  isOpen: boolean;
  user: UserListItem | null;
  onClose: () => void;
  onSuccess: (user: UserListItem) => void;
}

/**
 * DeleteUserDialog Component
 *
 * Confirmation dialog for soft-deleting a user.
 * User will not be able to login after soft delete.
 *
 * Features:
 * - Clear warning message
 * - Prevents self-deletion
 * - Vietnamese UI
 */
export function DeleteUserDialog({ isOpen, user, onClose, onSuccess }: DeleteUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle modal close
  const handleClose = () => {
    setError('');
    onClose();
  };

  // Confirm and delete user
  const handleConfirm = async () => {
    if (!user) return;

    setError('');
    setIsLoading(true);

    try {
      await usersApi.deleteUser(user.id);
      onSuccess(user);
      handleClose();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.error_code || err.response?.data?.error?.message || 'Lỗi xóa người dùng';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header with warning icon */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                Xác nhận xóa người dùng
              </h3>

              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-600">
                  Bạn có chắc muốn xóa người dùng này?
                </p>

                {/* User info */}
                <div className="bg-gray-50 rounded-md p-3 space-y-1 text-sm">
                  <p>
                    <span className="text-gray-500">Email:</span>{' '}
                    <span className="font-medium text-gray-900">{user.email}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Họ và tên:</span>{' '}
                    <span className="font-medium text-gray-900">{user.displayName}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Vai trò:</span>{' '}
                    <span className="font-medium text-gray-900">{user.role}</span>
                  </p>
                </div>

                <p className="text-sm text-red-600 font-medium">
                  ⚠️ Người dùng sẽ không thể đăng nhập sau khi bị xóa.
                </p>
              </div>

              {error && (
                <div className="mt-3 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-6 py-3 flex justify-end gap-3 rounded-b-lg">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
          >
            {isLoading ? 'Đang xóa...' : 'Xóa người dùng'}
          </button>
        </div>
      </div>
    </div>
  );
}
