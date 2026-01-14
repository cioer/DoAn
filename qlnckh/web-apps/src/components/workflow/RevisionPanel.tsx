/**
 * Revision Panel Component (Story 4.4 + Story 4.5 + Story 4.6)
 *
 * Displays sections needing revision with checkboxes for tracking completion.
 * Shows at top of proposal form when state = CHANGES_REQUESTED.
 *
 * Features:
 * - Lists sections from latest RETURN log
 * - Checkboxes to mark sections as "Đã sửa" (fixed)
 * - Click section label to scroll and highlight form section
 * - Warning message about history preservation
 * - "Nộp lại" button enabled when ≥1 checkbox ticked (Story 4.5)
 * - Resubmit functionality with confirmation and error handling (Story 4.5)
 * - "Xuất PDF yêu cầu sửa" button (Story 4.6)
 * - Uses UI components (Button)
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertTriangle, Send, Download } from 'lucide-react';
import { workflowApi, CANONICAL_SECTIONS, WorkflowLog, generateIdempotencyKey, downloadRevisionPdf } from '@/lib/api/workflow';
import { Button, Alert } from '../ui';

export interface RevisionPanelProps {
  proposalId: string;
  proposalState: string;
  onResubmit?: (checkedSections: string[]) => void;
  checkedSections?: string[];
  /** Callback when resubmit succeeds - parent should refresh proposal state */
  onResubmitSuccess?: () => void;
  /** Proposal code for PDF filename (Story 4.6) */
  proposalCode?: string;
}

/**
 * Parse revision sections from workflow log comment
 */
function parseRevisionSections(comment: string | null): string[] {
  if (!comment) return [];
  try {
    const parsed = JSON.parse(comment);
    return parsed.revisionSections || [];
  } catch {
    return [];
  }
}

/**
 * Get section labels from section IDs
 */
function getSectionLabels(sectionIds: string[]): Array<{ id: string; label: string }> {
  return sectionIds
    .map((id) => {
      const section = CANONICAL_SECTIONS.find((s) => s.id === id);
      return section ? { id: section.id, label: section.label } : null;
    })
    .filter((item) => item !== null) as Array<{ id: string; label: string }>;
}

/**
 * localStorage key for checkbox state
 * Namespaced to avoid collisions with other localStorage data (Fix #4)
 */
const getStorageKey = (proposalId: string) => `qlnckh.revision.${proposalId}`;

/**
 * Section Item Component
 */
interface SectionItemProps {
  sectionId: string;
  sectionLabel: string;
  isChecked: boolean;
  onToggle: (sectionId: string) => void;
  onScrollToSection: (sectionId: string) => void;
}

