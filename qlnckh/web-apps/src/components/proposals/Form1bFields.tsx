import { CalendarDays, DollarSign } from 'lucide-react';
import { Textarea } from '../ui/Textarea';
import { Input } from '../ui/Input';
import { Form1bData, FORM_1B_FIELDS } from '../../shared/types/form-1b';

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
}: Form1bFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Section: Nội dung đề tài */}
      <div className="space-y-5">
        <h3 className="text-base font-semibold text-gray-800 pb-2 border-b border-gray-200">
          Nội dung đề tài
        </h3>

        {/* Render textarea fields */}
        {FORM_1B_FIELDS.map((field) => (
          <Textarea
            key={field.key}
            label={field.label}
            required={field.required}
            rows={field.rows}
            placeholder={field.placeholder}
            helperText={field.helperText}
            value={formData[field.key]}
            onChange={(e) => onChange(field.key, e.target.value)}
            error={errors[field.key]}
            disabled={disabled}
          />
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
