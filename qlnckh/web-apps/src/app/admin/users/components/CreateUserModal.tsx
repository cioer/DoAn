import { useState, useEffect } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { usersApi, facultiesApi, FacultySelectItem } from '../../../../lib/api/users';
import type { CreateUserRequest, CreateUserResponse } from '../../../../shared/types/users';
import { UserRole } from '../../../../shared/types/auth';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (response: CreateUserResponse) => void;
}

/**
 * CreateUserModal Component
 *
 * Modal for creating a new user with credential reveal.
 * Shows temporary password ONE TIME ONLY after successful creation.
 *
 * Features:
 * - Form validation
 * - Temporary password display with copy button
 * - One-time password reveal (cannot view after closing)
 * - Vietnamese UI
 */
export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [step, setStep] = useState<'form' | 'credential'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: '',
    displayName: '',
    role: UserRole.GIANG_VIEN,
  });

  // Credential state (only available after creation)
  const [credentials, setCredentials] = useState<CreateUserResponse | null>(null);

  // Optional facultyId (not required for form submission)
  const [facultyId, setFacultyId] = useState('');
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

  // Reset form state
  const resetForm = () => {
    setFormData({
      email: '',
      displayName: '',
      role: UserRole.GIANG_VIEN,
    });
    setFacultyId('');
    setError('');
    setStep('form');
    setCredentials(null);
    setCopied(false);
  };

  // Handle modal close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Copy password to clipboard
  const handleCopyPassword = async () => {
    if (credentials?.temporaryPassword) {
      await navigator.clipboard.writeText(credentials.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await usersApi.createUser({
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        facultyId: facultyId || undefined,
      });

      setCredentials(response);
      setStep('credential');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.error_code || err.response?.data?.error?.message || 'Lỗi tạo người dùng';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle "Done" button after viewing credentials
  const handleDone = () => {
    if (credentials) {
      onSuccess(credentials);
    }
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'form' ? 'Tạo người dùng mới' : 'Thông tin đăng nhập'}
          </h2>
          <button
            onClick={handleClose}
            disabled={step === 'credential'}
            className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Step */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                id="displayName"
                type="text"
                required
                minLength={2}
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Vai trò <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                htmlFor="facultyId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Đơn vị (Khoa/Phòng)
              </label>
              <select
                id="facultyId"
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                disabled={isLoadingFaculties}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Đang tạo...' : 'Tạo người dùng'}
              </button>
            </div>
          </form>
        )}

        {/* Credential Step (One-time reveal) */}
        {step === 'credential' && credentials && (
          <div className="p-6 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 font-medium mb-2">
                ⚠️ Lưu ý quan trọng
              </p>
              <p className="text-sm text-yellow-700">
                Mật khẩu tạm thời chỉ hiển thị một lần. Vui lòng sao chép và gửi cho người dùng
                ngay bây giờ. Sau khi đóng cửa sổ này, bạn không thể xem lại mật khẩu.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Email</span>
                <p className="font-medium text-gray-900">{credentials.user.email}</p>
              </div>

              <div>
                <span className="text-sm text-gray-500">Họ và tên</span>
                <p className="font-medium text-gray-900">{credentials.user.displayName}</p>
              </div>

              <div>
                <span className="text-sm text-gray-500">Vai trò</span>
                <p className="font-medium text-gray-900">{credentials.user.role}</p>
              </div>

              <div>
                <span className="text-sm text-gray-500">Mật khẩu tạm thời</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded font-mono text-lg">
                    {credentials.temporaryPassword}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="p-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    title={copied ? 'Đã sao chép' : 'Sao chép mật khẩu'}
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <Copy className="h-5 w-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleDone}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Đã lưu, đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
