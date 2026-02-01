import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { facultiesApi, Faculty } from '../../../../lib/api/users';

interface EditFacultyModalProps {
  isOpen: boolean;
  faculty: Faculty | null;
  onClose: () => void;
  onSuccess: (faculty: Faculty) => void;
}

export function EditFacultyModal({
  isOpen,
  faculty,
  onClose,
  onSuccess,
}: EditFacultyModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'FACULTY' | 'DEPARTMENT'>('FACULTY');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when faculty changes
  useEffect(() => {
    if (faculty) {
      setCode(faculty.code);
      setName(faculty.name);
      setType(faculty.type);
    }
  }, [faculty]);

  // Reset error when modal opens
  useEffect(() => {
    if (isOpen) setError('');
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faculty) return;

    setError('');
    setIsSubmitting(true);

    try {
      const data = { code, name, type };
      const updated = await facultiesApi.updateFaculty(faculty.id, data);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.error?.error_code ||
        'Lỗi khi cập nhật khoa';
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !faculty) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Sửa khoa</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã khoa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ví dụ: FAC-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên khoa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Khoa Công nghệ thông tin"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại đơn vị
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'FACULTY' | 'DEPARTMENT')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              <option value="FACULTY">Khoa</option>
              <option value="DEPARTMENT">Bộ môn/Phòng</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !code || !name}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
