/**
 * Revision Panel Component (Story 4.4)
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
 */

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { workflowApi, CANONICAL_SECTIONS, WorkflowLog } from '@/lib/api/workflow';

export interface RevisionPanelProps {
  proposalId: string;
  proposalState: string;
  onResubmit?: (checkedSections: string[]) => void;
  checkedSections?: string[];
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
    .filter((item): item is { id: string; label: string } => item !== null);
}

/**
 * localStorage key for checkbox state
 */
const getStorageKey = (proposalId: string) => `revision-${proposalId}`;

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
    <div className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${isChecked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
      <input
        type="checkbox"
        id={`section-${sectionId}`}
        checked={isChecked}
        onChange={() => onToggle(sectionId)}
        className="w-4 h-4 mt-1 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
      />
      <div className="flex-1 min-w-0">
        <label
          htmlFor={`section-${sectionId}`}
          className="block font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={(e) => {
            e.preventDefault();
            onScrollToSection(sectionId);
          }}
        >
          {sectionLabel}
        </label>
        <button
          type="button"
          onClick={() => onScrollToSection(sectionId)}
          className="text-xs text-blue-600 hover:text-blue-700 mt-1 underline"
        >
          Xem trong form →
        </button>
      </div>
      {isChecked && (
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
      )}
    </div>
  );
}

export function RevisionPanel({
  proposalId,
  proposalState,
  onResubmit,
  checkedSections: propCheckedSections,
}: RevisionPanelProps) {
  const [returnLog, setReturnLog] = useState<WorkflowLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Internal state if not controlled
  const [internalChecked, setInternalChecked] = useState<string[]>([]);
  const isControlled = propCheckedSections !== undefined;
  const checkedSections = isControlled ? propCheckedSections : internalChecked;

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
        element.classList.add('ring-4', 'ring-blue-400', 'ring-opacity-50');
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-blue-400', 'ring-opacity-50');
        }, 2000);
      }
    },
    [],
  );

  // AC1: Only render when proposal state = CHANGES_REQUESTED
  if (proposalState !== 'CHANGES_REQUESTED') {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        <p className="text-sm text-gray-600">Đang tải thông tin yêu cầu sửa...</p>
      </div>
    );
  }

  // Error state - still show minimal panel
  if (error || !returnLog) {
    return (
      <div className="bg-white border border-amber-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-gray-900">Cần sửa các phần:</h3>
            <p className="text-sm text-gray-600 mt-1">
              {error || 'Không thể tải chi tiết yêu cầu sửa. Vui lòng kiểm tra lịch sử thay đổi.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Parse revision sections
  const revisionSectionIds = parseRevisionSections(returnLog.comment);
  const sectionItems = getSectionLabels(revisionSectionIds);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h3 className="font-semibold text-gray-900">Cần sửa các phần:</h3>
        <span className="text-sm text-gray-500">
          ({checkedSections.length}/{sectionItems.length} đã sửa)
        </span>
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
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Nộp lại sẽ giữ nguyên lịch sử; không quay về DRAFT.
        </p>
      </div>

      {/* AC5: Resubmit Button Placeholder - Story 4.5 will implement */}
      {/* Parent component should add the "Nộp lại" button based on checkedSections.length */}
    </div>
  );
}

/**
 * Default export for convenience
 */
export default RevisionPanel;
