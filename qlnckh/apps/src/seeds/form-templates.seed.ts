/**
 * Form Templates Seed Data
 *
 * This file contains all 18 form templates (MAU_01B to MAU_18B) as per Vietnamese NCKH regulations.
 * Each template includes its sections with canonical section IDs for backward compatibility.
 *
 * @module seeds/form-templates.seed
 */

import { PrismaClient } from '@prisma/client';
import { SECTION_IDS, SECTION_LABELS, SECTION_COMPONENTS } from '../common/constants';

const prisma = new PrismaClient();

/**
 * Form Templates Configuration
 * Based on Vietnamese NCKH (Nghiên cứu Khoa học) regulations
 */
export const FORM_TEMPLATES_SEED_DATA = [
  // MAU_01B: Đề tài NCKH cấp trường đầy đủ
  {
    code: 'MAU_01B',
    name: 'Đề tài Nghiên cứu Khoa học cấp trường',
    description: 'Mẫu đề tài NCKH cấp trường đầy đủ với tất cả các phần thông tin',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: SECTION_LABELS.SEC_INFO_GENERAL, component: SECTION_COMPONENTS.SEC_INFO_GENERAL, displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_CONTENT_METHOD, label: SECTION_LABELS.SEC_CONTENT_METHOD, component: SECTION_COMPONENTS.SEC_CONTENT_METHOD, displayOrder: 2, isRequired: true },
      { sectionId: SECTION_IDS.SEC_RESEARCH_METHOD, label: SECTION_LABELS.SEC_RESEARCH_METHOD, component: SECTION_COMPONENTS.SEC_RESEARCH_METHOD, displayOrder: 3, isRequired: true },
      { sectionId: SECTION_IDS.SEC_EXPECTED_RESULTS, label: SECTION_LABELS.SEC_EXPECTED_RESULTS, component: SECTION_COMPONENTS.SEC_EXPECTED_RESULTS, displayOrder: 4, isRequired: true },
      { sectionId: SECTION_IDS.SEC_BUDGET, label: SECTION_LABELS.SEC_BUDGET, component: SECTION_COMPONENTS.SEC_BUDGET, displayOrder: 5, isRequired: true },
      { sectionId: SECTION_IDS.SEC_ATTACHMENTS, label: SECTION_LABELS.SEC_ATTACHMENTS, component: SECTION_COMPONENTS.SEC_ATTACHMENTS, displayOrder: 6, isRequired: false },
      { sectionId: SECTION_IDS.SEC_RESEARCHERS, label: SECTION_LABELS.SEC_RESEARCHERS, component: SECTION_COMPONENTS.SEC_RESEARCHERS, displayOrder: 7, isRequired: true },
      { sectionId: SECTION_IDS.SEC_FACILITIES, label: SECTION_LABELS.SEC_FACILITIES, component: SECTION_COMPONENTS.SEC_FACILITIES, displayOrder: 8, isRequired: false },
      { sectionId: SECTION_IDS.SEC_TIMELINE, label: SECTION_LABELS.SEC_TIMELINE, component: SECTION_COMPONENTS.SEC_TIMELINE, displayOrder: 9, isRequired: true },
      { sectionId: SECTION_IDS.SEC_REFERENCES, label: SECTION_LABELS.SEC_REFERENCES, component: SECTION_COMPONENTS.SEC_REFERENCES, displayOrder: 10, isRequired: false },
    ],
  },
  // MAU_02B: Đề tài NCKH cấp khoa đầy đủ
  {
    code: 'MAU_02B',
    name: 'Đề tài Nghiên cứu Khoa học cấp khoa',
    description: 'Mẫu đề tài NCKH cấp khoa đầy đủ',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: SECTION_LABELS.SEC_INFO_GENERAL, component: SECTION_COMPONENTS.SEC_INFO_GENERAL, displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_CONTENT_METHOD, label: SECTION_LABELS.SEC_CONTENT_METHOD, component: SECTION_COMPONENTS.SEC_CONTENT_METHOD, displayOrder: 2, isRequired: true },
      { sectionId: SECTION_IDS.SEC_RESEARCH_METHOD, label: SECTION_LABELS.SEC_RESEARCH_METHOD, component: SECTION_COMPONENTS.SEC_RESEARCH_METHOD, displayOrder: 3, isRequired: true },
      { sectionId: SECTION_IDS.SEC_EXPECTED_RESULTS, label: SECTION_LABELS.SEC_EXPECTED_RESULTS, component: SECTION_COMPONENTS.SEC_EXPECTED_RESULTS, displayOrder: 4, isRequired: true },
      { sectionId: SECTION_IDS.SEC_BUDGET, label: SECTION_LABELS.SEC_BUDGET, component: SECTION_COMPONENTS.SEC_BUDGET, displayOrder: 5, isRequired: true },
      { sectionId: SECTION_IDS.SEC_ATTACHMENTS, label: SECTION_LABELS.SEC_ATTACHMENTS, component: SECTION_COMPONENTS.SEC_ATTACHMENTS, displayOrder: 6, isRequired: false },
      { sectionId: SECTION_IDS.SEC_RESEARCHERS, label: SECTION_LABELS.SEC_RESEARCHERS, component: SECTION_COMPONENTS.SEC_RESEARCHERS, displayOrder: 7, isRequired: true },
      { sectionId: SECTION_IDS.SEC_FACILITIES, label: SECTION_LABELS.SEC_FACILITIES, component: SECTION_COMPONENTS.SEC_FACILITIES, displayOrder: 8, isRequired: false },
      { sectionId: SECTION_IDS.SEC_TIMELINE, label: SECTION_LABELS.SEC_TIMELINE, component: SECTION_COMPONENTS.SEC_TIMELINE, displayOrder: 9, isRequired: true },
    ],
  },
  // MAU_03B: Mẫu 3b - Phiếu đánh giá đề tài cấp khoa
  {
    code: 'MAU_03B',
    name: 'Phiếu đánh giá đề tài cấp khoa',
    description: 'Mẫu phiếu đánh giá đề tài NCKH cấp khoa',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: 'Thông tin đề tài', component: SECTION_COMPONENTS.SEC_INFO_GENERAL, displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_CONTENT_METHOD, label: 'Đánh giá nội dung', component: 'ContentEvaluationSection', displayOrder: 2, isRequired: true },
      { sectionId: SECTION_IDS.SEC_EXPECTED_RESULTS, label: 'Đánh giá kết quả dự kiến', component: 'ResultsEvaluationSection', displayOrder: 3, isRequired: true },
    ],
  },
  // MAU_04B: Mẫu 4b - Phiếu phân công hội đồng (trường)
  {
    code: 'MAU_04B',
    name: 'Phiếu phân công Hội đồng',
    description: 'Mẫu phiếu phân công Hội đồng xét duyệt cấp trường',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: 'Thông tin hội đồng', component: 'CouncilInfoSection', displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_RESEARCHERS, label: 'Danh sách thành viên', component: 'CouncilMembersSection', displayOrder: 2, isRequired: true },
    ],
  },
  // MAU_05B: Mẫu 5b - Kế hoạch họp hội đồng
  {
    code: 'MAU_05B',
    name: 'Kế hoạch họp Hội đồng',
    description: 'Mẫu kế hoạch họp Hội đồng xét duyệt',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: 'Thông tin cuộc họp', component: 'MeetingInfoSection', displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_TIMELINE, label: 'Lịch trình họp', component: 'MeetingScheduleSection', displayOrder: 2, isRequired: true },
    ],
  },
  // MAU_06B: Mẫu 6b - Biên bản họp hội đồng
  {
    code: 'MAU_06B',
    name: 'Biên bản họp Hội đồng',
    description: 'Mẫu biên bản họp Hội đồng xét duyệt đề cương',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: 'Thông tin cuộc họp', component: 'MeetingInfoSection', displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_CONTENT_METHOD, label: 'Nội dung thảo luận', component: 'DiscussionContentSection', displayOrder: 2, isRequired: true },
      { sectionId: SECTION_IDS.SEC_EXPECTED_RESULTS, label: 'Kết quả biểu quyết', component: 'VotingResultsSection', displayOrder: 3, isRequired: true },
    ],
  },
  // MAU_07B: Mẫu 7b - Phiếu yêu cầu chỉnh sửa/bổ sung
  {
    code: 'MAU_07B',
    name: 'Phiếu yêu cầu chỉnh sửa/bổ sung',
    description: 'Mẫu phiếu yêu cầu chỉnh sửa hoặc bổ sung tài liệu',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: 'Thông tin đề tài', component: SECTION_COMPONENTS.SEC_INFO_GENERAL, displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_CONTENT_METHOD, label: 'Nội dung cần chỉnh sửa', component: 'RevisionContentSection', displayOrder: 2, isRequired: true },
      { sectionId: SECTION_IDS.SEC_ATTACHMENTS, label: 'Tài liệu đính kèm', component: SECTION_COMPONENTS.SEC_ATTACHMENTS, displayOrder: 3, isRequired: false },
    ],
  },
  // MAU_08B: Mẫu 8b - Phiếu nghiệm thu cấp khoa
  {
    code: 'MAU_08B',
    name: 'Phiếu nghiệm thu cấp khoa',
    description: 'Mẫu phiếu nghiệm thu đề tài cấp khoa',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: 'Thông tin nghiệm thu', component: 'AcceptanceInfoSection', displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_FACULTY_ACCEPTANCE_RESULTS, label: 'Kết quả thực hiện', component: 'ImplementationResultsSection', displayOrder: 2, isRequired: true },
      { sectionId: SECTION_IDS.SEC_FACULTY_ACCEPTANCE_PRODUCTS, label: 'Sản phẩm đầu ra', component: 'OutputProductsSection', displayOrder: 3, isRequired: true },
    ],
  },
  // MAU_09B: Mẫu 9b - Biên bản nghiệm thu cấp khoa
  {
    code: 'MAU_09B',
    name: 'Biên bản nghiệm thu cấp khoa',
    description: 'Mẫu biên bản nghiệm thu đề tài cấp khoa',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: 'Thông tin nghiệm thu', component: 'AcceptanceInfoSection', displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_FACULTY_ACCEPTANCE_RESULTS, label: 'Nội dung nghiệm thu', component: 'AcceptanceContentSection', displayOrder: 2, isRequired: true },
      { sectionId: SECTION_IDS.SEC_FACULTY_ACCEPTANCE_PRODUCTS, label: 'Kết quả đánh giá', component: 'EvaluationResultsSection', displayOrder: 3, isRequired: true },
    ],
  },
  // MAU_10B: Mẫu 10b - Phiếu đánh giá sản phẩm
  {
    code: 'MAU_10B',
    name: 'Phiếu đánh giá sản phẩm',
    description: 'Mẫu phiếu đánh giá sản phẩm nghiên cứu',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: 'Thông tin sản phẩm', component: 'ProductInfoSection', displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_FACULTY_ACCEPTANCE_PRODUCTS, label: 'Tiêu chí đánh giá', component: 'ProductCriteriaSection', displayOrder: 2, isRequired: true },
    ],
  },
  // MAU_11B: Mẫu 11b - Báo cáo tài chính
  {
    code: 'MAU_11B',
    name: 'Báo cáo tài chính',
    description: 'Mẫu báo cáo tài chính đề tài NCKH',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: 'Thông tin đề tài', component: SECTION_COMPONENTS.SEC_INFO_GENERAL, displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_BUDGET, label: 'Kinh phí thực hiện', component: 'BudgetExecutionSection', displayOrder: 2, isRequired: true },
    ],
  },
  // MAU_12B: Mẫu 12b - Phiếu nghiệm thu cấp trường
  {
    code: 'MAU_12B',
    name: 'Phiếu nghiệm thu cấp trường',
    description: 'Mẫu phiếu nghiệm thu đề tài cấp trường',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: 'Thông tin nghiệm thu', component: 'AcceptanceInfoSection', displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_SCHOOL_ACCEPTANCE_RESULTS, label: 'Kết quả thực hiện', component: 'ImplementationResultsSection', displayOrder: 2, isRequired: true },
      { sectionId: SECTION_IDS.SEC_SCHOOL_ACCEPTANCE_PRODUCTS, label: 'Sản phẩm đầu ra', component: 'OutputProductsSection', displayOrder: 3, isRequired: true },
    ],
  },
  // MAU_13B: Mẫu 13b - Biên bản nghiệm thu cấp trường
  {
    code: 'MAU_13B',
    name: 'Biên bản nghiệm thu cấp trường',
    description: 'Mẫu biên bản nghiệm thu đề tài cấp trường',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: 'Thông tin nghiệm thu', component: 'AcceptanceInfoSection', displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_SCHOOL_ACCEPTANCE_RESULTS, label: 'Nội dung nghiệm thu', component: 'AcceptanceContentSection', displayOrder: 2, isRequired: true },
      { sectionId: SECTION_IDS.SEC_SCHOOL_ACCEPTANCE_PRODUCTS, label: 'Kết quả đánh giá', component: 'EvaluationResultsSection', displayOrder: 3, isRequired: true },
    ],
  },
  // MAU_14B: Mẫu 14b - Phiếu đánh giá hội đồng nghiệm thu
  {
    code: 'MAU_14B',
    name: 'Phiếu đánh giá Hội đồng nghiệm thu',
    description: 'Mẫu phiếu đánh giá của Hội đồng nghiệm thu',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: 'Thông tin đánh giá', component: 'EvaluationInfoSection', displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_SCHOOL_ACCEPTANCE_RESULTS, label: 'Tiêu chí đánh giá', component: 'EvaluationCriteriaSection', displayOrder: 2, isRequired: true },
    ],
  },
  // MAU_15B: Mẫu 15b - Báo cáo kết quả nghiên cứu
  {
    code: 'MAU_15B',
    name: 'Báo cáo kết quả nghiên cứu',
    description: 'Mẫu báo cáo kết quả nghiên cứu khoa học',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: 'Thông tin đề tài', component: SECTION_COMPONENTS.SEC_INFO_GENERAL, displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_CONTENT_METHOD, label: 'Tóm tắt kết quả', component: 'ResultsSummarySection', displayOrder: 2, isRequired: true },
      { sectionId: SECTION_IDS.SEC_SCHOOL_ACCEPTANCE_RESULTS, label: 'Kết quả chi tiết', component: 'DetailedResultsSection', displayOrder: 3, isRequired: true },
    ],
  },
  // MAU_16B: Mẫu 16b - Phụ lục tài liệu
  {
    code: 'MAU_16B',
    name: 'Phụ lục tài liệu',
    description: 'Mẫu phụ lục tài liệu đính kèm báo cáo',
    sections: [
      { sectionId: SECTION_IDS.SEC_ATTACHMENTS, label: 'Danh mục tài liệu', component: 'DocumentsListSection', displayOrder: 1, isRequired: true },
    ],
  },
  // MAU_17B: Mẫu 17b - Biên bản bàn giao
  {
    code: 'MAU_17B',
    name: 'Biên bản bàn giao',
    description: 'Mẫu biên bản bàn giao đề tài sau nghiệm thu',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: 'Thông tin bàn giao', component: 'HandoverInfoSection', displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_HANDOVER_CHECKLIST, label: 'Checklist bàn giao', component: 'HandoverChecklistSection', displayOrder: 2, isRequired: true },
    ],
  },
  // MAU_18B: Mẫu 18b - Phiếu gia hạn/tạm dừng
  {
    code: 'MAU_18B',
    name: 'Phiếu gia hạn/Tạm dừng',
    description: 'Mẫu phiếu xin gia hạn hoặc tạm dừng thực hiện đề tài',
    sections: [
      { sectionId: SECTION_IDS.SEC_INFO_GENERAL, label: 'Thông tin đề tài', component: SECTION_COMPONENTS.SEC_INFO_GENERAL, displayOrder: 1, isRequired: true },
      { sectionId: SECTION_IDS.SEC_EXTENSION_REASON, label: 'Lý do gia hạn/tạm dừng', component: SECTION_COMPONENTS.SEC_EXTENSION_REASON, displayOrder: 2, isRequired: true },
      { sectionId: SECTION_IDS.SEC_EXTENSION_DURATION, label: 'Thời gian gia hạn', component: SECTION_COMPONENTS.SEC_EXTENSION_DURATION, displayOrder: 3, isRequired: true },
    ],
  },
];

