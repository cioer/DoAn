import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { Permission } from '../../../shared/types/permissions';
import { proposalsApi, type CreateProposalRequest } from '../../../lib/api/proposals';
import { formTemplatesApi, type FormTemplate } from '../../../lib/api/form-templates';
import { TemplateSelector } from '../../../components/proposals/TemplateSelector';
import { ProposalForm } from '../../../components/proposals/ProposalForm';
import { AutoSaveIndicator } from '../../../components/proposals/AutoSaveIndicator';
import { useAutoSave } from '../../../hooks/useAutoSave';

/**
 * Create Proposal Page
 *
 * Story 11.4: Create new proposal with template selection
 */
export default function CreateProposalPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // State
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [title, setTitle] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [formData, setFormData] = useState<Record<string, unknown>>({});
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

    // Load templates
    loadTemplates();

    // Set default faculty
    if (userFacultyId) {
      setFacultyId(userFacultyId);
    }
  }, []);

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const data = await formTemplatesApi.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setErrors((prev) => ({ ...prev, template: 'Không thể tải danh sách mẫu' }));
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Handle template selection
  const handleTemplateSelect = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    setSelectedTemplate(template || null);

    // Initialize form data with default values for each section
    if (template) {
      const initialData: Record<string, unknown> = {};
      template.sections.forEach((section) => {
        // Initialize each section with empty string
        initialData[section.sectionId] = '';
      });
      setFormData(initialData);
    }

    // Clear template error
    setErrors((prev) => ({ ...prev, template: undefined }));
  }, [templates]);

  // Handle form field change
  const handleFieldChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate template
    if (!selectedTemplateId) {
      newErrors.template = 'Vui lòng chọn mẫu đề tài';
    }

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

    // Validate required sections from template
    if (selectedTemplate) {
      selectedTemplate.sections.forEach((section) => {
        if (section.isRequired && !formData[section.sectionId]) {
          newErrors[section.sectionId] = `${section.label} là bắt buộc`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const data: CreateProposalRequest = {
        templateId: selectedTemplateId,
        title: title.trim(),
        facultyId,
        formData,
      };

      const proposal = await proposalsApi.createProposal(data);

      // Navigate to proposal detail page
      navigate(`/proposals/${proposal.id}`);
    } catch (err: any) {
      console.error('Failed to create proposal:', err);
      setErrors((prev) => ({
        ...prev,
        submit: err.response?.data?.message || 'Không thể tạo đề tài. Vui lòng thử lại.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    // Check for unsaved changes
    const hasChanges = title || facultyId || Object.keys(formData).some((key) => formData[key]);
    if (hasChanges && !window.confirm('Bạn có unsaved thay đổi. Bạn có chắc muốn hủy?')) {
      return;
    }
    navigate('/proposals');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tạo đề tài mới</h1>
            <p className="text-gray-600 mt-1">Điền thông tin để tạo đề tài nghiên cứu khoa học</p>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Template Selection */}
          <TemplateSelector
            templates={templates}
            selectedId={selectedTemplateId}
            onSelect={handleTemplateSelect}
            error={errors.template}
          />

          {/* Basic Info */}
          {selectedTemplate && (
            <>
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Thông tin chung</h2>

                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
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
                    placeholder="Nhập tên đề tài (ít nhất 10 ký tự)"
                    className={`
                      w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1
                      ${errors.title ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
                    `}
                  />
                  {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
                </div>

                {/* Faculty - Read-only (from user) */}
                <div>
                  <label htmlFor="faculty" className="block text-sm font-medium text-gray-700 mb-1">
                    Đơn vị <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="faculty"
                    type="text"
                    value={user?.faculty?.name || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">Đơn vị được lấy từ thông tin người dùng</p>
                </div>
              </div>

              {/* Dynamic Form Sections */}
              <h2 className="text-lg font-semibold text-gray-900">Nội dung chi tiết</h2>
              <ProposalForm
                template={selectedTemplate}
                formData={formData}
                onChange={handleFieldChange}
                errors={errors}
              />

              {/* Error Message */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {errors.submit}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Hủy
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
            </>
          )}

          {/* Loading state */}
          {isLoadingTemplates && (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              <p className="mt-2 text-sm text-gray-600">Đang tải danh sách mẫu...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
