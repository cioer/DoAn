/**
 * Form Template Selector Component
 *
 * Dropdown selector for FormEngine templates.
 * Groups templates by category for easier navigation.
 */

import React from 'react';
import type {
  FormTemplateType,
  FormEngineTemplate,
} from '../../shared/types/form-engine';
import { TEMPLATE_GROUPS, TEMPLATE_DESCRIPTIONS } from '../../shared/types/form-engine';

interface FormTemplateSelectorProps {
  value: FormTemplateType | '';
  onChange: (value: FormTemplateType) => void;
  templates?: FormEngineTemplate[];
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const FormTemplateSelector: React.FC<FormTemplateSelectorProps> = ({
  value,
  onChange,
  templates = [],
  disabled = false,
  error,
  className = '',
}) => {
  const isTemplateAvailable = (type: FormTemplateType): boolean => {
    if (templates.length === 0) return true;
    const template = templates.find((t) => t.type === type);
    return template?.available ?? false;
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Loại biểu mẫu <span className="text-red-500">*</span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FormTemplateType)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border rounded-lg text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
      >
        <option value="">-- Chọn loại biểu mẫu --</option>

        {/* Đề xuất & Đánh giá */}
        <optgroup label={TEMPLATE_GROUPS.proposal.label}>
          {TEMPLATE_GROUPS.proposal.templates.map((type) => (
            <option
              key={type}
              value={type}
              disabled={!isTemplateAvailable(type)}
            >
              {TEMPLATE_DESCRIPTIONS[type]}
              {!isTemplateAvailable(type) && ' (Không khả dụng)'}
            </option>
          ))}
        </optgroup>

        {/* Nghiệm thu */}
        <optgroup label={TEMPLATE_GROUPS.acceptance.label}>
          {TEMPLATE_GROUPS.acceptance.templates.map((type) => (
            <option
              key={type}
              value={type}
              disabled={!isTemplateAvailable(type)}
            >
              {TEMPLATE_DESCRIPTIONS[type]}
              {!isTemplateAvailable(type) && ' (Không khả dụng)'}
            </option>
          ))}
        </optgroup>

        {/* Khác */}
        <optgroup label={TEMPLATE_GROUPS.other.label}>
          {TEMPLATE_GROUPS.other.templates.map((type) => (
            <option
              key={type}
              value={type}
              disabled={!isTemplateAvailable(type)}
            >
              {TEMPLATE_DESCRIPTIONS[type]}
              {!isTemplateAvailable(type) && ' (Không khả dụng)'}
            </option>
          ))}
        </optgroup>
      </select>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default FormTemplateSelector;