function SectionItem({
  sectionId,
  sectionLabel,
  isChecked,
  onToggle,
  onScrollToSection,
}: SectionItemProps) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 shadow-soft ${isChecked ? 'bg-gradient-to-r from-success-50 to-emerald-50 border-success-200 shadow-soft-lg' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-soft-md hover:-translate-y-0.5'}`}>
      <input
        type="checkbox"
        id={`section-${sectionId}`}
        checked={isChecked}
        onChange={() => onToggle(sectionId)}
        className="w-4 h-4 mt-1 text-success-600 border-gray-300 rounded focus:ring-2 focus:ring-success-500 focus:ring-offset-1"
      />
      <div className="flex-1 min-w-0">
        <label
          htmlFor={`section-${sectionId}`}
          className="block font-semibold text-gray-900 cursor-pointer hover:text-primary-600 transition-colors"
        >
          {sectionLabel}
        </label>
        <button
          type="button"
          onClick={() => onScrollToSection(sectionId)}
          className="text-xs text-primary-600 hover:text-primary-700 mt-1 underline decoration-dotted underline-offset-2"
        >
          Xem trong form →
        </button>
      </div>
      {isChecked && (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-success-500 to-emerald-600 flex items-center justify-center shadow-soft flex-shrink-0 mt-0.5">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}

/**
 * Revision Panel Component
 * - Uses UI components (Button)
 */
export function RevisionPanel({
  proposalId,
  proposalState,
  onResubmit,
  checkedSections: propCheckedSections,
  onResubmitSuccess,
  proposalCode,
}: RevisionPanelProps) {
  const [returnLog, setReturnLog] = useState<WorkflowLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Internal state if not controlled
  const [internalChecked, setInternalChecked] = useState<string[]>([]);
  const isControlled = propCheckedSections !== undefined;
  const checkedSections = isControlled ? propCheckedSections : internalChecked;

  // Story 4.5: Resubmit state
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState<string | null>(null);
  const [resubmitSuccess, setResubmitSuccess] = useState(false);

  // Story 4.6: Download PDF state
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Ref to track proposalId for cleanup on unmount (Fix #1)
  const proposalIdRef = useRef(proposalId);

  // Clear localStorage on component unmount (Fix #1)
  useEffect(() => {
    proposalIdRef.current = proposalId;
    return () => {
      try {
        localStorage.removeItem(getStorageKey(proposalIdRef.current));
      } catch {
        // Ignore localStorage errors
      }
    };
  }, [proposalId]);

  // Load checked sections from localStorage on mount
  useEffect(() => {
    if (proposalState === 'CHANGES_REQUESTED') {
      try {
        const stored = localStorage.getItem(getStorageKey(proposalId));
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setInternalChecked(parsed);
          }
        }
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [proposalId, proposalState]);

  // Clear localStorage when state changes away from CHANGES_REQUESTED
  useEffect(() => {
    if (proposalState !== 'CHANGES_REQUESTED') {
      try {
        localStorage.removeItem(getStorageKey(proposalId));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [proposalId, proposalState]);

  // Fetch latest RETURN log when state = CHANGES_REQUESTED
  useEffect(() => {
    if (proposalState !== 'CHANGES_REQUESTED') {
      setReturnLog(null);
      return;
    }

    setLoading(true);
    setError(null);

    workflowApi
      .getLatestReturn(proposalId)
      .then((log) => {
        setReturnLog(log);
      })
      .catch((err) => {
        console.error('Failed to fetch latest return log:', err);
        setError('Không thể tải thông tin yêu cầu sửa');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [proposalId, proposalState]);

  // Toggle checkbox state
  const toggleSection = useCallback(
    (sectionId: string) => {
      const newChecked = checkedSections.includes(sectionId)
        ? checkedSections.filter((id) => id !== sectionId)
        : [...checkedSections, sectionId];

      if (!isControlled) {
        setInternalChecked(newChecked);
        // Save to localStorage
        try {
          localStorage.setItem(getStorageKey(proposalId), JSON.stringify(newChecked));
        } catch {
          // Ignore localStorage errors
        }
      }

      // Notify parent
      if (onResubmit) {
        onResubmit(newChecked);
      }
    },
    [checkedSections, isControlled, onResubmit, proposalId],
  );

  // Scroll to section and highlight
  const scrollToSection = useCallback(
    (sectionId: string) => {
      // Map section ID to form element ID
      const elementId = sectionId.replace('SEC_', '').toLowerCase();
      const element = document.getElementById(elementId) ||
                     document.querySelector(`[data-section="${sectionId}"]`) ||
                     document.querySelector(`[name="${elementId}"]`);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Add highlight effect
        element.classList.add('ring-4', 'ring-primary-400', 'ring-opacity-50');
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-primary-400', 'ring-opacity-50');
        }, 2000);
      }
    },
    [],
  );

  // Story 4.5: Handle resubmit action
  const handleResubmit = useCallback(async () => {
    if (checkedSections.length === 0) {
      setResubmitError('Vui lòng đánh dấu ít nhất một phần đã sửa');
      return;
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      `Bạn có chắc muốn nộp lại hồ sơ?\n\n` +
      `- ${checkedSections.length} phần đã sửa được đánh dấu\n` +
      `- Hồ sơ sẽ được gửi về lại cho người reviewing\n` +
      `- Lịch sử thay đổi sẽ được giữ nguyên`,
    );

    if (!confirmed) {
      return;
    }

    setResubmitting(true);
    setResubmitError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();
      await workflowApi.resubmitProposal(
        proposalId,
        idempotencyKey,
        checkedSections,
      );

      // Success!
      setResubmitSuccess(true);

      // Clear localStorage
      try {
        localStorage.removeItem(getStorageKey(proposalId));
      } catch {
        // Ignore localStorage errors
      }

      // Notify parent to refresh proposal state
      if (onResubmitSuccess) {
        onResubmitSuccess();
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setResubmitSuccess(false);
      }, 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể nộp lại hồ sơ';
      setResubmitError(errorMessage);
    } finally {
      setResubmitting(false);
    }
  }, [checkedSections, proposalId, onResubmitSuccess]);

  // Story 4.6: Handle PDF download
  const handleDownloadPdf = useCallback(async () => {
    setDownloadingPdf(true);
    setPdfError(null);

    try {
      await downloadRevisionPdf(proposalId);
      // Success - file downloaded automatically
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải PDF yêu cầu sửa';
      setPdfError(errorMessage);
    } finally {
      setDownloadingPdf(false);
    }
  }, [proposalId]);

  // AC1: Only render when proposal state = CHANGES_REQUESTED
  if (proposalState !== 'CHANGES_REQUESTED') {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4 flex items-center gap-3 shadow-soft">
        <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-600 font-medium">Đang tải thông tin yêu cầu sửa...</p>
      </div>
    );
  }

  // Error state - still show minimal panel
  if (error || !returnLog) {
    return (
      <Alert variant="warning" className="mb-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900">Cần sửa các phần:</h3>
            <p className="text-sm text-gray-600 mt-1">
              {error || 'Không thể tải chi tiết yêu cầu sửa. Vui lòng kiểm tra lịch sử thay đổi.'}
            </p>
          </div>
        </div>
      </Alert>
    );
  }

  // Parse revision sections
  const revisionSectionIds = parseRevisionSections(returnLog.comment);
  const sectionItems = getSectionLabels(revisionSectionIds);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4 shadow-soft">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-gray-900">Cần sửa các phần:</h3>
          <span className="bg-primary-50 text-primary-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {checkedSections.length}/{sectionItems.length} đã sửa
          </span>
        </div>

        {/* Story 4.6: Download PDF Button - using Button component */}
        <Button
          variant="ghost"
          size="xs"
          onClick={handleDownloadPdf}
          isLoading={downloadingPdf}
          disabled={downloadingPdf}
          leftIcon={<Download className="w-3.5 h-3.5" />}
          title="Xuất PDF yêu cầu sửa"
          className="rounded-lg"
        >
          Xuất PDF
        </Button>
      </div>

      {/* Section Items */}
      {sectionItems.length > 0 ? (
        <div className="space-y-2 mb-4">
          {sectionItems.map((section) => (
            <SectionItem
              key={section.id}
              sectionId={section.id}
              sectionLabel={section.label}
              isChecked={checkedSections.includes(section.id)}
              onToggle={toggleSection}
              onScrollToSection={scrollToSection}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-4">Không có section cụ thể nào được yêu cầu sửa.</p>
      )}

      {/* AC6: Warning Message */}
      <Alert variant="warning" className="text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-warning-800">
            Nộp lại sẽ giữ nguyên lịch sử; không quay về DRAFT.
          </p>
        </div>
      </Alert>

      {/* Story 4.5: Resubmit Success Message */}
      {resubmitSuccess && (
        <Alert variant="success" className="text-sm mt-4">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-success-800">
              Đã nộp lại hồ sơ thành công! Đang chuyển về lại cho người reviewing...
            </p>
          </div>
        </Alert>
      )}

      {/* Resubmit Error Message */}
      {resubmitError && (
        <Alert variant="error" className="text-sm mt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-error-800">{resubmitError}</p>
          </div>
        </Alert>
      )}

      {/* PDF Error Message */}
      {pdfError && (
        <Alert variant="error" className="text-sm mt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-error-800">{pdfError}</p>
          </div>
        </Alert>
      )}

      {/* Story 4.5: Resubmit Button - using Button component */}
      <div className="mt-4 flex justify-end">
        <Button
          variant="primary"
          size="sm"
          onClick={handleResubmit}
          isLoading={resubmitting}
          disabled={checkedSections.length === 0 || resubmitting || sectionItems.length === 0}
          leftIcon={<Send className="w-4 h-4" />}
          title={sectionItems.length === 0 ? 'Không có phần nào cần sửa' : undefined}
        >
          {sectionItems.length > 0
            ? `Nộp lại (${checkedSections.length}/${sectionItems.length} đã sửa)`
            : 'Nộp lại'}
        </Button>
      </div>
    </div>
  );
}

/**
 * Default export for convenience
 */
export default RevisionPanel;
