import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAutoSave, AutoSaveState } from '../../../../hooks/useAutoSave';
import { SaveIndicator, FileUpload, AttachmentList } from '../../../../components/forms';
import { proposalsApi, Proposal } from '../../../../lib/api/proposals';
import { attachmentsApi, Attachment } from '../../../../lib/api/attachments';

/**
 * Proposal Edit Page (Story 2.3 - Integration)
 *
 * Features:
 * - Auto-save with 2-second debounce when form fields change
 * - Save indicator showing current save status
 * - Force save before navigation/unmount
 * - Only works for DRAFT proposals
 */
export default function ProposalEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form data state - structured by sections
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  // Attachments state (Story 2.4)
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [totalSize, setTotalSize] = useState(0);

  /**
   * Load proposal data on mount
   */
  useEffect(() => {
    const loadProposal = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const data = await proposalsApi.getProposalById(id);

        // Only DRAFT proposals can be edited
        if (data.state !== 'DRAFT') {
          setLoadError(`Chỉ có thể chỉnh sửa đề tài ở trạng thái NHÁP. Trạng thái hiện tại: ${data.state}`);
          setProposal(null);
          return;
        }

        setProposal(data);
        setFormData(data.formData || {});
      } catch (error) {
        const err = error as Error;
        setLoadError(err.message || 'Không thể tải đề tài');
      } finally {
        setIsLoading(false);
      }
    };

    void loadProposal();
  }, [id]);

  /**
   * Auto-save hook (Story 2.3)
   * - Only enabled when proposal is in DRAFT state
   * - 2-second debounce
   * - Exponential backoff retry
   */
  const { state: autoSaveState, triggerSave, forceSave } = useAutoSave({
    proposalId: id || '',
    enabled: proposal?.state === 'DRAFT',
    debounceMs: 2000,
    maxRetries: 3,
    onAutoSaveSuccess: (updatedProposal) => {
      // Update local proposal state with saved data
      setProposal(updatedProposal);
    },
    onAutoSaveError: (error) => {
      console.error('Auto-save failed:', error);
    },
  });

  /**
   * Handle field change - trigger auto-save (AC1: Auto-save Trigger)
   */
  const handleFieldChange = useCallback(
    (sectionId: string, field: string, value: unknown) => {
      setFormData((prev) => {
        const updated = {
          ...prev,
          [sectionId]: {
            ...(prev[sectionId] as Record<string, unknown> || {}),
            [field]: value,
          },
        };

        // Trigger auto-save with updated form data (AC1)
        triggerSave(updated);

        return updated;
      });
    },
    [triggerSave],
  );

  /**
   * Handle section change - entire section updated at once
   */
  const handleSectionChange = useCallback((sectionId: string, sectionData: Record<string, unknown>) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [sectionId]: sectionData,
      };

      // Trigger auto-save with updated form data
      triggerSave(updated);

      return updated;
    });
  }, [triggerSave]);

  /**
   * Load attachments for proposal (Story 2.4 - Task 6.3)
   */
  useEffect(() => {
    const loadAttachments = async () => {
      if (!id) return;

      try {
        setAttachmentsLoading(true);
        const result = await attachmentsApi.getByProposalId(id);
        setAttachments(result.data);
        setTotalSize(result.totalSize);
      } catch (error) {
        console.error('Failed to load attachments:', error);
      } finally {
        setAttachmentsLoading(false);
      }
    };

    void loadAttachments();
  }, [id]);

  /**
   * Handle attachment upload success (Story 2.4 - Task 6.2)
   */
  const handleUploadSuccess = useCallback((attachment: Attachment) => {
    setAttachments((prev) => [...prev, attachment]);
    setTotalSize((prev) => prev + attachment.fileSize);
  }, []);

  /**
   * Handle form submit (explicit save button)
   * Forces immediate save before navigation
   */
  const handleSubmit = async () => {
    // Force save any pending changes
    await forceSave(formData);
    // Navigate back or show success message
    navigate(-1);
  };

  /**
   * Handle navigation away - force save first (AC5: Data Persistence)
   */
  const handleNavigateAway = useCallback(async () => {
    await forceSave(formData);
    navigate(-1);
  }, [forceSave, formData, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải đề tài...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p>{loadError}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  // Proposal not found
  if (!proposal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Không tìm thấy đề tài</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with SaveIndicator (AC2, AC3: Save Indicator) */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">{proposal.title}</h1>
          <p className="text-sm text-muted-foreground">Mã: {proposal.code}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* AC2, AC3: Save Indicator */}
          <SaveIndicator state={autoSaveState} />
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Lưu và thoát
          </button>
        </div>
      </div>

      {/* Demo Proposal Form */}
      <div className="space-y-6">
        {/* Attachments Section (Story 2.4 - Task 6.1) */}
        <section className="border rounded-lg p-4" data-section="SEC_ATTACHMENTS">
          <h2 className="text-lg font-semibold mb-4">Tài liệu đính kèm</h2>

          {/* Upload component (Task 6.2) - disabled when not in DRAFT (Task 6.4) */}
          <div className="mb-4">
            <FileUpload
              proposalId={id || ''}
              onUploadSuccess={handleUploadSuccess}
              disabled={proposal?.state !== 'DRAFT'}
              currentTotalSize={totalSize}
            />
          </div>

          {/* Attachments list (Task 6.2, 6.3) */}
          {!attachmentsLoading && (
            <AttachmentList
              proposalId={id || ''}
              attachments={attachments}
              totalSize={totalSize}
            />
          )}
        </section>

        {/* Section: SEC_INFO_GENERAL */}
        <section className="border rounded-lg p-4" data-section="SEC_INFO_GENERAL">
          <h2 className="text-lg font-semibold mb-4">Thông tin chung</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tên đề tài</label>
              <input
                type="text"
                data-section="SEC_INFO_GENERAL"
                data-field="title"
                value={(formData.SEC_INFO_GENERAL as Record<string, unknown>)?.title as string || ''}
                onChange={(e) => handleFieldChange('SEC_INFO_GENERAL', 'title', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Nhập tên đề tài"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mục tiêu nghiên cứu</label>
              <textarea
                data-section="SEC_INFO_GENERAL"
                data-field="objective"
                value={(formData.SEC_INFO_GENERAL as Record<string, unknown>)?.objective as string || ''}
                onChange={(e) => handleFieldChange('SEC_INFO_GENERAL', 'objective', e.target.value)}
                className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                placeholder="Nhập mục tiêu nghiên cứu"
              />
            </div>
          </div>
        </section>

        {/* Section: SEC_BUDGET */}
        <section className="border rounded-lg p-4" data-section="SEC_BUDGET">
          <h2 className="text-lg font-semibold mb-4">Ngân sách dự kiến</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tổng ngân sách (VNĐ)</label>
              <input
                type="number"
                data-section="SEC_BUDGET"
                data-field="total"
                value={(formData.SEC_BUDGET as Record<string, unknown>)?.total as string || ''}
                onChange={(e) => handleFieldChange('SEC_BUDGET', 'total', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Nhập tổng ngân sách"
              />
            </div>
          </div>
        </section>

        {/* Note: This is a demo form. Real implementation would have all sections */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          <p><strong>Lưu ý:</strong> Đây là form demo. Thực tế sẽ có tất cả các section từ template.</p>
          <p className="mt-1">Auto-save được kích hoạt khi bạn thay đổi bất kỳ field nào.</p>
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={handleNavigateAway}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Hủy
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Lưu và thoát
        </button>
      </div>
    </div>
  );
}
