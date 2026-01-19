/**
 * Generate Test Dialog Component
 *
 * Dialog for generating test documents with sample data.
 * Admin-only feature for testing Form Engine.
 */

import { useState, useCallback } from 'react';
import {
  formEngineApi,
  GenerateTestResult,
  downloadFile,
} from '../../../lib/api/form-engine';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { FORM_ID_DESCRIPTIONS } from '../../../shared/types/form-engine';

interface GenerateTestDialogProps {
  formId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

type GenerateStatus = 'idle' | 'generating' | 'success' | 'error';

export function GenerateTestDialog({
  formId,
  isOpen,
  onClose,
}: GenerateTestDialogProps) {
  const [isApproved, setIsApproved] = useState(true);
  const [status, setStatus] = useState<GenerateStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateTestResult | null>(null);
  const [isDownloading, setIsDownloading] = useState<'docx' | 'pdf' | null>(null);

  const resetState = useCallback(() => {
    setStatus('idle');
    setError(null);
    setResult(null);
    setIsApproved(true);
    setIsDownloading(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleGenerate = async () => {
    if (!formId) return;

    setStatus('generating');
    setError(null);
    setResult(null);

    try {
      const data = await formEngineApi.generateTest({
        formId,
        isApproved,
      });
      setResult(data);
      setStatus('success');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message ||
        err.message ||
        'Không thể tạo tài liệu test';
      setError(errorMessage);
      setStatus('error');
    }
  };

  /**
   * Sanitize file path to prevent path traversal attacks
   */
  const sanitizePath = (path: string): string | null => {
    // Remove leading ./ or ./output/
    let cleaned = path.replace(/^\.\/output\//, '').replace(/^\.\//, '');
    // Reject paths with .. or absolute paths
    if (cleaned.includes('..') || cleaned.startsWith('/')) {
      return null;
    }
    // Only allow alphanumeric, underscore, hyphen, dot, and forward slash
    if (!/^[\w\-./]+$/.test(cleaned)) {
      return null;
    }
    return cleaned;
  };

  const handleDownloadDocx = async () => {
    if (!result?.docx_path) return;

    setIsDownloading('docx');
    try {
      // Always construct URL from path (server URLs may contain localhost)
      const sanitized = sanitizePath(result.docx_path);
      if (!sanitized) {
        throw new Error('Invalid file path');
      }
      const url = `/api/form-engine/files/${encodeURIComponent(sanitized)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const fileName = `${formId}_test_${new Date().toISOString().split('T')[0]}.docx`;
      downloadFile(blob, fileName);
    } catch (err) {
      setError('Không thể tải file DOCX');
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!result?.pdf_path) return;

    setIsDownloading('pdf');
    try {
      // Always construct URL from path (server URLs may contain localhost)
      const sanitized = sanitizePath(result.pdf_path);
      if (!sanitized) {
        throw new Error('Invalid file path');
      }
      const url = `/api/form-engine/files/${encodeURIComponent(sanitized)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const fileName = `${formId}_test_${new Date().toISOString().split('T')[0]}.pdf`;
      downloadFile(blob, fileName);
    } catch (err) {
      setError('Không thể tải file PDF');
    } finally {
      setIsDownloading(null);
    }
  };

  if (!isOpen) return null;

  const formDescription = formId
    ? FORM_ID_DESCRIPTIONS[formId] || `Form ${formId.toUpperCase()}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Generate Test Document
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500">Form ID</div>
          <div className="font-medium text-gray-900">
            {formId?.toUpperCase()} - {formDescription}
          </div>
        </div>

        {/* Approval status selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái
          </label>
          <select
            value={isApproved ? 'approved' : 'rejected'}
            onChange={(e) => setIsApproved(e.target.value === 'approved')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={status === 'generating'}
          >
            <option value="approved">Đạt</option>
            <option value="rejected">Không đạt</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Chọn trạng thái để test checkbox Đạt/Không đạt trong biểu mẫu
          </p>
        </div>

        {/* Error message */}
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Success result */}
        {status === 'success' && result && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 mb-3">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="font-medium">Đã tạo tài liệu thành công!</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadDocx}
                disabled={isDownloading !== null}
                className="flex-1"
              >
                {isDownloading === 'docx' ? (
                  <span className="inline-block animate-spin mr-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  </span>
                ) : (
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                )}
                Download DOCX
              </Button>

              {result.pdf_path && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading !== null}
                  className="flex-1"
                >
                  {isDownloading === 'pdf' ? (
                    <span className="inline-block animate-spin mr-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    </span>
                  ) : (
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  )}
                  Download PDF
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleClose}>
            Đóng
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleGenerate}
            disabled={status === 'generating'}
          >
            {status === 'generating' ? (
              <>
                <span className="inline-block animate-spin mr-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                </span>
                Đang tạo...
              </>
            ) : status === 'success' ? (
              'Tạo lại'
            ) : (
              'Generate'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
