/**
 * Export PDF Button Component (Story 5.6)
 *
 * Button for exporting finalized evaluation to PDF.
 * Features:
 * - Shows "Xuất PDF đánh giá" text
 * - Disabled when evaluation.state ≠ FINALIZED
 * - Loading state: "⏳ Đang tạo..."
 * - Success state: "✅ Đã xuất" (temporarily)
 * - Error state: "⚠️ Thất bại"
 * - Handles download trigger
 *
 * Story 5.6: AC1 - PDF Export Button
 * Story 5.6: AC3 - PDF Download
 */

import { useState } from 'react';
import { Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Alert } from '../ui';

export type ExportButtonState = 'idle' | 'loading' | 'success' | 'error';

export interface ExportPdfButtonProps {
  proposalId: string;
  isFinalized: boolean;
  proposalCode?: string;
  onExportComplete?: () => void;
  className?: string;
}

/**
 * Download blob helper
 * Triggers browser download for blob data
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename: {code}_evaluation_{timestamp}.pdf
 */
function generateFilename(proposalCode?: string): string {
  const code = proposalCode || 'proposal';
  const timestamp = new Date().getTime();
  return `${code}_evaluation_${timestamp}.pdf`;
}

/**
 * Export PDF Button Component (Story 5.6)
 */
export function ExportPdfButton({
  proposalId,
  isFinalized,
  proposalCode,
  onExportComplete,
  className = '',
}: ExportPdfButtonProps) {
  const [exportState, setExportState] = useState<ExportButtonState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Handle export action (Story 5.6: AC3)
   */
  const handleExport = async () => {
    if (exportState === 'loading' || !isFinalized) {
      return;
    }

    setExportState('loading');
    setErrorMessage(null);

    try {
      // Import apiClient dynamically to avoid circular dependencies
      const { apiClient } = await import('../../lib/auth/auth');

      const response = await apiClient.get(`/proposals/${proposalId}/evaluation-pdf`, {
        responseType: 'blob',
      });

      // Trigger download
      downloadBlob(response.data, generateFilename(proposalCode));

      setExportState('success');
      onExportComplete?.();

      // Reset to idle after 3 seconds
      setTimeout(() => setExportState('idle'), 3000);
    } catch (err) {
      const error = err as Error & { response?: { data?: { error?: { message?: string } } } };
      setErrorMessage(
        error.response?.data?.error?.message ||
          error.message ||
          'Không thể xuất PDF. Vui lòng thử lại.',
      );
      setExportState('error');

      // Reset to idle after 3 seconds
      setTimeout(() => setExportState('idle'), 3000);
    }
  };

  /**
   * Get button text based on state
   */
  const getButtonText = (): string => {
    switch (exportState) {
      case 'loading':
        return '⏳ Đang tạo...';
      case 'success':
        return '✅ Đã xuất';
      case 'error':
        return '⚠️ Thất bại';
      default:
        return 'Xuất PDF đánh giá';
    }
  };

  /**
   * Get button icon based on state
   */
  const getButtonIcon = (): React.ReactNode => {
    switch (exportState) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant={isFinalized ? 'primary' : 'secondary'}
        size="sm"
        onClick={handleExport}
        disabled={!isFinalized || exportState === 'loading'}
        isLoading={exportState === 'loading'}
        leftIcon={getButtonIcon()}
        className={isFinalized ? '' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
      >
        {getButtonText()}
      </Button>

      {/* Error Message - using Alert component */}
      {errorMessage && exportState === 'error' && (
        <Alert variant="error" className="text-xs text-right max-w-xs py-1 px-2">
          {errorMessage}
        </Alert>
      )}
    </div>
  );
}
