import { useState, useRef } from 'react';
import { Download, FileText, RefreshCw, Trash2, Lock, Loader2 } from 'lucide-react';
import { Attachment, attachmentsApi } from '../../lib/api/attachments';
import { Alert, Button } from '../ui';

/**
 * AttachmentList Component (Story 2.4, 2.5)
 *
 * Displays list of uploaded files with:
 * - File name and size
 * - Upload date
 * - Download button
 * - Replace button (DRAFT and CHANGES_REQUESTED only, Story 2.5)
 * - Delete button (DRAFT and CHANGES_REQUESTED only, Story 2.5)
 * - Total size warning when > 50MB
 *
 * @param proposalId - Proposal ID
 * @param proposalState - Proposal state (for gating replace/delete)
 * @param attachments - Array of attachments
 * @param totalSize - Total size of all attachments
 * @param onAttachmentChange - Callback when attachment is replaced or deleted
 */
interface AttachmentListProps {
  proposalId: string;
  proposalState?: string;
  attachments: Attachment[];
  totalSize: number;
  onAttachmentChange?: () => void;
}

const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

export function AttachmentList({
  proposalId,
  proposalState = 'DRAFT',
  attachments,
  totalSize,
  onAttachmentChange,
}: AttachmentListProps) {
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replaceProgress, setReplaceProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);

  const isDraft = proposalState === 'DRAFT';
  const isEditable = proposalState === 'DRAFT' || proposalState === 'CHANGES_REQUESTED';
  const formatFileSize = attachmentsApi.formatFileSize;
  const isOverLimit = totalSize > MAX_TOTAL_SIZE;

  const handleReplaceClick = (attachmentId: string) => {
    setSelectedAttachmentId(attachmentId);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAttachmentId) return;

    setReplacingId(selectedAttachmentId);
    setReplaceProgress(0);
    setError(null);

    try {
      const result = await attachmentsApi.replace(
        proposalId,
        selectedAttachmentId,
        file,
        {
          onProgress: (progress) => setReplaceProgress(progress),
        },
      );

      setSelectedAttachmentId(null);
      onAttachmentChange?.();

      // Show success feedback
      // Note: In a full implementation, this would use a toast notification
      console.log('Attachment replaced successfully:', result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Thay thế tài liệu thất bại';
      setError(errorMessage);

      // Handle specific error codes
      if (errorMessage.includes('PROPOSAL_NOT_DRAFT')) {
        setError('Không thể sửa sau khi nộp. Vui lòng liên hệ admin nếu cần sửa.');
      }
    } finally {
      setReplacingId(null);
      setReplaceProgress(0);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteClick = async (attachmentId: string, fileName: string) => {
    // Confirmation dialog
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa "${fileName}"?`,
    );

    if (!confirmed) return;

    setDeletingId(attachmentId);
    setError(null);

    try {
      await attachmentsApi.delete(proposalId, attachmentId);
      onAttachmentChange?.();

      // Show success feedback
      console.log('Attachment deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Xóa tài liệu thất bại';
      setError(errorMessage);

      // Handle specific error codes
      if (errorMessage.includes('PROPOSAL_NOT_DRAFT')) {
        setError('Không thể sửa sau khi nộp. Vui lòng liên hệ admin nếu cần sửa.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with total size */}
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-sm">Tài liệu đính kèm</h3>
        <span className={`text-sm ${isOverLimit ? 'text-error-600 font-semibold' : 'text-gray-600'}`}>
          {formatFileSize(totalSize)} / 50 MB
        </span>
      </div>

      {/* Warning when over limit - using Alert component */}
      {isOverLimit && (
        <Alert variant="warning" className="text-sm">
          Tổng dung lượng đã vượt giới hạn (50MB/proposal)
        </Alert>
      )}

      {/* Error message - using Alert component */}
      {error && (
        <Alert variant="error" className="text-sm">
          {error.replace(/^[A-Z_]+:\s*/, '')}
        </Alert>
      )}

      {/* Empty state */}
      {attachments.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed rounded-lg">
          Chưa có tài liệu đính kèm
        </div>
      )}

      {/* Hidden file input for replace */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        className="hidden"
        disabled={!isEditable}
      />

      {/* Attachments list */}
      <div className="space-y-2">
        {attachments.map((attachment) => {
          const isReplacingThis = replacingId === attachment.id;
          const isDeletingThis = deletingId === attachment.id;

          return (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.fileSize)} • {new Date(attachment.uploadedAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              {/* Action buttons - using Button component for icon buttons */}
              <div className="flex items-center gap-1">
                {/* Download button - always available */}
                <a
                  href={attachmentsApi.getDownloadUrl(attachment)}
                  download={attachment.fileName}
                  className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  title="Tải xuống"
                >
                  <Download className="h-4 w-4" />
                </a>

                {/* Replace button - DRAFT and CHANGES_REQUESTED only */}
                {isEditable && (
                  <Button
                    variant="ghost"
                    size="xxs"
                    onClick={() => handleReplaceClick(attachment.id)}
                    disabled={!!replacingId || !!deletingId}
                    isLoading={isReplacingThis}
                    className="p-2 text-gray-600 hover:text-success-600 hover:bg-success-50"
                    title="Thay thế tài liệu"
                  >
                    {!isReplacingThis && <RefreshCw className="h-4 w-4" />}
                  </Button>
                )}

                {/* Delete button - DRAFT and CHANGES_REQUESTED only */}
                {isEditable && (
                  <Button
                    variant="ghost"
                    size="xxs"
                    onClick={() => handleDeleteClick(attachment.id, attachment.fileName)}
                    disabled={!!replacingId || !!deletingId}
                    isLoading={isDeletingThis}
                    className="p-2 text-gray-600 hover:text-error-600 hover:bg-error-50"
                    title="Xóa tài liệu"
                  >
                    {!isDeletingThis && <Trash2 className="h-4 w-4" />}
                  </Button>
                )}

                {/* Lock icon for non-editable states */}
                {!isEditable && (
                  <span
                    className="p-2 text-gray-400 cursor-help"
                    title="Không thể sửa sau khi nộp. Vui lòng liên hệ admin nếu cần sửa."
                  >
                    <Lock className="h-4 w-4" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Replace progress indicator - using Alert component */}
      {replacingId && (
        <Alert variant="info" className="text-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Đang thay thế tài liệu... {replaceProgress}%</span>
          </div>
          <div className="w-full bg-primary-200 rounded-full h-1.5 mt-2">
            <div
              className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${replaceProgress}%` }}
            />
          </div>
        </Alert>
      )}
    </div>
  );
}
