import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  FileText,
} from 'lucide-react';
import { importApi, ImportEntityType, ImportResult, ImportStatus } from '../../../lib/api/import';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';

/**
 * Import Page (Admin Only)
 *
 * Story 10.1: Import Excel (Users, Proposals)
 *
 * Features:
 * - File upload (.xlsx, .xls)
 * - Entity type selector (Users/Proposals)
 * - Template download button
 * - Import progress indicator
 * - Import report display
 */
export default function ImportPage() {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [entityType, setEntityType] = useState<ImportEntityType>(ImportEntityType.USERS);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);

  // Load import status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const status = await importApi.getStatus();
      setImportStatus(status);
    } catch (err) {
      console.error('Failed to load import status:', err);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file extension
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      setError('File không hợp lệ. Chỉ chấp nhận file Excel (.xlsx, .xls)');
      setSelectedFile(null);
      return;
    }

    // Validate file size (10MB max)
    const maxSize = importStatus?.maxFileSize || 10485760; // 10MB
    if (file.size > maxSize) {
      setError(`File quá lớn. Kích thước tối đa: ${Math.round(maxSize / 1024 / 1024)}MB`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError('');
    setImportResult(null);
  };

  // Handle template download
  const handleDownloadTemplate = async () => {
    try {
      const blob = await importApi.downloadTemplate(entityType);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entityType}-template.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to download template:', err);
      setError('Không thể tải xuống template. Vui lòng thử lại.');
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!selectedFile) {
      setError('Vui lòng chọn file để import.');
      return;
    }

    setIsImporting(true);
    setError('');
    setImportResult(null);

    try {
      let result: ImportResult;

      if (entityType === ImportEntityType.USERS) {
        result = await importApi.importUsers(selectedFile);
      } else {
        result = await importApi.importProposals(selectedFile);
      }

      setImportResult(result);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
    } catch (err: any) {
      console.error('Import failed:', err);
      const errorMessage = err.response?.data?.error?.message || err.message || 'Import thất bại. Vui lòng thử lại.';
      setError(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Upload className="w-7 h-7" />
            Import dữ liệu từ Excel
          </h1>
          <p className="text-gray-600 mt-1">
            Import người dùng hoặc đề tài từ file Excel. Chỉ ADMIN mới có thể thực hiện.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Import Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {/* Entity Type Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại dữ liệu
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setEntityType(ImportEntityType.USERS);
                  setImportResult(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  entityType === ImportEntityType.USERS
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">Người dùng</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntityType(ImportEntityType.PROPOSALS);
                  setImportResult(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  entityType === ImportEntityType.PROPOSALS
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">Đề tài</span>
              </button>
            </div>
          </div>

          {/* Template Download */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Tải xuống template</p>
                  <p className="text-xs text-blue-600">
                    Download file mẫu để điền dữ liệu {entityType === ImportEntityType.USERS ? 'người dùng' : 'đề tài'}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={handleDownloadTemplate}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Tải mẫu
              </Button>
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn file Excel <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                {selectedFile ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Kéo thả file vào đây hoặc <span className="text-blue-600 font-medium">browse</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Chấp nhận file .xlsx, .xls (tối đa {importStatus ? formatFileSize(importStatus.maxFileSize) : '10MB'})
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Import Button */}
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleImport}
              isLoading={isImporting}
              disabled={!selectedFile}
              leftIcon={<Upload className="h-4 w-4" />}
            >
              {isImporting ? 'Đang import...' : 'Thực hiện Import'}
            </Button>
          </div>
        </div>

        {/* Import Result */}
        {importResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Kết quả Import
            </h2>

            {/* Summary */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{importResult.total}</p>
                <p className="text-sm text-blue-700">Tổng số dòng</p>
              </div>
              <div className="flex-1 bg-green-50 rounded-lg p-4 text-center">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                <p className="text-sm text-green-700">Thành công</p>
              </div>
              <div className="flex-1 bg-red-50 rounded-lg p-4 text-center">
                <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                <p className="text-sm text-red-700">Thất bại</p>
              </div>
            </div>

            {/* Processing Time */}
            <div className="text-sm text-gray-600 mb-4">
              Thời gian xử lý: <span className="font-medium">{(importResult.duration / 1000).toFixed(2)}s</span>
            </div>

            {/* Error Details */}
            {importResult.failed > 0 && importResult.errors.length > 0 && (
              <div className="border border-red-200 rounded-lg p-4">
                <p className="font-medium text-red-800 mb-3 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Chi tiết lỗi ({importResult.errors.length}):
                </p>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Dòng</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Lỗi</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Thông tin</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {importResult.errors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-red-50">
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            {err.lineNumber}
                          </td>
                          <td className="px-4 py-2 text-sm text-red-600">{err.message}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">
                            {JSON.stringify(err.row)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Success Message */}
            {importResult.failed === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-medium">
                  Import thành công! {importResult.success}/{importResult.total} dòng được thêm vào.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
