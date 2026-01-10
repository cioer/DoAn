import { useState, useRef } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { formTemplatesApi, FormTemplateImportResult } from '../../../lib/api/form-templates';

interface ImportWordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (result: FormTemplateImportResult) => void;
}

export function ImportWordDialog({ isOpen, onClose, onImportSuccess }: ImportWordDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.docx')) {
        setError('Chỉ chấp nhận file Word (.docx)');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.docx')) {
        setError('Chỉ chấp nhận file Word (.docx)');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await formTemplatesApi.importFromWord(selectedFile);
      onImportSuccess(result.data);
      handleClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Đã có lỗi xảy ra';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Import biểu mẫu từ Word">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Tải lên file Word (.docx) chứa các biểu mẫu để import vào hệ thống.
          File nên có cấu trúc với các mẫu bắt đầu bằng "Mẫu X:" hoặc "Mẫu XXa/b/c:".
        </p>

        {/* File upload area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            selectedFile
              ? 'border-green-300 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            onChange={handleFileSelect}
            className="hidden"
            id="word-file-input"
          />
          <label
            htmlFor="word-file-input"
            className="cursor-pointer block"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            {selectedFile ? (
              <div className="text-sm">
                <p className="font-medium text-green-700">{selectedFile.name}</p>
                <p className="text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="text-sm">
                <p className="text-gray-700 font-medium">
                  Kéo và thả file Word vào đây, hoặc nhấp để chọn
                </p>
                <p className="text-gray-500 mt-1">Chỉ chấp nhận file .docx</p>
              </div>
            )}
          </label>
        </div>

        {/* Error message */}
        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-1">Hướng dẫn định dạng file:</h4>
          <ul className="text-xs text-blue-700 list-disc list-inside space-y-1">
            <li>Mỗi biểu mẫu bắt đầu bằng "Mẫu X:" hoặc "Mẫu XXa/b/c:"</li>
            <li>Các phần (sections) đánh số I, II, III, IV,...</li>
            <li>Các trường trong ngoặc vuông [tên_truong]</li>
            <li>Hệ thống sẽ tự động tạo hoặc cập nhật biểu mẫu</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isUploading}
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            isLoading={isUploading}
            disabled={!selectedFile || isUploading}
          >
            Import
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
