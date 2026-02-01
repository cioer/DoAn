/**
 * Return Changes Dialog Component (Story 4.2)
 *
 * Confirmation dialog for requesting changes to a proposal.
 * Faculty reviewers can return proposals with:
 * - A reason code (predefined enum)
 * - Specific sections needing revision (checkboxes)
 * - Optional detailed comment
 *
 * Features:
 * - Required reason code dropdown
 * - Required section selection (min 1)
 * - Optional comment field
 * - Character counter for comment
 * - Vietnamese localization
 * - Uses design tokens for consistent styling
 */

import { useState, useCallback } from 'react';
import { RotateCcw, AlertCircle, FileEdit, CheckCircle2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Select, type SelectOption } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import { Checkbox } from '../../ui/Checkbox';
import {
  RETURN_REASON_LABELS,
  CANONICAL_SECTIONS,
  type ReturnReasonCode,
} from '../../../lib/api/workflow';

/**
 * Section item for the revision checklist
 */
export interface RevisionSection {
  id: string;
  label: string;
}

/**
 * Return Changes Dialog Props
 */
export interface ReturnChangesDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when changes are confirmed */
  onConfirm: (data: {
    reasonCode: ReturnReasonCode;
    reasonSections: string[];
    comment: string;
  }) => Promise<void>;
  /** Whether the form is being submitted */
  isSubmitting?: boolean;
  /** Title of the proposal being returned */
  proposalTitle?: string;
  /** Custom sections (defaults to CANONICAL_SECTIONS) */
  sections?: RevisionSection[];
  /** Dialog title override */
  title?: string;
  /** Dialog description override */
  description?: string;
}

/**
 * Return Changes Dialog Component
 *
 * A reusable dialog for requesting changes to a proposal with:
 * - Reason code selection
 * - Section checkboxes
 * - Optional comment
 */
export function ReturnChangesDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  proposalTitle = 'đề tài này',
  sections = CANONICAL_SECTIONS as unknown as RevisionSection[],
  title = 'Yêu cầu chỉnh sửa',
  description,
}: ReturnChangesDialogProps) {
  const [reasonCode, setReasonCode] = useState<ReturnReasonCode | ''>('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Validation: reasonCode required + at least 1 section selected
  const isValid = reasonCode !== '' && selectedSections.length > 0;

  // Build select options for reason codes
  const reasonOptions: SelectOption[] = Object.entries(RETURN_REASON_LABELS).map(
    ([code, label]) => ({ value: code, label })
  );

  // Toggle section selection
  const toggleSection = useCallback((sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
    // Clear error when user interacts
    setError(null);
  }, []);

  // Select all sections
  const selectAll = useCallback(() => {
    setSelectedSections(sections.map((s) => s.id));
    setError(null);
  }, [sections]);

  // Deselect all sections
  const deselectAll = useCallback(() => {
    setSelectedSections([]);
  }, []);

  // Handle form submission
  const handleSubmit = async () => {
    if (!reasonCode) {
      setError('Vui lòng chọn lý do yêu cầu chỉnh sửa');
      return;
    }

    if (selectedSections.length === 0) {
      setError('Vui lòng chọn ít nhất một phần cần chỉnh sửa');
      return;
    }

    setError(null);

    try {
      await onConfirm({
        reasonCode: reasonCode as ReturnReasonCode,
        reasonSections: selectedSections,
        comment: comment.trim(),
      });

      // Reset form after successful submit
      resetForm();
    } catch {
      // Error will be handled by parent component
    }
  };

  // Reset form state
  const resetForm = () => {
    setReasonCode('');
    setSelectedSections([]);
    setComment('');
    setError(null);
  };

  // Handle dialog close
  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-changes-dialog-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 shadow-lg">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2
                id="return-changes-dialog-title"
                className="text-lg font-bold text-white"
              >
                {title}
              </h2>
              <p className="text-amber-100 text-sm mt-0.5">
                {description || `Gửi yêu cầu chỉnh sửa cho ${proposalTitle}`}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Info banner */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Đề tài sẽ được trả về cho giảng viên</p>
              <p className="text-amber-700 mt-1">
                Sau khi gửi yêu cầu, đề tài sẽ chuyển sang trạng thái{' '}
                <strong>Yêu cầu chỉnh sửa</strong> và giảng viên sẽ được thông báo.
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Reason code dropdown */}
          <Select
            label="Lý do yêu cầu chỉnh sửa"
            required
            placeholder="-- Chọn lý do --"
            options={reasonOptions}
            value={reasonCode}
            onChange={(e) => {
              setReasonCode(e.target.value as ReturnReasonCode);
              if (error) setError(null);
            }}
            disabled={isSubmitting}
          />

          {/* Section checkboxes */}
          <fieldset>
            <div className="flex items-center justify-between mb-3">
              <legend className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-amber-600" />
                Phần cần chỉnh sửa
                <span className="text-red-500">*</span>
              </legend>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline"
                  disabled={isSubmitting}
                >
                  Chọn tất cả
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium hover:underline"
                  disabled={isSubmitting}
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            <div
              className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100"
              role="group"
              aria-label="Các phần cần chỉnh sửa"
            >
              {sections.map((section) => {
                const isChecked = selectedSections.includes(section.id);
                return (
                  <label
                    key={section.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 ${
                      isChecked
                        ? 'bg-amber-50 hover:bg-amber-100'
                        : 'hover:bg-gray-50'
                    } ${isSubmitting ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onChange={() => toggleSection(section.id)}
                      disabled={isSubmitting}
                      color="warning"
                    />
                    <span
                      className={`text-sm font-medium flex-1 ${
                        isChecked ? 'text-amber-800' : 'text-gray-700'
                      }`}
                    >
                      {section.label}
                    </span>
                    {isChecked && (
                      <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    )}
                  </label>
                );
              })}
            </div>

            {/* Selection counter */}
            <div className="mt-2 flex items-center justify-between text-xs">
              <p className="text-gray-500">
                {selectedSections.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                      {selectedSections.length}/{sections.length}
                    </span>
                    phần đã chọn
                  </span>
                ) : (
                  'Chọn ít nhất một phần'
                )}
              </p>
            </div>
          </fieldset>

          {/* Comment textarea */}
          <Textarea
            label="Ghi chú chi tiết"
            placeholder="Mô tả cụ thể vấn đề cần chỉnh sửa, ví dụ: cần bổ sung thêm tài liệu tham khảo về phương pháp nghiên cứu..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            disabled={isSubmitting}
            helperText="Tùy chọn - Giúp giảng viên hiểu rõ hơn về yêu cầu"
            maxLength={1000}
          />

          {/* Character counter for comment */}
          {comment.length > 0 && (
            <div className="flex justify-end -mt-3">
              <p className="text-xs text-gray-400">{comment.length}/1000 ký tự</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            variant="warning"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!isValid}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu chỉnh sửa'}
          </Button>
        </div>
      </div>
    </div>
  );
}
