import { FormTemplate, FormSection } from '../../lib/api/form-templates';

interface ProposalFormProps {
  template: FormTemplate | null;
  formData: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

/**
 * ProposalForm Component
 *
 * Dynamic form that renders sections based on the selected template.
 * Updated to match backend DTO format (sectionId, label, isRequired, displayOrder)
 *
 * Note: Backend provides section metadata but not field definitions.
 * This simplified version renders a textarea for each section.
 */
export function ProposalForm({
  template,
  formData,
  onChange,
  errors = {},
  disabled = false,
}: ProposalFormProps) {
  if (!template) {
    return (
      <div className="text-center py-12 text-gray-500">
        Vui lòng chọn mẫu đề tài để bắt đầu
      </div>
    );
  }

  // Render a text area for each section (E2E friendly)
  const renderSectionInput = (section: FormSection) => {
    const value = formData[section.sectionId] as string || '';
    const fieldError = errors[section.sectionId];
    const fieldClasses = `
      w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1
      disabled:bg-gray-100 disabled:cursor-not-allowed
      ${fieldError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}
    `;

    return (
      <div key={section.id} className="space-y-2">
        <label htmlFor={section.sectionId} className="block text-sm font-medium text-gray-700">
          {section.label}
          {section.isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          id={section.sectionId}
          value={value}
          onChange={(e) => onChange(section.sectionId, e.target.value)}
          disabled={disabled}
          placeholder={`Nhập nội dung cho ${section.label.toLowerCase()}`}
          rows={3}
          className={fieldClasses}
        />
        {fieldError && <p className="text-sm text-red-600">{fieldError}</p>}
        <p className="text-xs text-gray-400">Section ID: {section.sectionId}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {template.sections.map((section) => (
        <div
          key={section.id}
          className="bg-white border border-gray-200 rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {section.label}
            {section.isRequired && <span className="text-red-500 ml-1">*</span>}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Section ID: {section.sectionId} • Order: {section.displayOrder}
          </p>
          <div className="space-y-4">
            {renderSectionInput(section)}
          </div>
        </div>
      ))}
    </div>
  );
}
