import { useState, useRef } from 'react';
import { Download, FileText, RefreshCw, Trash2, Lock, Loader2, File } from 'lucide-react';
import { Attachment, attachmentsApi } from '../../lib/api/attachments';
import { Alert, AlertActions, Button } from '../ui';
import { ProgressBar } from './ProgressBar';
import { cn } from '../../lib/utils/cn';

/**
 * AttachmentList Component - Modern Soft UI (Story 2.4, 2.5)
 *
 * Displays list of uploaded files with:
 * - File name and size with improved typography
 * - Upload date with calendar icon
 * - Download button with hover effect
 * - Replace button (DRAFT and CHANGES_REQUESTED only, Story 2.5)
 * - Delete button (DRAFT and CHANGES_REQUESTED only, Story 2.5)
 * - Total size warning when > 50MB
 * - Modern Soft UI styling with gradients and soft shadows
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

// File type icons with gradient colors
const getFileTypeColor = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const colorMap: Record<string, string> = {
    pdf: 'from-red-500 to-rose-600',
    doc: 'from-blue-500 to-indigo-600',
    docx: 'from-blue-500 to-indigo-600',
    xls: 'from-green-500 to-emerald-600',
    xlsx: 'from-green-500 to-emerald-600',
    jpg: 'from-amber-500 to-orange-600',
    jpeg: 'from-amber-500 to-orange-600',
    png: 'from-purple-500 to-violet-600',
  };
  return colorMap[ext] || 'from-gray-400 to-gray-500';
};

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
  const storagePercentage = (totalSize / MAX_TOTAL_SIZE) * 100;

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
      console.log('Attachment replaced successfully:', result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Thay thế tài liệu thất bại';
      setError(errorMessage);

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
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa "${fileName}"?`,
    );

    if (!confirmed) return;

    setDeletingId(attachmentId);
    setError(null);

    try {
      await attachmentsApi.delete(proposalId, attachmentId);
      onAttachmentChange?.();
      console.log('Attachment deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Xóa tài liệu thất bại';
      setError(errorMessage);

      if (errorMessage.includes('PROPOSAL_NOT_DRAFT')) {
        setError('Không thể sửa sau khi nộp. Vui lòng liên hệ admin nếu cần sửa.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with total size - Modern Soft UI */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-info-50 to-blue-50 flex items-center justify-center">
            <FileText className="w-4 h-4 text-info-600" />
          </div>
          <h3 className="font-semibold text-gray-800">Tài liệu đính kèm</h3>
          <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
            {attachments.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-medium',
            isOverLimit ? 'text-error-600' : storagePercentage >= 80 ? 'text-warning-600' : 'text-gray-500'
          )}>
            {formatFileSize(totalSize)} / 50 MB
          </span>
        </div>
      </div>

      {/* Storage progress bar */}
      {attachments.length > 0 && (
        <div className="bg-white rounded-xl p-3 shadow-soft border border-gray-100">
          <ProgressBar
            progress={storagePercentage}
            color={isOverLimit ? 'error' : storagePercentage >= 80 ? 'warning' : 'success'}
            size="sm"
          />
        </div>
      )}

      {/* Warning when over limit */}
      {isOverLimit && (
        <Alert variant="error" className="text-sm">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="flex-1">Tổng dung lượng đã vượt giới hạn (50MB/proposal)</span>
          </div>
        </Alert>
      )}

      {/* Error message */}
      {error && (
        <Alert variant="error" className="text-sm">
          {error.replace(/^[A-Z_]+:\s*/, '')}
          <AlertActions>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setError(null)}
              className="text-error-600 hover:text-error-800 hover:bg-error-50 rounded-lg"
            >
              Đóng
            </Button>
          </AlertActions>
        </Alert>
      )}

      {/* Empty state - Modern Soft UI */}
      {attachments.length === 0 && (
        <div className="text-center py-12 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-3">
            <File className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-500">Chưa có tài liệu đính kèm</p>
          <p className="text-xs text-gray-400 mt-1">Sử dụng phần tải lên để thêm tài liệu</p>
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

      {/* Attachments list - Modern Soft UI */}
      <div className="space-y-2">
        {attachments.map((attachment) => {
          const isReplacingThis = replacingId === attachment.id;
          const isDeletingThis = deletingId === attachment.id;
          const fileGradient = getFileTypeColor(attachment.fileName);

          return (
            <div
              key={attachment.id}
              className={cn(
                'group flex items-center justify-between p-4 rounded-xl border transition-all duration-200',
                'shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5',
                // Disabled state when replacing/deleting other
                (replacingId || deletingId) && !isReplacingThis && !isDeletingThis
                  ? 'opacity-50 pointer-events-none'
                  : 'bg-white border-gray-100 hover:border-gray-200'
              )}
            >
              {/* File icon with gradient background */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shadow-soft flex-shrink-0',
                  'bg-gradient-to-br',
                  fileGradient
                )}>
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-primary-600 transition-colors">
                    {attachment.fileName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-500">
                      {formatFileSize(attachment.fileSize)}
                    </p>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(attachment.uploadedAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {/* Download button - always available */}
                <a
                  href={attachmentsApi.getDownloadUrl(attachment)}
                  download={attachment.fileName}
                  className={cn(
                    'p-2.5 rounded-lg transition-all duration-200',
                    'text-gray-500 hover:text-primary-600 hover:bg-primary-50 hover:shadow-soft'
                  )}
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
                    className={cn(
                      'p-2.5 rounded-lg shadow-soft',
                      'text-gray-500 hover:text-success-600 hover:bg-success-50'
                    )}
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
                    className={cn(
                      'p-2.5 rounded-lg shadow-soft',
                      'text-gray-500 hover:text-error-600 hover:bg-error-50'
                    )}
                    title="Xóa tài liệu"
                  >
                    {!isDeletingThis && <Trash2 className="h-4 w-4" />}
                  </Button>
                )}

                {/* Lock icon for non-editable states */}
                {!isEditable && (
                  <span
                    className="p-2.5 text-gray-400 cursor-help rounded-lg hover:bg-gray-100 transition-colors"
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

      {/* Replace progress indicator - Modern Soft UI */}
      {replacingId && (
        <Alert variant="info" className="text-sm">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
            <span className="font-medium">Đang thay thế tài liệu...</span>
            <span className="text-primary-600 font-semibold ml-auto">
              {replaceProgress}%
            </span>
          </div>
          <ProgressBar progress={replaceProgress} color="primary" size="sm" />
        </Alert>
      )}
    </div>
  );
}
