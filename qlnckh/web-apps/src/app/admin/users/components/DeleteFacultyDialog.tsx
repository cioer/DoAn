import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { facultiesApi, Faculty } from '../../../../lib/api/users';

interface DeleteFacultyDialogProps {
  isOpen: boolean;
  faculty: Faculty | null;
  onClose: () => void;
  onSuccess: (faculty: Faculty) => void;
}

export function DeleteFacultyDialog({
  isOpen,
  faculty,
  onClose,
  onSuccess,
}: DeleteFacultyDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!faculty) return;

    setIsDeleting(true);
    setError('');

    try {
      const deleted = await facultiesApi.deleteFaculty(faculty.id);
      onSuccess(deleted);
      onClose();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.error?.error_code ||
        'Lỗi khi xóa khoa';
      setError(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !faculty) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Xác nhận xóa</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <p className="text-gray-700">
            Bạn có chắc chắn muốn xóa khoa <strong>"{faculty.name}"</strong>?
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Hành động này không thể hoàn tác. Khoa chỉ có thể được xóa khi không còn
            người dùng hay đề tài liên quan.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? 'Đang xóa...' : 'Xóa khoa'}
          </button>
        </div>
      </div>
    </div>
  );
}
