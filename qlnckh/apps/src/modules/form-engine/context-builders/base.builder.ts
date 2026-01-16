/**
 * Base Context Builder
 *
 * Common utilities and types for all context builders.
 * Provides date formatting, checkbox helpers, and shared context fields.
 */

/**
 * Checkbox constants - Use ASCII [x]/[ ] to avoid font issues
 */
export const CHECKBOX_CHECKED = '[x]';
export const CHECKBOX_UNCHECKED = '[ ]';

/**
 * Input data for context building
 * Matches ProposalDataForDocx from DocxService
 */
export interface ProposalContextInput {
  // Project info
  code: string;
  title: string;
  ownerName: string;
  ownerEmail: string;
  facultyName: string;
  facultyCode: string;
  state: string;
  createdAt: string;
  actualStartDate?: string | null;
  completedDate?: string | null;

  // Council info
  councilName?: string;
  councilType?: string;
  councilSecretary?: string;
  councilChair?: string;
  councilMembers?: string;

  // Evaluation info
  evaluationScientificContentScore?: number;
  evaluationScientificContentComments?: string;
  evaluationResearchMethodScore?: number;
  evaluationResearchMethodComments?: string;
  evaluationFeasibilityScore?: number;
  evaluationFeasibilityComments?: string;
  evaluationBudgetScore?: number;
  evaluationBudgetComments?: string;
  evaluationOtherComments?: string;
  evaluationConclusion?: string;

  // Acceptance info
  acceptanceResults?: string;
  acceptanceProducts?: string;
  acceptanceDate?: string;

  // Handover info
  handoverDate?: string;
  handoverChecklist?: string;

  // Timeline
  startDate?: string;
  endDate?: string;
  duration?: string;

  // Budget
  budgetTotal?: string;
  budgetApproved?: string;
  budgetUsed?: string;
  budgetRemaining?: string;

  // Form-specific data (from proposal.formData)
  formData?: Record<string, unknown>;

  // Formatting helpers
  currentDate?: string;
  currentYear?: string;
  currentMonth?: string;
  currentTime?: string;
}

/**
 * Get current date components
 */
export function getCurrentDateComponents(): {
  ngay: string;
  thang: string;
  nam: string;
  currentDate: string;
  currentYear: string;
  currentMonth: string;
  currentTime: string;
} {
  const now = new Date();
  return {
    ngay: now.getDate().toString().padStart(2, '0'),
    thang: (now.getMonth() + 1).toString().padStart(2, '0'),
    nam: now.getFullYear().toString(),
    currentDate: now.toLocaleDateString('vi-VN'),
    currentYear: now.getFullYear().toString(),
    currentMonth: (now.getMonth() + 1).toString(),
    currentTime: now.toLocaleTimeString('vi-VN'),
  };
}

/**
 * Format date line with non-breaking spaces
 * Prevents line wrapping in "Nam Định, ngày 20 tháng 01 năm 2024"
 */
export function getDateLine(
  city = 'Nam Định',
  day?: string,
  month?: string,
  year?: string,
): string {
  const now = new Date();
  const d = day || now.getDate().toString().padStart(2, '0');
  const m = month || (now.getMonth() + 1).toString().padStart(2, '0');
  const y = year || now.getFullYear().toString();

  // Use non-breaking spaces (\u00A0) to prevent line wrapping
  return `${city},\u00A0ngày\u00A0${d}\u00A0tháng\u00A0${m}\u00A0năm\u00A0${y}`;
}

/**
 * Get checkbox value based on condition
 */
export function getCheckbox(condition: boolean): string {
  return condition ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED;
}

/**
 * Format list with bullet points and newlines
 */
export function formatBulletList(items: string | string[] | undefined): string {
  if (!items) return '';
  if (typeof items === 'string') return items;
  return items.map((item) => `- ${item}`).join('\n');
}

/**
 * Base context fields common to all templates
 */
export function getBaseContext(input: ProposalContextInput): Record<string, unknown> {
  const dateComponents = getCurrentDateComponents();

  return {
    // Date fields
    ngay: dateComponents.ngay,
    thang: dateComponents.thang,
    nam: dateComponents.nam,
    diadiem_thoigian: getDateLine(),

    // Project basics
    khoa: input.facultyName || 'Công nghệ Thông tin',
    ten_de_tai: input.title || '',
    ma_de_tai: input.code || '',
    ma_so_de_tai: input.code || '',

    // Owner info
    ten_chu_nhiem: input.ownerName || '',
    ho_ten_chu_nhiem: input.ownerName || '',
    chu_nhiem: input.ownerName || '',
    email_chu_nhiem: input.ownerEmail || '',

    // Formatting helpers
    currentDate: dateComponents.currentDate,
    currentYear: dateComponents.currentYear,
    currentMonth: dateComponents.currentMonth,
    currentTime: dateComponents.currentTime,
  };
}
