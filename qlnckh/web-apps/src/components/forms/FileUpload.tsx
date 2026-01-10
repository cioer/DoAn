import { useState, useRef, useCallback } from 'react';
import { Upload, File, X, AlertTriangle } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { attachmentsApi, Attachment } from '../../lib/api/attachments';
import { Alert, AlertActions, Button } from '../ui';

/**
 * FileUpload Component (Story 2.4)
 *
 * Features:
 * - Drag-drop support
 * - File picker with accept attribute
 * - Client-side file size validation (5MB per file)
 * - Progress bar during upload
 * - Error display (timeout, validation errors)
 * - Total size warning before upload (AC5 fix)
 *
 * @param proposalId - Proposal ID
 * @param onUploadSuccess - Callback when upload succeeds
 * @param disabled - Disable upload (e.g., when proposal not in DRAFT)
 * @param currentTotalSize - Current total size of all attachments (bytes)
 */
interface FileUploadProps {
  proposalId: string;
  onUploadSuccess: (attachment: Attachment) => void;
  disabled?: boolean;
  currentTotalSize?: number; // For AC5: Total size validation
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];

export function FileUpload({
  proposalId,
  onUploadSuccess,
  disabled,
  currentTotalSize = 0
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileSelect = useCallback(
    async (file: File, skipWarning: boolean = false) => {
      setError(null);

      // Client-side validation: file size
      if (file.size > MAX_FILE_SIZE) {
        setError('File quá 5MB. Vui lòng nén hoặc chia nhỏ.');
        return;
      }

      // Client-side validation: file type
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError('Định dạng file không được hỗ trợ.');
        return;
      }

      // AC5: Check total size BEFORE upload (Story 2.4 fix)
      const newTotal = currentTotalSize + file.size;
      if (newTotal > MAX_TOTAL_SIZE) {
        setError(`Tổng dung lượng sẽ vượt giới hạn (50MB/proposal). Hiện tại: ${formatFileSize(currentTotalSize)}, file mới: ${formatFileSize(file.size)}`);
        return;
      }

      // Show warning if approaching limit (> 80% of 50MB)
      if (!skipWarning && newTotal > MAX_TOTAL_SIZE * 0.8) {
        setWarning(`Tổng dung lượng sau khi upload sẽ là ${formatFileSize(newTotal)} / 50 MB.`);
        pendingFileRef.current = file;
        return;
      }

      // Clear warning and proceed
      setWarning(null);
      pendingFileRef.current = null;

      setUploading(true);
      setProgress(0);

      try {
        const result = await attachmentsApi.upload(proposalId, file, {
          onProgress: (p) => setProgress(p),
          timeout: 30000, // 30 seconds
        });

        onUploadSuccess(result);
        setProgress(0);
      } catch (err) {
        const error = err as Error;
        if (error.message.startsWith('TIMEOUT')) {
          setError('Upload quá hạn. Vui lòng thử lại.');
        } else if (error.message.startsWith('FILE_TOO_LARGE')) {
          setError('File quá 5MB. Vui lòng nén hoặc chia nhỏ.');
        } else if (error.message.startsWith('INVALID_FILE_TYPE')) {
          setError('Định dạng file không được hỗ trợ.');
        } else if (error.message.startsWith('NETWORK_ERROR')) {
          setError('Lỗi mạng. Vui lòng kiểm tra kết nối và thử lại.');
        } else {
          setError(error.message || 'Upload thất bại.');
        }
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [proposalId, onUploadSuccess, currentTotalSize],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled || uploading) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [disabled, uploading, handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleClick = useCallback(() => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, uploading]);

  const clearError = useCallback(() => setError(null), []);
  const clearWarning = useCallback(() => {
    setWarning(null);
    pendingFileRef.current = null;
  }, []);

  const proceedWithWarning = useCallback(() => {
    if (pendingFileRef.current) {
      handleFileSelect(pendingFileRef.current, true);
    }
  }, [handleFileSelect]);

  return (
    <div className="space-y-3">
      {/* Upload zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${disabled || uploading
            ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
            : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || uploading}
        />

        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <>
              <div className="animate-pulse">
                <File className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">Đang tải lên...</p>
              <div className="w-full max-w-xs mt-2">
                <ProgressBar progress={progress} />
                <p className="text-xs text-gray-500 mt-1">{progress}%</p>
              </div>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-600">
                {disabled ? 'Upload bị vô hiệu' : 'Kéo file vào đây hoặc click để chọn'}
              </p>
              <p className="text-xs text-gray-500">
                PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (tối đa 5MB)
              </p>
              {currentTotalSize > 0 && (
                <p className="text-xs text-gray-500">
                  Đã dùng: {formatFileSize(currentTotalSize)} / 50 MB
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Warning display (AC5: Approaching limit) - using Alert component */}
      {warning && (
        <Alert variant="warning" className="text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{warning}</span>
          </div>
          <AlertActions>
            <Button
              variant="ghost"
              size="xxs"
              onClick={proceedWithWarning}
              disabled={uploading}
              className="text-warning-700 hover:text-warning-900 font-medium text-xs"
            >
              Tiếp tục
            </Button>
            <Button
              variant="ghost"
              size="xxs"
              onClick={clearWarning}
              disabled={uploading}
              className="text-warning-600 hover:text-warning-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertActions>
        </Alert>
      )}

      {/* Error display - using Alert component */}
      {error && (
        <Alert variant="error" className="text-sm">
          {error}
          <AlertActions>
            <Button
              variant="ghost"
              size="xxs"
              onClick={clearError}
              disabled={uploading}
              className="text-error-600 hover:text-error-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertActions>
        </Alert>
      )}
    </div>
  );
}
