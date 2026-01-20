import { useState } from 'react';
import { CalendarDays, DollarSign, AlertCircle } from 'lucide-react';
import { Textarea } from '../ui/Textarea';
import { Input } from '../ui/Input';
import { Form1bData, FORM_1B_FIELDS } from '../../shared/types/form-1b';
import { AiFillAllButton, AiFillFieldButton } from '../ai-chat';

/**
 * Props for Form1bFields component
 */
export interface Form1bFieldsProps {
  /** Current form data */
  formData: Form1bData;
  /** Callback when a field value changes */
  onChange: (field: keyof Form1bData, value: string) => void;
  /** Validation errors by field key */
  errors?: Record<string, string>;
  /** Whether all fields should be disabled */
  disabled?: boolean;
  /** Proposal title for AI context */
  proposalTitle?: string;
  /** Whether to show AI fill buttons */
  showAiFill?: boolean;
}

/**
 * Form1bFields - Phiếu đề xuất đề tài NCKH (Mẫu 1b)
 *
 * Renders all 9 fields required for the proposal outline form:
 * - 6 textarea fields for content (urgency, objectives, content, results, application, efficiency)
 * - 2 date fields for timeline (start, end)
 * - 1 text field for budget
 *
 * @example
 * ```tsx
 * <Form1bFields
 *   formData={formData}
 *   onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
 *   errors={errors}
 * />
 * ```
 */
export function Form1bFields({
  formData,
  onChange,
  errors = {},
  disabled = false,
  proposalTitle = '',
  showAiFill = true,
}: Form1bFieldsProps) {
  const [aiError, setAiError] = useState<string | null>(null);

  // Handle AI fill for all fields
  const handleAiFillAll = (fields: Record<string, string>) => {
    setAiError(null);
    Object.entries(fields).forEach(([key, value]) => {
      if (key in formData) {
        onChange(key as keyof Form1bData, value);
      }
    });
  };

  // Handle AI fill for a specific field
  const handleAiFillField = (fieldKey: string) => (fields: Record<string, string>) => {
    setAiError(null);
    if (fields[fieldKey]) {
      onChange(fieldKey as keyof Form1bData, fields[fieldKey]);
    }
  };

  // Get current form data as existing data for AI
  const getExistingData = (): Record<string, string> => {
    const data: Record<string, string> = {};
    FORM_1B_FIELDS.forEach((field) => {
      if (formData[field.key]) {
        data[field.key] = formData[field.key];
      }
    });
    return data;
  };

  return (
    <div className="space-y-6">
      {/* AI Error Message */}
      {aiError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{aiError}</span>
        </div>
      )}

      {/* Section: Nội dung đề tài */}
      <div className="space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-800">
            Nội dung đề tài
          </h3>
          {showAiFill && !disabled && (
            <AiFillAllButton
              formType="form_1b"
              title={proposalTitle}
              existingData={getExistingData()}
              onFill={handleAiFillAll}
              onError={setAiError}
              size="sm"
              disabled={!proposalTitle.trim()}
            />
          )}
        </div>

        {/* Render textarea fields */}
        {FORM_1B_FIELDS.map((field) => (
          <div key={field.key} className="relative">
            <Textarea
              id={field.key}
              label={
                <div className="flex items-center justify-between w-full">
                  <span>{field.label}</span>
                  {showAiFill && !disabled && (
                    <AiFillFieldButton
                      formType="form_1b"
                      title={proposalTitle}
                      fieldKey={field.key}
                      existingData={getExistingData()}
                      onFill={handleAiFillField(field.key)}
                      onError={setAiError}
                      disabled={!proposalTitle.trim()}
                    />
                  )}
                </div>
              }
              required={field.required}
              rows={field.rows}
              placeholder={field.placeholder}
              helperText={field.helperText}
              value={formData[field.key]}
              onChange={(e) => onChange(field.key, e.target.value)}
              error={errors[field.key]}
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      {/* Section: Thời gian và Kinh phí */}
      <div className="space-y-5">
        <h3 className="text-base font-semibold text-gray-800 pb-2 border-b border-gray-200">
          Thời gian và Kinh phí
        </h3>

        {/* Timeline fields - side by side on larger screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="date"
            name="thoi_gian_bat_dau"
            label="Thời gian bắt đầu"
            required
            leftIcon={<CalendarDays className="h-4 w-4" />}
            value={formData.thoi_gian_bat_dau}
            onChange={(e) => onChange('thoi_gian_bat_dau', e.target.value)}
            error={errors.thoi_gian_bat_dau}
            disabled={disabled}
          />

          <Input
            type="date"
            name="thoi_gian_ket_thuc"
            label="Thời gian kết thúc"
            required
            leftIcon={<CalendarDays className="h-4 w-4" />}
            value={formData.thoi_gian_ket_thuc}
            onChange={(e) => onChange('thoi_gian_ket_thuc', e.target.value)}
            error={errors.thoi_gian_ket_thuc}
            disabled={disabled}
          />
        </div>

        {/* Budget field */}
        <Input
          type="text"
          name="nhu_cau_kinh_phi_du_kien"
          label="Nhu cầu kinh phí dự kiến"
          required
          leftIcon={<DollarSign className="h-4 w-4" />}
          placeholder="Ví dụ: 50.000.000 VNĐ"
          helperText="Nhập số tiền dự kiến cần cho đề tài"
          value={formData.nhu_cau_kinh_phi_du_kien}
          onChange={(e) => onChange('nhu_cau_kinh_phi_du_kien', e.target.value)}
          error={errors.nhu_cau_kinh_phi_du_kien}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
