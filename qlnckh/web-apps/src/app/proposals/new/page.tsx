import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X, FileText } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { Permission } from '../../../shared/types/permissions';
import { proposalsApi, type CreateProposalRequest } from '../../../lib/api/proposals';
import { Form1bFields } from '../../../components/proposals/Form1bFields';
import {
  Form1bData,
  EMPTY_FORM_1B,
  validateForm1b,
} from '../../../shared/types/form-1b';

/**
 * Create Proposal Page - Form Mẫu 1b (Phiếu đề xuất đề tài NCKH)
 *
 * Fixed form with all required fields for Mẫu 1b template.
 * No template selection - uses MAU_01B automatically.
 */
export default function CreateProposalPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // State
  const [title, setTitle] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [formData, setFormData] = useState<Form1bData>(EMPTY_FORM_1B);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get user's faculty as default
  const userFacultyId = user?.facultyId || '';

  useEffect(() => {
    // Check permissions
    const hasPermission = useAuthStore.getState().hasPermission(Permission.PROPOSAL_CREATE);
    if (!hasPermission) {
      navigate('/error/403');
      return;
    }

    // Set default faculty
    if (userFacultyId) {
      setFacultyId(userFacultyId);
    }
  }, [userFacultyId, navigate]);

  // Handle form field change
  const handleFieldChange = (field: keyof Form1bData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Validate form - returns errors object for immediate use
  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    // Validate title
    if (!title.trim()) {
      newErrors.title = 'Vui lòng nhập tên đề tài';
    } else if (title.trim().length < 10) {
      newErrors.title = 'Tên đề tài phải có ít nhất 10 ký tự';
    }

    // Validate faculty
    if (!facultyId) {
      newErrors.faculty = 'Vui lòng chọn đơn vị';
    }

    // Validate Form 1b fields
    const form1bErrors = validateForm1b(formData);
    Object.assign(newErrors, form1bErrors);

    setErrors(newErrors);
    return newErrors;
  };

  // Handle submit
  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      // Scroll to first error
      const firstErrorKey = Object.keys(validationErrors)[0];
      const errorElement = document.getElementById(firstErrorKey);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const data: CreateProposalRequest = {
        templateId: 'MAU_01B', // Fixed template for Mẫu 1b
        title: title.trim(),
        facultyId,
        formData: formData as unknown as Record<string, unknown>,
      };

      const proposal = await proposalsApi.createProposal(data);

      // Navigate to proposal detail page
      navigate(`/proposals/${proposal.id}`);
    } catch (err: unknown) {
      console.error('Failed to create proposal:', err);
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể tạo đề tài. Vui lòng thử lại.';
      setErrors((prev) => ({
        ...prev,
        submit: errorMessage,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    // Check for unsaved changes
    const hasChanges =
      title ||
      Object.values(formData).some((value) => value);
    if (hasChanges && !window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn hủy?')) {
      return;
    }
    navigate('/proposals');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tạo đề tài mới</h1>
              <p className="text-gray-600 mt-1">
                Phiếu đề xuất đề tài NCKH (Mẫu 1b)
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Basic Info Section */}
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-gray-800 pb-2 border-b border-gray-200">
              Thông tin chung
            </h3>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                Tên đề tài <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                placeholder="Nhập tên đề tài nghiên cứu (ít nhất 10 ký tự)"
                className={`
                  w-full px-4 py-3 border rounded-xl transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-offset-0
                  ${
                    errors.title
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/20'
                  }
                `}
              />
              {errors.title && (
                <p className="mt-2 text-sm text-red-600 ml-1 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.title}
                </p>
              )}
            </div>

            {/* Faculty - Read-only (from user) */}
            <div>
              <label htmlFor="faculty" className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                Đơn vị <span className="text-red-500">*</span>
              </label>
              <input
                id="faculty"
                type="text"
                value={user?.faculty?.name || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
              />
              <p className="mt-2 text-sm text-gray-500 ml-1">
                Đơn vị được lấy từ thông tin người dùng
              </p>
            </div>
          </div>

          {/* Form 1b Fields */}
          <Form1bFields
            formData={formData}
            onChange={handleFieldChange}
            errors={errors}
            proposalTitle={title}
            showAiFill={true}
          />

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{errors.submit}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
            >
              Hủy
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Tạo đề tài
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
