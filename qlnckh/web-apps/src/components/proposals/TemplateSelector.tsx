import { FormTemplate } from '../../lib/api/form-templates';

interface TemplateSelectorProps {
  templates: FormTemplate[];
  selectedId?: string;
  onSelect: (templateId: string) => void;
  disabled?: boolean;
  error?: string;
}

/**
 * TemplateSelector Component
 *
 * Dropdown for selecting a form template.
 * Shows template description when selected.
 */
export function TemplateSelector({
  templates,
  selectedId,
  onSelect,
  disabled = false,
  error,
}: TemplateSelectorProps) {
  const selectedTemplate = templates.find((t) => t.id === selectedId);

  const selectClasses = `
    w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1
    disabled:bg-gray-100 disabled:cursor-not-allowed
  `.trim() + (error
    ? ' border-red-500 focus:ring-red-500 focus:border-red-500'
    : ' border-gray-300 focus:ring-blue-500 focus:border-blue-500'
  );

  return (
    <div className="space-y-2">
      <label htmlFor="template-select" className="block text-sm font-medium text-gray-700">
        Mẫu đề tài <span className="text-red-500">*</span>
      </label>

      <select
        id="template-select"
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled}
        className={selectClasses}
      >
        <option value="">-- Chọn mẫu đề tài --</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name} {template.version && `(v${template.version})`}
          </option>
        ))}
      </select>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {selectedTemplate && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">{selectedTemplate.description || 'Không có mô tả'}</p>
          {selectedTemplate.sections.length > 0 && (
            <p className="text-xs text-blue-600 mt-1">
              {selectedTemplate.sections.length} phần: {selectedTemplate.sections.map(s => s.title).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
