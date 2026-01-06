/**
 * Changes Requested Banner Component (Story 4.3)
 *
 * Displays a warning banner when a proposal is in CHANGES_REQUESTED state.
 * Shows:
 * - Warning message with icon
 * - Return reason (e.g., "Thiếu tài liệu")
 * - List of sections needing revision
 * - Link to revision panel (Story 4.4)
 */

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { workflowApi, RETURN_REASON_LABELS, CANONICAL_SECTIONS, WorkflowLog } from '@/lib/api/workflow';

export interface ChangesRequestedBannerProps {
  proposalId: string;
  proposalState: string;
}

/**
 * Parse revision sections from workflow log comment
 * Comment format: {"reason":"...","revisionSections":["SEC_BUDGET", ...]}
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
function getSectionLabels(sectionIds: string[]): string[] {
  return sectionIds
    .map((id) => CANONICAL_SECTIONS.find((s) => s.id === id)?.label)
    .filter((label): label is string => !!label);
}

export function ChangesRequestedBanner({
  proposalId,
  proposalState,
}: ChangesRequestedBannerProps) {
  const [returnLog, setReturnLog] = useState<WorkflowLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch if proposal is in CHANGES_REQUESTED state
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

  // AC3: Only render when proposal state = CHANGES_REQUESTED
  if (proposalState !== 'CHANGES_REQUESTED') {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
        <p className="text-sm text-amber-700">Đang tải thông tin yêu cầu sửa...</p>
      </div>
    );
  }

  // Error state (still show banner with generic message)
  if (error) {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-amber-800">Hồ sơ cần sửa trước khi nộp lại</p>
          <p className="text-sm text-amber-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // Parse return details
  const reasonCode = returnLog?.reasonCode;
  const reasonLabel = reasonCode
    ? RETURN_REASON_LABELS[reasonCode as keyof typeof RETURN_REASON_LABELS] || reasonCode
    : 'Cần chỉnh sửa';
  const revisionSections = returnLog ? parseRevisionSections(returnLog.comment) : [];
  const sectionLabels = getSectionLabels(revisionSections);

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-amber-800">Hồ sơ cần sửa trước khi nộp lại</p>

        {returnLog && (
          <div className="mt-2 text-sm text-amber-700">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">Lý do:</span>
              <span>{reasonLabel}</span>
            </div>

            {sectionLabels.length > 0 && (
              <div>
                <span className="font-medium">Phần cần sửa:</span>
                <ul className="list-disc list-inside mt-1 ml-1">
                  {sectionLabels.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-2 text-xs text-amber-600">
              <span className="font-medium">Người yêu cầu:</span> {returnLog.actorName}
              <span className="mx-2">•</span>
              <span className="font-medium">Ngày:</span>{' '}
              {new Date(returnLog.timestamp).toLocaleDateString('vi-VN')}
            </div>
          </div>
        )}

        {!returnLog && (
          <p className="mt-1 text-sm text-amber-700">
            Vui lòng xem chi tiết trong lịch sử thay đổi.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Default export for convenience
 */
export default ChangesRequestedBanner;
