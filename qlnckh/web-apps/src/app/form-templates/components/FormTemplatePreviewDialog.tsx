/**
 * Form Template Preview Dialog
 *
 * Displays a preview of a form template with its sections.
 */

import { X, FileText, CheckCircle, List } from 'lucide-react';
import { FormTemplate } from '../../../lib/api/form-templates';
import { Button } from '../../../components/ui/Button';

interface FormTemplatePreviewDialogProps {
  template: FormTemplate | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FormTemplatePreviewDialog({
  template,
  isOpen,
  onClose,
}: FormTemplatePreviewDialogProps) {
  if (!isOpen || !template) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2
                id="preview-dialog-title"
                className="text-lg font-semibold text-gray-900"
              >
                {template.name}
              </h2>
              <p className="text-sm text-gray-500">
                Mã: {template.code} | Phiên bản: {template.version}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Status */}
          <div className="mb-6 flex items-center gap-2">
            <span className="text-sm text-gray-600">Trạng thái:</span>
            {template.isActive ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <CheckCircle className="w-3 h-3" />
                Đang hoạt động
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                Không hoạt động
              </span>
            )}
          </div>

          {/* Description */}
          {template.description && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Mô tả</h3>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                {template.description}
              </p>
            </div>
          )}

          {/* Sections */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <List className="w-4 h-4" />
              Các phần của biểu mẫu ({template.sections?.length || 0})
            </h3>

            {template.sections && template.sections.length > 0 ? (
              <div className="space-y-2">
                {template.sections
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((section, index) => (
                    <div
                      key={section.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-md"
                    >
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {section.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          Component: {section.component}
                          {section.isRequired && (
                            <span className="ml-2 text-red-500">* Bắt buộc</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Biểu mẫu này chưa có phần nào được định nghĩa.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex-shrink-0">
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FormTemplatePreviewDialog;
