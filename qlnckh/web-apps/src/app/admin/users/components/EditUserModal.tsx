import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { usersApi, facultiesApi, FacultySelectItem } from '../../../../lib/api/users';
import type { UserListItem, UpdateUserRequest } from '../../../../shared/types/users';
import { UserRole } from '../../../../shared/types/auth';

interface EditUserModalProps {
  isOpen: boolean;
  user: UserListItem | null;
  onClose: () => void;
  onSuccess: (user: UserListItem) => void;
}

/**
 * EditUserModal Component
 *
 * Modal for editing user role, faculty, and display name.
 * Creates audit log entry for all changes.
 *
 * Features:
 * - Pre-filled form with current user data
 * - Visual indicators for changed fields
 * - Vietnamese UI
 */
export function EditUserModal({ isOpen, user, onClose, onSuccess }: EditUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Form state - initialize with user data when user changes
  const [formData, setFormData] = useState<UpdateUserRequest>({
    displayName: '',
    role: UserRole.GIANG_VIEN,
    facultyId: '',
  });

  // Track original values for change detection
  const [originalValues, setOriginalValues] = useState<UpdateUserRequest>({});
  const [faculties, setFaculties] = useState<FacultySelectItem[]>([]);
  const [isLoadingFaculties, setIsLoadingFaculties] = useState(false);

  // Load faculties for dropdown
  useEffect(() => {
    if (isOpen) {
      setIsLoadingFaculties(true);
      facultiesApi
        .getFacultiesForSelect()
        .then((data) => setFaculties(data))
        .catch(() => setFaculties([]))
        .finally(() => setIsLoadingFaculties(false));
    }
  }, [isOpen]);

  // Update form when user prop changes
  useEffect(() => {
    if (user) {
      const data: UpdateUserRequest = {
        displayName: user.displayName,
        role: user.role,
        facultyId: user.facultyId || '',
      };
      setFormData(data);
      setOriginalValues(data);
      setError('');
      setHasChanges(false);
    }
  }, [user]);

  // Check for changes
  useEffect(() => {
    if (user) {
      const changed =
        formData.displayName !== originalValues.displayName ||
        formData.role !== originalValues.role ||
        formData.facultyId !== originalValues.facultyId;
      setHasChanges(changed);
    }
  }, [formData, originalValues, user]);

  // Handle modal close
  const handleClose = () => {
    setFormData({
      displayName: '',
      role: UserRole.GIANG_VIEN,
      facultyId: '',
    });
    setError('');
    onClose();
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setIsLoading(true);

    try {
      const updatedUser = await usersApi.updateUser(user.id, formData);
      onSuccess(updatedUser);
      handleClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.error_code || err.response?.data?.error?.message || 'Lỗi cập nhật người dùng';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if field is changed from original
  const isFieldChanged = (field: keyof UpdateUserRequest) => {
    return formData[field] !== originalValues[field];
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Sửa người dùng</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* User info (read-only) */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium text-gray-900">{user.email}</p>
          </div>

          <div>
            <label
              htmlFor="edit-displayName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Họ và tên
              {isFieldChanged('displayName') && (
                <span className="ml-2 text-xs text-orange-600">(Đã thay đổi)</span>
              )}
            </label>
            <input
              id="edit-displayName"
              type="text"
              required
              minLength={2}
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isFieldChanged('displayName')
                  ? 'border-orange-300 bg-orange-50'
                  : 'border-gray-300'
              }`}
            />
          </div>

          <div>
            <label
              htmlFor="edit-role"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Vai trò
              {isFieldChanged('role') && (
                <span className="ml-2 text-xs text-orange-600">(Đã thay đổi)</span>
              )}
            </label>
            <select
              id="edit-role"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isFieldChanged('role')
                  ? 'border-orange-300 bg-orange-50'
                  : 'border-gray-300'
              }`}
            >
              <option value={UserRole.GIANG_VIEN}>Giảng viên / PI</option>
              <option value={UserRole.QUAN_LY_KHOA}>Quản lý Khoa</option>
              <option value={UserRole.THU_KY_KHOA}>Thư ký Khoa</option>
              <option value={UserRole.PHONG_KHCN}>Phòng KHCN</option>
              <option value={UserRole.THU_KY_HOI_DONG}>Thư ký Hội đồng</option>
              <option value={UserRole.THANH_TRUNG}>Thành viên Hội đồng</option>
              <option value={UserRole.BAN_GIAM_HOC}>Ban Giám học</option>
              <option value={UserRole.BGH}>Ban Giám hiệu (BGH - Legacy)</option>
              <option value={UserRole.HOI_DONG}>Hội đồng (Legacy)</option>
              <option value={UserRole.ADMIN}>Quản trị viên</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="edit-facultyId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Đơn vị (Khoa/Phòng)
              {isFieldChanged('facultyId') && (
                <span className="ml-2 text-xs text-orange-600">(Đã thay đổi)</span>
              )}
            </label>
            <select
              id="edit-facultyId"
              value={formData.facultyId}
              onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
              disabled={isLoadingFaculties}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                isFieldChanged('facultyId')
                  ? 'border-orange-300 bg-orange-50'
                  : 'border-gray-300'
              }`}
            >
              <option value="">-- Không chọn --</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} - {f.name}
                </option>
              ))}
            </select>
            {isLoadingFaculties && (
              <p className="mt-1 text-xs text-gray-500">Đang tải danh sách khoa...</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || !hasChanges}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
