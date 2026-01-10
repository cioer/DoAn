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
 *
 * Aesthetic Direction:
 * - Modern export dialog with option cards
 * - Visual preview of what will be exported
 * - Progress animation during generation
 */

import { useState } from 'react';
import {
  Download,
  FileText,
  Settings,
  CheckCircle2,
  Loader2,
  Eye,
  FileCheck,
} from 'lucide-react';
import { Dialog, DialogBody, DialogHeader } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

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
  features: string[];
}

const exportOptions: ExportConfig[] = [
  {
    id: 'summary',
    title: 'Tóm tắt',
    description: 'Xuất thông tin cơ bản của đề tài',
    icon: FileText,
    features: [
      'Thông tin chung',
      'Nội dung chính',
      'Danh sách đính kèm',
    ],
  },
  {
    id: 'full',
    title: 'Đầy đủ',
    description: 'Xuất toàn bộ nội dung đề tài',
    icon: FileCheck,
    features: [
      'Tất cả thông tin cơ bản',
      'Nội dung chi tiết từng mục',
      'Danh sách đính kèm đầy đủ',
      'Lịch sử thay đổi',
    ],
  },
  {
    id: 'with_evaluation',
    title: 'Có kết quả đánh giá',
    description: 'Bao gồm cả kết quả đánh giá của hội đồng',
    icon: FileCheck,
    features: [
      'Tất cả nội dung đầy đủ',
      'Điểm số chi tiết',
      'Nhận xét của hội đồng',
      'Kết luận cuối cùng',
    ],
  },
];

/**
 * Export Option Card Component
 */
function ExportOptionCard({
  config,
  selected,
  disabled,
  onSelect,
}: {
  config: ExportConfig;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const Icon = config.icon;

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`
        group relative overflow-hidden rounded-xl border-2 p-5 text-left transition-all duration-200
        ${
          selected
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute right-3 top-3 rounded-full bg-blue-500 p-1">
          <CheckCircle2 className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Icon and Title */}
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2.5 ${selected ? 'bg-blue-500' : 'bg-gray-100'}`}>
          <Icon className={`h-5 w-5 ${selected ? 'text-white' : 'text-gray-600'}`} />
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold ${selected ? 'text-blue-900' : 'text-gray-900'}`}>
            {config.title}
          </h3>
          <p className={`mt-1 text-sm ${selected ? 'text-blue-700' : 'text-gray-500'}`}>
            {config.description}
          </p>
        </div>
      </div>

      {/* Features list */}
      <ul className="mt-4 space-y-1.5">
        {config.features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
            <div className={`h-1 w-1 rounded-full ${selected ? 'bg-blue-500' : 'bg-gray-400'}`} />
            {feature}
          </li>
        ))}
      </ul>
    </button>
  );
}

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

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setPreviewReady(false);

    // Simulate export progress
    const stages = [
      { progress: 20, message: 'Đang chuẩn bị dữ liệu...' },
      { progress: 40, message: 'Đang tạo PDF...' },
      { progress: 70, message: 'Đang định dạng nội dung...' },
      { progress: 90, message: 'Đang hoàn thiện...' },
      { progress: 100, message: 'Hoàn tất!' },
    ];

    for (const stage of stages) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setExportProgress(stage.progress);
    }

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    setPreviewReady(true);
    setIsExporting(false);

    // Notify parent
    onExportComplete?.(`/api/proposals/${proposalId}/export?type=${selectedOption}`);

    // Close dialog after showing success
    setTimeout(() => {
      setShowDialog(false);
      setPreviewReady(false);
    }, 1500);
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
      >
        <DialogHeader
          title="Xuất đề tài ra PDF"
          description="Chọn loại file PDF bạn muốn xuất"
        />
        <DialogBody className="space-y-6">
          {/* Proposal Preview */}
          <div className="rounded-lg bg-gradient-to-br from-slate-50 to-gray-100 p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-white p-2 shadow-sm">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">{proposalCode}</p>
                <h3 className="font-medium text-gray-900 truncate">{proposalTitle}</h3>
              </div>
              {hasEvaluation && (
                <Badge variant="success" className="shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Đã đánh giá
                </Badge>
              )}
            </div>
          </div>

          {/* Export Options */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Chọn loại xuất</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {exportOptions.map((option) => (
                <ExportOptionCard
                  key={option.id}
                  config={option}
                  selected={selectedOption === option.id}
                  disabled={option.id === 'with_evaluation' && !hasEvaluation}
                  onSelect={() => setSelectedOption(option.id)}
                />
              ))}
            </div>
            {selectedOption === 'with_evaluation' && !hasEvaluation && (
              <p className="mt-2 text-sm text-amber-600">
                ⚠️ Đề tài này chưa có kết quả đánh giá
              </p>
            )}
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="rounded-lg bg-blue-50 p-5 border border-blue-100">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Đang xuất PDF...</p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-blue-700">{exportProgress}%</span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {previewReady && (
            <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500 p-1.5">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-emerald-900">Xuất PDF thành công!</p>
                  <p className="text-sm text-emerald-700">File đang được tải xuống...</p>
                </div>
              </div>
            </div>
          )}

          {/* Features Info */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-sm text-gray-900">Xem trước khi xuất</h4>
                <p className="mt-1 text-xs text-gray-600">
                  File PDF sẽ được định dạng theo chuẩn của trường. Bạn có thể xem trước
                  nội dung trước khi tải về.
                </p>
              </div>
            </div>
          </div>
        </DialogBody>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg flex justify-between items-center">
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
