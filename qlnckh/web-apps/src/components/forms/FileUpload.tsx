import { useState, useRef, useCallback } from 'react';
import { Upload, File, X, AlertTriangle, FileText } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { attachmentsApi, Attachment } from '../../lib/api/attachments';
import { Alert, AlertActions, Button } from '../ui';
import { cn } from '../../lib/utils/cn';

/**
 * FileUpload Component - Modern Soft UI (Story 2.4)
 *
 * Features:
 * - Drag-drop support with visual feedback
 * - File picker with accept attribute
 * - Client-side file size validation (5MB per file)
 * - Progress bar during upload with gradient fill
 * - Error display with soft alerts
 * - Total size warning before upload (AC5 fix)
 * - Modern Soft UI styling with gradients and soft shadows
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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStoragePercentage = (): number => {
    return (currentTotalSize / MAX_TOTAL_SIZE) * 100;
  };

  const getStorageColor = (): 'success' | 'warning' | 'error' => {
    const pct = getStoragePercentage();
    if (pct >= 100) return 'error';
    if (pct >= 80) return 'warning';
    return 'success';
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
      setIsDragging(false);

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

    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  }, [disabled, uploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
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
    <div className="space-y-4">
      {/* Upload Zone - Modern Soft UI */}
      <button
        type="button"
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={disabled || uploading}
        aria-label={disabled ? 'Upload bị vô hiệu hóa' : 'Chọn file để tải lên'}
        className={cn(
          'group relative overflow-hidden rounded-2xl border-2 border-dashed p-8 w-full',
          'text-center cursor-pointer transition-[border-color,background-color,box-shadow,transform] duration-300',
          'shadow-soft hover:shadow-soft-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          // Disabled/Uploading state
          (disabled || uploading) && [
            'bg-gray-50/80 border-gray-200 cursor-not-allowed opacity-60',
          ],
          // Active states
          !disabled && !uploading && [
            isDragging
              ? 'border-primary-400 bg-primary-50/80 scale-[1.01] shadow-soft-lg'
              : 'bg-white border-gray-200 hover:border-primary-300 hover:bg-gradient-to-br hover:from-primary-50/50 hover:to-blue-50/50',
          ],
        )}
      >
        {/* Animated background gradient for hover state */}
        {!disabled && !uploading && !isDragging && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50/0 via-transparent to-blue-50/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || uploading}
        />

        {/* Icon with soft background */}
        <div className="relative mb-4 inline-flex">
          <div className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300',
            uploading || isDragging
              ? 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-soft scale-110'
              : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-primary-100 group-hover:to-blue-100 shadow-soft'
          )}>
            {uploading ? (
              <File className="w-8 h-8 text-white animate-pulse" />
            ) : (
              <Upload className={cn(
                'w-8 h-8 transition-colors duration-300',
                isDragging ? 'text-white' : 'text-gray-400 group-hover:text-primary-500'
              )} />
            )}
          </div>
          {/* Animated ring for dragging */}
          {isDragging && (
            <div className="absolute inset-0 rounded-2xl border-2 border-primary-400 animate-ping" />
          )}
        </div>

        {/* Content */}
        <div className="relative">
          {uploading ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">
                Đang tải lên…
              </p>
              <div className="max-w-xs mx-auto">
                <ProgressBar progress={progress} showPercentage />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className={cn(
                'text-sm font-semibold transition-colors duration-200',
                isDragging ? 'text-primary-700' : 'text-gray-700 group-hover:text-gray-900'
              )}>
                {disabled ? 'Upload bị vô hiệu hóa' : 'Kéo file vào đây hoặc click để chọn…'}
              </p>
              <p className="text-xs text-gray-500">
                PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (tối đa 5MB)
              </p>
            </div>
          )}
        </div>
      </button>

      {/* Storage indicator - Modern Soft UI */}
      {currentTotalSize > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-info-50 to-blue-50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-info-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                Dung lượng lưu trữ
              </span>
            </div>
            <span className={cn(
              'text-xs font-semibold',
              getStoragePercentage() >= 80 ? 'text-warning-600' : 'text-gray-500'
            )}>
              {formatFileSize(currentTotalSize)} / 50 MB
            </span>
          </div>
          <ProgressBar
            progress={getStoragePercentage()}
            color={getStorageColor()}
            size="sm"
          />
        </div>
      )}

      {/* Warning display (AC5: Approaching limit) */}
      {warning && (
        <Alert variant="warning" className="text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{warning}</span>
          </div>
          <AlertActions>
            <Button
              variant="ghost"
              size="xs"
              onClick={proceedWithWarning}
              disabled={uploading}
              className="text-warning-700 hover:text-warning-900 hover:bg-warning-50 font-semibold"
            >
              Tiếp tục
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={clearWarning}
              disabled={uploading}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertActions>
        </Alert>
      )}

      {/* Error display */}
      {error && (
        <Alert variant="error" className="text-sm">
          {error}
          <AlertActions>
            <Button
              variant="ghost"
              size="xs"
              onClick={clearError}
              disabled={uploading}
              className="text-error-600 hover:text-error-800 hover:bg-error-50 rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertActions>
        </Alert>
      )}
    </div>
  );
}
