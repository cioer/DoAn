/**
 * Document Generator Component
 *
 * Main UI for FormEngine document generation.
 * Shows only forms available for current user based on role and proposal state.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useFormEngine } from '../../hooks/useFormEngine';
import { formEngineApi } from '../../lib/api/form-engine';
import type {
  FormTemplateType,
  GenerateFormRequest,
  CouncilMember,
  AvailableForm,
} from '../../shared/types/form-engine';
import { TEMPLATE_DESCRIPTIONS } from '../../shared/types/form-engine';

interface DocumentGeneratorProps {
  proposalId: string;
  proposalCode: string;
  onSuccess?: (documentId: string) => void;
  onError?: (error: string) => void;
}

// Templates that need council member inputs
const COUNCIL_TEMPLATES: FormTemplateType[] = [
  'COUNCIL_MEETING_MINUTES',
  'FACULTY_ACCEPTANCE_MINUTES',
  'SCHOOL_ACCEPTANCE_MINUTES',
];

// Templates that need evaluation result
const EVALUATION_TEMPLATES: FormTemplateType[] = [
  'EVALUATION_FORM',
  'SCHOOL_EVALUATION',
  'FACULTY_ACCEPTANCE_EVAL',
  'SCHOOL_ACCEPTANCE_EVAL',
];

// Templates that need approval votes
const APPROVAL_TEMPLATES: FormTemplateType[] = [
  'FACULTY_MEETING_MINUTES',
  'COUNCIL_MEETING_MINUTES',
  'FACULTY_ACCEPTANCE_MINUTES',
  'SCHOOL_ACCEPTANCE_MINUTES',
];

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({
  proposalId,
  proposalCode,
  onSuccess,
  onError,
}) => {
  const {
    generationStatus,
    generationResult,
    generationError,
    generateForm,
    resetGeneration,
    downloadDocx,
    downloadPdf,
  } = useFormEngine();

  // Available forms state (filtered by role + state)
  const [availableForms, setAvailableForms] = useState<AvailableForm[]>([]);
  const [availableLoading, setAvailableLoading] = useState(true);
  const [availableError, setAvailableError] = useState<string | null>(null);
  const [proposalState, setProposalState] = useState<string>('');

  // Form state
  const [selectedFormType, setSelectedFormType] = useState<string>('');
  const [templateType, setTemplateType] = useState<FormTemplateType | ''>('');
  const [generatePdf, setGeneratePdf] = useState(true);
  const [isPass, setIsPass] = useState(true);
  const [isApproved, setIsApproved] = useState(true);
  const [evaluatorName, setEvaluatorName] = useState('');
  const [soPhieuDongY, setSoPhieuDongY] = useState(0);
  const [soPhieuPhanDoi, setSoPhieuPhanDoi] = useState(0);
  const [hoiDong, setHoiDong] = useState<CouncilMember[]>([
    { ten: '', don_vi: '' },
  ]);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch available forms on mount
  useEffect(() => {
    const fetchAvailableForms = async () => {
      try {
        setAvailableLoading(true);
        setAvailableError(null);
        const response = await formEngineApi.getAvailableForms(proposalId);
        setAvailableForms(response.available);
        setProposalState(response.proposalState);
      } catch (err) {
        console.error('Failed to fetch available forms:', err);
        setAvailableError('Không thể tải danh sách biểu mẫu');
      } finally {
        setAvailableLoading(false);
      }
    };

    fetchAvailableForms();
  }, [proposalId]);

  // Update templateType when form selection changes
  useEffect(() => {
    if (selectedFormType) {
      const mapped = formEngineApi.formTypeToTemplateType(selectedFormType);
      setTemplateType(mapped || '');
    } else {
      setTemplateType('');
    }
  }, [selectedFormType]);

  const needsCouncil = templateType && COUNCIL_TEMPLATES.includes(templateType);
  const needsEvaluation =
    templateType && EVALUATION_TEMPLATES.includes(templateType);
  const needsApproval =
    templateType && APPROVAL_TEMPLATES.includes(templateType);

  /**
   * Add council member
   */
  const addCouncilMember = useCallback(() => {
    setHoiDong((prev) => [...prev, { ten: '', don_vi: '' }]);
  }, []);

  /**
   * Remove council member
   */
  const removeCouncilMember = useCallback((index: number) => {
    setHoiDong((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Update council member
   */
  const updateCouncilMember = useCallback(
    (index: number, field: keyof CouncilMember, value: string) => {
      setHoiDong((prev) =>
        prev.map((member, i) =>
          i === index ? { ...member, [field]: value } : member
        )
      );
    },
    []
  );

  /**
   * Validate form
   */
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedFormType) {
      newErrors.templateType = 'Vui lòng chọn loại biểu mẫu';
    }

    if (needsEvaluation && !evaluatorName.trim()) {
      newErrors.evaluatorName = 'Vui lòng nhập tên người đánh giá';
    }

    if (needsCouncil) {
      const validMembers = hoiDong.filter(
        (m) => m.ten.trim() && m.don_vi.trim()
      );
      if (validMembers.length === 0) {
        newErrors.hoiDong = 'Vui lòng nhập ít nhất một thành viên hội đồng';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedFormType, needsEvaluation, evaluatorName, needsCouncil, hoiDong]);

  /**
   * Handle form submit
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate() || !templateType || !selectedFormType) return;

      const request: GenerateFormRequest = {
        templateType,
        generatePdf,
      };

      if (needsEvaluation) {
        request.isPass = isPass;
        request.evaluatorName = evaluatorName;
      }

      if (needsApproval) {
        request.isApproved = isApproved;
        request.soPhieuDongY = soPhieuDongY;
        request.soPhieuPhanDoi = soPhieuPhanDoi;
      }

      if (needsCouncil) {
        request.hoiDong = hoiDong.filter((m) => m.ten.trim() && m.don_vi.trim());
      }

      const result = await generateForm(proposalId, request);

      if (result) {
        onSuccess?.(result.document.id);
      } else {
        onError?.(generationError || 'Không thể tạo tài liệu');
      }
    },
    [
      validate,
      templateType,
      selectedFormType,
      generatePdf,
      needsEvaluation,
      isPass,
      evaluatorName,
      needsApproval,
      isApproved,
      soPhieuDongY,
      soPhieuPhanDoi,
      needsCouncil,
      hoiDong,
      generateForm,
      proposalId,
      onSuccess,
      onError,
      generationError,
    ]
  );

  /**
   * Handle download
   */
  const handleDownload = useCallback(
    async (type: 'docx' | 'pdf') => {
      if (!generationResult?.document) return;

      const fileName = `${proposalCode}_${templateType}`;

      try {
        if (type === 'docx') {
          await downloadDocx(generationResult.document.id, fileName);
        } else {
          await downloadPdf(generationResult.document.id, fileName);
        }
      } catch (error) {
        console.error('Download failed:', error);
      }
    },
    [generationResult, proposalCode, templateType, downloadDocx, downloadPdf]
  );

  // Get selected form info
  const selectedForm = availableForms.find(f => f.formType === selectedFormType);

  return (
    <div className="bg-white rounded-lg shadow-soft p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Tạo biểu mẫu NCKH
      </h3>

      {/* Loading State */}
      {availableLoading && (
        <div className="flex items-center justify-center py-8">
          <svg className="animate-spin w-6 h-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-gray-600">Đang tải danh sách biểu mẫu...</span>
        </div>
      )}

      {/* Available Forms Error */}
      {availableError && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <p className="text-yellow-700">{availableError}</p>
        </div>
      )}

      {/* No Forms Available */}
      {!availableLoading && !availableError && availableForms.length === 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Không có biểu mẫu nào có thể tạo</span>
          </div>
          <p className="text-sm text-gray-500">
            Với vai trò hiện tại và trạng thái đề tài ({proposalState}), bạn không có quyền tạo biểu mẫu nào.
          </p>
        </div>
      )}

      {/* Success State */}
      {generationStatus === 'success' && generationResult?.document && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 mb-3">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">Tạo tài liệu thành công!</span>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            {TEMPLATE_DESCRIPTIONS[templateType as FormTemplateType]}
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => handleDownload('docx')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Tải DOCX
            </button>

            {generationResult?.pdfUrl && (
              <button
                onClick={() => handleDownload('pdf')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Tải PDF
              </button>
            )}

            <button
              onClick={resetGeneration}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Tạo biểu mẫu khác
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {generationStatus === 'error' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">{generationError}</span>
          </div>
        </div>
      )}

      {/* Form */}
      {generationStatus !== 'success' && !availableLoading && availableForms.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Available Forms Selection */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Loại biểu mẫu <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedFormType}
              onChange={(e) => setSelectedFormType(e.target.value)}
              disabled={generationStatus === 'generating'}
              className={`
                w-full px-3 py-2 border rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:bg-gray-100 disabled:cursor-not-allowed
                ${errors.templateType ? 'border-red-500' : 'border-gray-300'}
              `}
            >
              <option value="">-- Chọn loại biểu mẫu --</option>
              {availableForms.map((form) => (
                <option key={form.formType} value={form.formType}>
                  {form.name}
                  {form.isRequired && ' (Bắt buộc)'}
                  {form.isGenerated && ' ✓ Đã tạo'}
                </option>
              ))}
            </select>
            {errors.templateType && (
              <p className="text-sm text-red-500">{errors.templateType}</p>
            )}
            {selectedForm && (
              <p className="text-sm text-gray-500 mt-1">{selectedForm.description}</p>
            )}
          </div>

          {/* PDF Option */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="generatePdf"
              checked={generatePdf}
              onChange={(e) => setGeneratePdf(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="generatePdf" className="text-sm text-gray-700">
              Tạo file PDF kèm theo
            </label>
          </div>

          {/* Evaluation Options */}
          {needsEvaluation && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">Thông tin đánh giá</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Người đánh giá <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={evaluatorName}
                  onChange={(e) => setEvaluatorName(e.target.value)}
                  placeholder="VD: PGS.TS. Nguyễn Văn A"
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    errors.evaluatorName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.evaluatorName && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.evaluatorName}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-700">Kết quả:</label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={isPass}
                    onChange={() => setIsPass(true)}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Đạt</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!isPass}
                    onChange={() => setIsPass(false)}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Không đạt</span>
                </label>
              </div>
            </div>
          )}

          {/* Approval Options */}
          {needsApproval && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">Kết quả biểu quyết</h4>

              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-700">Kết luận:</label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={isApproved}
                    onChange={() => setIsApproved(true)}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Thông qua</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!isApproved}
                    onChange={() => setIsApproved(false)}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Không thông qua</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số phiếu đồng ý
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={soPhieuDongY}
                    onChange={(e) => setSoPhieuDongY(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số phiếu không đồng ý
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={soPhieuPhanDoi}
                    onChange={(e) => setSoPhieuPhanDoi(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Council Members */}
          {needsCouncil && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">Thành viên Hội đồng</h4>

              {hoiDong.map((member, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={member.ten}
                      onChange={(e) =>
                        updateCouncilMember(index, 'ten', e.target.value)
                      }
                      placeholder="Họ và tên"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={member.don_vi}
                      onChange={(e) =>
                        updateCouncilMember(index, 'don_vi', e.target.value)
                      }
                      placeholder="Đơn vị"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  {hoiDong.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCouncilMember(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}

              {errors.hoiDong && (
                <p className="text-sm text-red-500">{errors.hoiDong}</p>
              )}

              <button
                type="button"
                onClick={addCouncilMember}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Thêm thành viên
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              !selectedFormType ||
              generationStatus === 'generating'
            }
            className={`
              w-full py-3 px-4 rounded-lg font-medium text-white
              flex items-center justify-center gap-2
              transition-colors
              ${
                !selectedFormType ||
                generationStatus === 'generating'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }
            `}
          >
            {generationStatus === 'generating' ? (
              <>
                <svg
                  className="animate-spin w-5 h-5"
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
                Đang tạo tài liệu...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Tạo biểu mẫu
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default DocumentGenerator;
