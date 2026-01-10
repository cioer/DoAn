import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../../../stores/authStore';
import { Permission } from '../../../../shared/types/permissions';
import { ProjectState } from '../../../../lib/constants/states';
import { proposalsApi, type Proposal } from '../../../../lib/api/proposals';
import { formTemplatesApi, type FormTemplate } from '../../../../lib/api/form-templates';
import { ProposalForm } from '../../../../components/proposals/ProposalForm';
import { AutoSaveIndicator } from '../../../../components/proposals/AutoSaveIndicator';
import { useAutoSave } from '../../../../hooks/useAutoSave';
import { StateBadge } from '../../../../components/proposals/StateBadge';

/**
 * Edit Proposal Page
 *
 * Story 11.4: Edit existing DRAFT proposal
 */
export default function EditProposalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // State
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notEditableReason, setNotEditableReason] = useState<string | null>(null);

  // Load proposal and template
  useEffect(() => {
    if (!id) return;
    loadProposal(id);
  }, [id]);

  const loadProposal = async (proposalId: string) => {
    setIsLoading(true);
    try {
      const [proposalData, templates] = await Promise.all([
        proposalsApi.getProposalById(proposalId),
        formTemplatesApi.getTemplates(),
      ]);

      // Check if proposal is editable (only DRAFT)
      if (proposalData.state !== ProjectState.DRAFT) {
        setNotEditableReason('Đề tài ở trạng thái ' + proposalData.state + ' không thể chỉnh sửa');
        setProposal(proposalData);
        setIsLoading(false);
        return;
      }

      // Check if user is the owner
      if (proposalData.ownerId !== user?.id) {
        setNotEditableReason('Bạn không có quyền chỉnh sửa đề tài này');
        setProposal(proposalData);
        setIsLoading(false);
        return;
      }

      setProposal(proposalData);
      setTitle(proposalData.title || '');
      setFormData(proposalData.formData || {});

      // Load template
      if (proposalData.templateId) {
        const templateData = templates.find((t) => t.id === proposalData.templateId);
        if (templateData) {
          setTemplate(templateData);
        }
      }
    } catch (err) {
      console.error('Failed to load proposal:', err);
      setErrors((prev) => ({ ...prev, load: 'Không thể tải thông tin đề tài' }));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form field change
  const handleFieldChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Auto-save function
  const autoSaveFunc = async (data: Record<string, unknown>) => {
    if (!id) throw new Error('Proposal ID is required');
    await proposalsApi.autoSave(id, { formData: data });
  };

  // Auto-save hook
  const { status: autoSaveStatus, hasChanges } = useAutoSave<Record<string, unknown>>({
    data: formData,
    originalData: proposal?.formData || {},
    delay: 2000,
    onSave: autoSaveFunc,
    enabled: !!proposal && proposal.state === ProjectState.DRAFT,
  });

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Vui lòng nhập tên đề tài';
    } else if (title.trim().length < 10) {
      newErrors.title = 'Tên đề tài phải có ít nhất 10 ký tự';
    }

    if (template) {
      template.sections.forEach((section) => {
        if (section.required) {
          section.fields.forEach((field) => {
            if (field.required && !formData[field.id]) {
              newErrors[field.id] = field.label + ' là bắt buộc';
            }
          });
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (!id) throw new Error('Proposal ID is required');
      await proposalsApi.updateProposal(id, {
        title: title.trim(),
        formData,
      });
      navigate(`/proposals/${id}`);
    } catch (err: any) {
      console.error('Failed to update proposal:', err);
      setErrors((prev) => ({
        ...prev,
        submit: err.response?.data?.message || 'Không thể cập nhật đề tài. Vui lòng thử lại.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (hasChanges && !window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn hủy?')) {
      return;
    }
    navigate(`/proposals/${id}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="mt-2 text-sm text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Not editable state
  if (notEditableReason || !proposal) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-yellow-800">Không thể chỉnh sửa</h2>
              <p className="text-yellow-700 mt-1">{notEditableReason || 'Không tìm thấy đề tài'}</p>
              <button
                onClick={() => navigate(`/proposals/${id}`)}
                className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                Quay lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa đề tài</h1>
              {proposal && <StateBadge state={proposal.state as ProjectState} />}
            </div>
            <p className="text-gray-600 mt-1">Mã: {proposal?.code}</p>
          </div>
          <div className="flex items-center gap-4">
            <AutoSaveIndicator status={autoSaveStatus} />
            <button onClick={handleCancel} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Thông tin chung</h2>

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
                className={'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 ' +
                  (errors.title ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500')}
              />
              {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
                <input
                  type="text"
                  value={proposal?.faculty?.name || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mẫu đề tài</label>
                <input
                  type="text"
                  value={proposal?.template?.name || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                />
              </div>
            </div>
          </div>

          {template && (
            <>
              <h2 className="text-lg font-semibold text-gray-900">Nội dung chi tiết</h2>
              <ProposalForm template={template} formData={formData} onChange={handleFieldChange} errors={errors} />
            </>
          )}

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button onClick={handleCancel} className="px-4 py-2 text-gray-700 hover:text-gray-900">
              Hủy
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || autoSaveStatus === 'saving'}
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
                    Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