/**
 * Seed form templates to database
 */
export async function seedFormTemplates(prismaClient: PrismaClient = prisma): Promise<void> {
  console.log('🌱 Seeding form templates...');

  for (const templateData of FORM_TEMPLATES_SEED_DATA) {
    const existingTemplate = await prismaClient.formTemplate.findUnique({
      where: { code: templateData.code },
    });

    if (!existingTemplate) {
      const template = await prismaClient.formTemplate.create({
        data: {
          code: templateData.code,
          name: templateData.name,
          description: templateData.description,
          version: 'v1.0',
          isActive: true,
          projectType: 'CAP_TRUONG',
          sections: {
            create: templateData.sections.map(section => ({
              sectionId: section.sectionId as any,
              label: section.label,
              component: section.component,
              displayOrder: section.displayOrder,
              isRequired: section.isRequired,
              config: null,
            })),
          },
        },
      });

      console.log(`  ✅ Created template: ${template.code} - ${template.name} with ${template.sections.length} sections`);
    } else {
      console.log(`  ⏭️  Template already exists: ${templateData.code}`);
    }
  }

  console.log('✅ Form templates seeding completed!');
}

/**
 * Run seed if executed directly
 */
if (require.main === module) {
  seedFormTemplates()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error seeding form templates:', error);
      process.exit(1);
    });
}
