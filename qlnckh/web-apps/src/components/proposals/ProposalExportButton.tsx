/**
 * Proposal Export to PDF Component (GIANG_VIEN Feature)
 *
 * Allows proposal owners to export their proposals to PDF format.
 * Features:
 * - Clean, professional PDF output
 * - Include all form data
 * - Include attachments list
 * - Download with progress indicator
 * - Export options (summary, full, evaluation results)
 */

import { useState } from 'react';
import {
  Download,
  FileText,
  CheckCircle2,
  Loader2,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { Dialog, DialogBody, DialogHeader } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { apiClient } from '../../lib/auth/auth';

export interface ProposalExportButtonProps {
  proposalId: string;
  proposalCode: string;
  proposalTitle: string;
  formData: Record<string, any>;
  hasEvaluation?: boolean;
  onExportComplete?: (fileUrl: string) => void;
}

type ExportOption = 'summary' | 'full' | 'with_evaluation';

interface ExportConfig {
  id: ExportOption;
  title: string;
  description: string;
  icon: typeof FileText;
}

const exportOptions: ExportConfig[] = [
  {
    id: 'summary',
    title: 'Tóm tắt',
    description: 'Xuất thông tin cơ bản của đề tài',
    icon: FileText,
  },
  {
    id: 'full',
    title: 'Đầy đủ',
    description: 'Xuất toàn bộ nội dung đề tài',
    icon: FileCheck,
  },
  {
    id: 'with_evaluation',
    title: 'Có kết quả đánh giá',
    description: 'Bao gồm cả kết quả đánh giá của hội đồng',
    icon: FileCheck,
  },
];

/**
 * Main Export Button Component
 */
export function ProposalExportButton({
  proposalId,
  proposalCode,
  proposalTitle,
  formData,
  hasEvaluation = false,
  onExportComplete,
}: ProposalExportButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ExportOption>('summary');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [previewReady, setPreviewReady] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setPreviewReady(false);
    setExportError(null);

    try {
      // Simulate progress while fetching
      const progressInterval = setInterval(() => {
        setExportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Call the actual PDF export API
      const response = await apiClient.get(`/proposals/${proposalId}/export`, {
        responseType: 'blob',
      });

      clearInterval(progressInterval);
      setExportProgress(100);

      // Create download link from blob
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename: {code}_{timestamp}.pdf
      const timestamp = new Date().getTime();
      link.download = `${proposalCode}_${timestamp}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setPreviewReady(true);
      setIsExporting(false);

      // Notify parent
      onExportComplete?.(`/api/proposals/${proposalId}/export?type=${selectedOption}`);

      // Close dialog after showing success
      setTimeout(() => {
        setShowDialog(false);
        setPreviewReady(false);
      }, 1500);
    } catch (error: any) {
      setIsExporting(false);
      setExportProgress(0);

      // Parse error response
      let errorMessage = 'Không thể xuất PDF. Vui lòng thử lại.';
      if (error.response?.data) {
        try {
          const errorData = JSON.parse(
            new TextDecoder().decode(error.response.data)
          );
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // If parsing fails, use default message
        }
      }

      setExportError(errorMessage);

      // Auto-clear error after 3 seconds
      setTimeout(() => setExportError(null), 3000);
    }
  };

  const handleQuickExport = () => {
    setSelectedOption('summary');
    setShowDialog(true);
  };

  return (
    <>
      {/* Quick Export Button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handleQuickExport}
        leftIcon={<Download className="h-4 w-4" />}
      >
        Xuất PDF
      </Button>

      {/* Export Dialog */}
      <Dialog
        isOpen={showDialog}
        onClose={() => !isExporting && setShowDialog(false)}
        title="Xuất đề tài ra PDF"
        size="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDialog(false)}
              disabled={isExporting}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              isLoading={isExporting}
              disabled={previewReady}
              leftIcon={<Download className="h-4 w-4" />}
            >
              {isExporting ? 'Đang xuất...' : previewReady ? 'Đã xuất!' : 'Xuất PDF'}
            </Button>
          </div>
        }
      >
        <DialogHeader
          title="Xuất đề tài ra PDF"
          description="Chọn loại file PDF bạn muốn xuất"
        />
        <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Proposal Preview - Simplified */}
          <div className="rounded-lg bg-gray-50 p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">{proposalCode}</p>
                <h3 className="font-medium text-gray-900 truncate text-sm">{proposalTitle}</h3>
              </div>
              {hasEvaluation && (
                <Badge variant="success" size="sm" className="shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Đã đánh giá
                </Badge>
              )}
            </div>
          </div>

          {/* Export Options - Simplified cards */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Chọn loại xuất</h4>
            <div className="space-y-2">
              {exportOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedOption(option.id)}
                  disabled={option.id === 'with_evaluation' && !hasEvaluation}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all
                    ${
                      selectedOption === option.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                    ${(option.id === 'with_evaluation' && !hasEvaluation) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className={`rounded-lg p-2 ${selectedOption === option.id ? 'bg-blue-500' : 'bg-gray-100'}`}>
                    <option.icon className={`h-4 w-4 ${selectedOption === option.id ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium text-sm ${selectedOption === option.id ? 'text-blue-900' : 'text-gray-900'}`}>
                      {option.title}
                    </h3>
                    <p className={`text-xs ${selectedOption === option.id ? 'text-blue-700' : 'text-gray-500'}`}>
                      {option.description}
                    </p>
                  </div>
                  {selectedOption === option.id && (
                    <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
            {selectedOption === 'with_evaluation' && !hasEvaluation && (
              <p className="mt-2 text-xs text-amber-600">
                ⚠️ Đề tài này chưa có kết quả đánh giá
              </p>
            )}
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="rounded-lg bg-blue-50 p-3 border border-blue-100">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Đang xuất PDF...</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-medium text-blue-700">{exportProgress}%</span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {previewReady && (
            <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-100">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-emerald-500 p-1">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
                <p className="text-sm font-medium text-emerald-900">Xuất PDF thành công! File đang được tải xuống...</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {exportError && (
            <div className="rounded-lg bg-red-50 p-3 border border-red-100">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-red-500 p-1">
                  <AlertCircle className="h-3 w-3 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Xuất PDF thất bại!</p>
                  <p className="text-xs text-red-700">{exportError}</p>
                </div>
              </div>
            </div>
          )}
        </DialogBody>
      </Dialog>
    </>
  );
}

/**
 * Compact Export Button for List Views
 */
export function CompactExportButton({
  proposalId,
  onExport,
}: {
  proposalId: string;
  onExport?: (proposalId: string) => void;
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    onExport?.(proposalId);
    // Simulate export
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsExporting(false);
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
      title="Xuất PDF"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </button>
  );
}
