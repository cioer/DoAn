import { useState, useRef } from 'react';
import { Download, FileText, RefreshCw, Trash2, Lock, Loader2 } from 'lucide-react';
import { Attachment, attachmentsApi } from '../../lib/api/attachments';

/**
 * AttachmentList Component (Story 2.4, 2.5)
 *
 * Displays list of uploaded files with:
 * - File name and size
 * - Upload date
 * - Download button
 * - Replace button (DRAFT only, Story 2.5)
 * - Delete button (DRAFT only, Story 2.5)
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
        <span className={`text-sm ${isOverLimit ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
          {formatFileSize(totalSize)} / 50 MB
        </span>
      </div>

      {/* Warning when over limit */}
      {isOverLimit && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded text-sm flex items-start gap-2">
          <span>⚠️</span>
          <span>Tổng dung lượng đã vượt giới hạn (50MB/proposal)</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm flex items-start gap-2">
          <span>❌</span>
          <span>{error.replace(/^[A-Z_]+:\s*/, '')}</span>
        </div>
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
        disabled={!isDraft}
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

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {/* Download button - always available */}
                <a
                  href={attachmentsApi.getDownloadUrl(attachment)}
                  download={attachment.fileName}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Tải xuống"
                >
                  <Download className="h-4 w-4" />
                </a>

                {/* Replace button - DRAFT only */}
                {isDraft && (
                  <button
                    onClick={() => handleReplaceClick(attachment.id)}
                    disabled={!!replacingId || !!deletingId}
                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Thay thế tài liệu"
                  >
                    {isReplacingThis ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </button>
                )}

                {/* Delete button - DRAFT only */}
                {isDraft && (
                  <button
                    onClick={() => handleDeleteClick(attachment.id, attachment.fileName)}
                    disabled={!!replacingId || !!deletingId}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Xóa tài liệu"
                  >
                    {isDeletingThis ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}

                {/* Lock icon for non-DRAFT */}
                {!isDraft && (
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

      {/* Replace progress indicator */}
      {replacingId && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded text-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Đang thay thế tài liệu... {replaceProgress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${replaceProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
