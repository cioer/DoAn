import { Download, FileText } from 'lucide-react';
import { Attachment, attachmentsApi } from '../../lib/api/attachments';

/**
 * AttachmentList Component (Story 2.4)
 *
 * Displays list of uploaded files with:
 * - File name and size
 * - Upload date
 * - Download button
 * - Total size warning when > 50MB
 *
 * @param proposalId - Proposal ID
 * @param attachments - Array of attachments
 * @param totalSize - Total size of all attachments
 */
interface AttachmentListProps {
  proposalId: string;
  attachments: Attachment[];
  totalSize: number;
}

const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

export function AttachmentList({ proposalId, attachments, totalSize }: AttachmentListProps) {
  const formatFileSize = attachmentsApi.formatFileSize;
  const isOverLimit = totalSize > MAX_TOTAL_SIZE;

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

      {/* Empty state */}
      {attachments.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed rounded-lg">
          Chưa có tài liệu đính kèm
        </div>
      )}

      {/* Attachments list */}
      <div className="space-y-2">
        {attachments.map((attachment) => (
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

            {/* Download button */}
            <a
              href={attachmentsApi.getDownloadUrl(attachment)}
              download={attachment.fileName}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Tải xuống"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
