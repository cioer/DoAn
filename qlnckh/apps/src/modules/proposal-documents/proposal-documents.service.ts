import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import {
  FormType,
  FormDocumentStatus,
  ProjectState,
  UserRole,
  Prisma,
} from '@prisma/client';
import { FormEngineService } from '../form-engine/form-engine.service';
import { FormContextService } from '../form-engine/form-context.service';
import {
  CreateProposalDocumentDto,
  UpdateProposalDocumentDto,
  GenerateFormDto,
  GenerateFormResultDto,
  ProposalDocumentsListDto,
  QueryProposalDocumentsDto,
  PaginatedProposalDocumentsDto,
  ApproveRejectDocumentDto,
} from './dto';

/**
 * Mapping FormType enum sang template file name (used for actual file)
 */
const FORM_TYPE_TO_FILE: Record<FormType, string> = {
  FORM_1B: '1b.docx',
  FORM_PL1: 'PL1.docx',
  FORM_2B: '2b.docx',
  FORM_3B: '3b.docx',
  FORM_4B: '4b.docx',
  FORM_5B: '5b.docx',
  FORM_6B: '6b.docx',
  FORM_7B: '7b.docx',
  FORM_8B: '8b.docx',
  FORM_9B: '9b.docx',
  FORM_10B: '10b.docx',
  FORM_11B: '11b.docx',
  FORM_PL2: 'PL2.docx',
  FORM_12B: '12b.docx',
  FORM_13B: '13b.docx',
  FORM_14B: '14b.docx',
  FORM_15B: '15b.docx',
  FORM_16B: '16b.docx',
  FORM_PL3: 'PL3.docx',
  FORM_17B: '17b.docx',
  FORM_18B: '18b.docx',
};

/**
 * Mapping FormType -> Context template type cho FormContextService
 */
const FORM_TYPE_TO_CONTEXT_TYPE: Record<FormType, string> = {
  FORM_1B: 'PROPOSAL_OUTLINE',
  FORM_PL1: '1b', // Base context
  FORM_2B: 'EVALUATION_FORM',
  FORM_3B: 'FACULTY_MEETING_MINUTES',
  FORM_4B: 'SUMMARY_CATALOG',
  FORM_5B: 'SCHOOL_EVALUATION',
  FORM_6B: 'COUNCIL_MEETING_MINUTES',
  FORM_7B: 'REVISION_REQUEST',
  FORM_8B: 'FACULTY_ACCEPTANCE_EVAL',
  FORM_9B: 'FACULTY_ACCEPTANCE_MINUTES',
  FORM_10B: 'FINAL_REPORT',
  FORM_11B: 'FACULTY_ACCEPTANCE_DECISION',
  FORM_PL2: '10b', // Uses similar context as Final Report
  FORM_12B: 'SCHOOL_ACCEPTANCE_EVAL',
  FORM_13B: 'SCHOOL_ACCEPTANCE_MINUTES',
  FORM_14B: 'SCHOOL_ACCEPTANCE_DECISION',
  FORM_15B: '15b', // Base context
  FORM_16B: 'PRODUCT_APPENDIX',
  FORM_PL3: '12b', // Uses similar context as School Acceptance Eval
  FORM_17B: 'HANDOVER_CHECKLIST',
  FORM_18B: 'EXTENSION_REQUEST',
};

/**
 * Thông tin chi tiết về từng form
 */
const FORM_INFO: Record<FormType, { name: string; description: string; phase: string }> = {
  FORM_1B: { name: 'Phiếu đề xuất', description: 'Phiếu đề xuất thực hiện đề tài', phase: 'PROPOSAL' },
  FORM_PL1: { name: 'Đề cương chi tiết', description: 'Đề cương đề tài khoa học', phase: 'PROPOSAL' },
  FORM_2B: { name: 'Phiếu đánh giá cấp Khoa', description: 'Phiếu đánh giá xét chọn', phase: 'FACULTY_REVIEW' },
  FORM_3B: { name: 'Biên bản họp cấp Khoa', description: 'Biên bản họp xét chọn cấp Khoa', phase: 'FACULTY_REVIEW' },
  FORM_4B: { name: 'Danh mục tổng hợp', description: 'Danh mục tổng hợp kết quả xét chọn', phase: 'FACULTY_REVIEW' },
  FORM_5B: { name: 'Biên bản xét chọn sơ bộ', description: 'Biên bản xét chọn sơ bộ cấp Trường', phase: 'SCHOOL_SELECTION' },
  FORM_6B: { name: 'Biên bản Hội đồng tư vấn', description: 'Biên bản Hội đồng tư vấn xét chọn', phase: 'COUNCIL_REVIEW' },
  FORM_7B: { name: 'Báo cáo hoàn thiện đề cương', description: 'Báo cáo hoàn thiện đề cương', phase: 'COUNCIL_REVIEW' },
  FORM_8B: { name: 'Đề nghị lập HĐ NT Khoa', description: 'Giấy đề nghị thành lập Hội đồng NT Khoa', phase: 'FACULTY_ACCEPTANCE' },
  FORM_9B: { name: 'Phiếu đánh giá NT Khoa', description: 'Phiếu đánh giá nghiệm thu cấp Khoa', phase: 'FACULTY_ACCEPTANCE' },
  FORM_10B: { name: 'Biên bản họp NT Khoa', description: 'Biên bản họp nghiệm thu cấp Khoa', phase: 'FACULTY_ACCEPTANCE' },
  FORM_11B: { name: 'Báo cáo hoàn thiện NT Khoa', description: 'Báo cáo hoàn thiện hồ sơ NT Khoa', phase: 'FACULTY_ACCEPTANCE' },
  FORM_PL2: { name: 'Báo cáo tổng kết', description: 'Báo cáo tổng kết đề tài', phase: 'FACULTY_ACCEPTANCE' },
  FORM_12B: { name: 'Nhận xét phản biện', description: 'Nhận xét phản biện đề tài', phase: 'SCHOOL_ACCEPTANCE' },
  FORM_13B: { name: 'Đề nghị lập HĐ NT Trường', description: 'Giấy đề nghị thành lập Hội đồng NT Trường', phase: 'SCHOOL_ACCEPTANCE' },
  FORM_14B: { name: 'Phiếu đánh giá NT Trường', description: 'Phiếu đánh giá nghiệm thu cấp Trường', phase: 'SCHOOL_ACCEPTANCE' },
  FORM_15B: { name: 'Biên bản họp NT Trường', description: 'Biên bản họp nghiệm thu cấp Trường', phase: 'SCHOOL_ACCEPTANCE' },
  FORM_16B: { name: 'Báo cáo hoàn thiện NT Trường', description: 'Báo cáo hoàn thiện hồ sơ NT Trường', phase: 'SCHOOL_ACCEPTANCE' },
  FORM_PL3: { name: 'Nhận xét phản biện chi tiết', description: 'Bản nhận xét phản biện chi tiết', phase: 'SCHOOL_ACCEPTANCE' },
  FORM_17B: { name: 'Biên bản giao nhận sản phẩm', description: 'Biên bản giao nhận sản phẩm', phase: 'COMPLETED' },
  FORM_18B: { name: 'Đơn xin gia hạn', description: 'Đơn xin gia hạn thời gian thực hiện', phase: 'IN_PROGRESS' },
};

/**
 * Mapping ProjectState -> Required/Optional forms
 */
const STATUS_FORM_MAPPING: Record<ProjectState, { required: FormType[]; optional: FormType[] }> = {
  DRAFT: {
    required: [FormType.FORM_1B],
    optional: [FormType.FORM_PL1],
  },
  FACULTY_COUNCIL_OUTLINE_REVIEW: {
    required: [FormType.FORM_1B, FormType.FORM_PL1, FormType.FORM_2B, FormType.FORM_3B],
    optional: [FormType.FORM_4B],
  },
  SCHOOL_COUNCIL_OUTLINE_REVIEW: {
    required: [FormType.FORM_5B, FormType.FORM_6B, FormType.FORM_7B],
    optional: [],
  },
  CHANGES_REQUESTED: {
    required: [],
    optional: [],
  },
  APPROVED: {
    required: [],
    optional: [],
  },
  IN_PROGRESS: {
    required: [],
    optional: [FormType.FORM_18B],
  },
  FACULTY_COUNCIL_ACCEPTANCE_REVIEW: {
    required: [FormType.FORM_8B, FormType.FORM_9B, FormType.FORM_10B, FormType.FORM_11B, FormType.FORM_PL2],
    optional: [],
  },
  SCHOOL_COUNCIL_ACCEPTANCE_REVIEW: {
    required: [FormType.FORM_12B, FormType.FORM_13B, FormType.FORM_14B, FormType.FORM_15B, FormType.FORM_16B],
    optional: [FormType.FORM_PL3],
  },
  HANDOVER: {
    required: [FormType.FORM_17B],
    optional: [],
  },
  COMPLETED: {
    required: [],
    optional: [],
  },
  CANCELLED: {
    required: [],
    optional: [],
  },
  REJECTED: {
    required: [],
    optional: [],
  },
  WITHDRAWN: {
    required: [],
    optional: [],
  },
  PAUSED: {
    required: [],
    optional: [],
  },
};

/**
 * Mapping Role -> Forms that role can create
 * Defines who can create which forms based on their role
 */
const ROLE_FORM_PERMISSIONS: Record<UserRole, FormType[]> = {
  // Giảng viên (Chủ nhiệm đề tài) - tạo forms liên quan đến đề xuất và báo cáo
  GIANG_VIEN: [
    FormType.FORM_1B,   // Phiếu đề xuất
    FormType.FORM_PL1,  // Đề cương chi tiết
    FormType.FORM_7B,   // Báo cáo hoàn thiện đề cương
    FormType.FORM_PL2,  // Báo cáo tổng kết
    FormType.FORM_18B,  // Đơn xin gia hạn
  ],

  // Quản lý Khoa - tạo forms đánh giá và nghiệm thu cấp Khoa
  QUAN_LY_KHOA: [
    FormType.FORM_2B,   // Phiếu đánh giá cấp Khoa
    FormType.FORM_3B,   // Biên bản họp cấp Khoa
    FormType.FORM_4B,   // Danh mục tổng hợp
    FormType.FORM_8B,   // Đề nghị lập HĐ NT Khoa
    FormType.FORM_9B,   // Phiếu đánh giá NT Khoa
    FormType.FORM_10B,  // Biên bản họp NT Khoa
    FormType.FORM_11B,  // Báo cáo hoàn thiện NT Khoa
  ],

  // Thư ký Khoa - tạo biên bản họp và danh mục
  THU_KY_KHOA: [
    FormType.FORM_2B,   // Phiếu đánh giá cấp Khoa
    FormType.FORM_3B,   // Biên bản họp cấp Khoa
    FormType.FORM_4B,   // Danh mục tổng hợp
    FormType.FORM_9B,   // Phiếu đánh giá NT Khoa
    FormType.FORM_10B,  // Biên bản họp NT Khoa
    FormType.FORM_11B,  // Báo cáo hoàn thiện NT Khoa
  ],

  // Phòng KH&CN - tạo forms cấp Trường
  PHONG_KHCN: [
    FormType.FORM_5B,   // Biên bản xét chọn sơ bộ
    FormType.FORM_6B,   // Biên bản Hội đồng tư vấn (merged from THU_KY_HOI_DONG)
    FormType.FORM_12B,  // Nhận xét phản biện
    FormType.FORM_13B,  // Đề nghị lập HĐ NT Trường
    FormType.FORM_14B,  // Phiếu đánh giá NT Trường
    FormType.FORM_15B,  // Biên bản họp NT Trường
    FormType.FORM_16B,  // Báo cáo hoàn thiện NT Trường
    FormType.FORM_PL3,  // Nhận xét phản biện chi tiết
    FormType.FORM_17B,  // Biên bản giao nhận sản phẩm
  ],

  // Ban Giám học - có thể tạo forms cấp Trường và nghiệm thu
  BAN_GIAM_HOC: [
    FormType.FORM_5B,   // Biên bản xét chọn sơ bộ
    FormType.FORM_6B,   // Biên bản Hội đồng tư vấn
    FormType.FORM_12B,  // Nhận xét phản biện
    FormType.FORM_13B,  // Đề nghị lập HĐ NT Trường
    FormType.FORM_14B,  // Phiếu đánh giá NT Trường
    FormType.FORM_15B,  // Biên bản họp NT Trường
    FormType.FORM_16B,  // Báo cáo hoàn thiện NT Trường
  ],

  // Admin - có thể tạo tất cả forms
  ADMIN: Object.values(FormType),
};

/**
 * Check if user is owner of proposal
 */
const isProposalOwner = (proposal: { ownerId: string }, userId: string): boolean => {
  return proposal.ownerId === userId;
};

@Injectable()
export class ProposalDocumentsService {
  private readonly logger = new Logger(ProposalDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly formEngine: FormEngineService,
    private readonly formContext: FormContextService,
  ) {}

  /**
   * Tạo mới proposal document record
   */
  async create(dto: CreateProposalDocumentDto, userId: string) {
    // Verify proposal exists
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: dto.proposalId },
    });

    if (!proposal) {
      throw new NotFoundException(`Đề tài không tồn tại: ${dto.proposalId}`);
    }

    // Check if document already exists for this proposal + formType
    const existing = await this.prisma.proposalDocument.findFirst({
      where: {
        proposalId: dto.proposalId,
        formType: dto.formType,
        deletedAt: null,
      },
      orderBy: { version: 'desc' },
    });

    const version = existing ? existing.version + 1 : 1;

    const document = await this.prisma.proposalDocument.create({
      data: {
        proposalId: dto.proposalId,
        formType: dto.formType,
        status: FormDocumentStatus.DRAFT,
        version,
        formData: dto.formData || {},
        createdBy: userId,
      },
    });

    this.logger.log(`Created proposal document: ${document.id} (${dto.formType})`);

    return document;
  }

  /**
   * Lấy danh sách documents của một proposal với thông tin chi tiết
   */
  async getByProposal(proposalId: string): Promise<ProposalDocumentsListDto> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        proposalDocuments: {
          where: { deletedAt: null },
          orderBy: [{ formType: 'asc' }, { version: 'desc' }],
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Đề tài không tồn tại: ${proposalId}`);
    }

    const currentState = proposal.state;
    const mapping = STATUS_FORM_MAPPING[currentState];

    // Get completed forms (status = APPROVED or FINALIZED)
    const completedForms = proposal.proposalDocuments
      .filter(d => d.status === FormDocumentStatus.APPROVED || d.status === FormDocumentStatus.FINALIZED)
      .map(d => d.formType);

    // Calculate missing required forms
    const missingForms = mapping.required.filter(f => !completedForms.includes(f));

    // Enrich documents with form info
    const documentsWithInfo = proposal.proposalDocuments.map(doc => ({
      ...doc,
      formInfo: {
        ...FORM_INFO[doc.formType],
        templateFile: FORM_TYPE_TO_FILE[doc.formType],
      },
    }));

    return {
      proposalId,
      proposalCode: proposal.code,
      currentState,
      documents: documentsWithInfo,
      requiredForms: mapping.required,
      optionalForms: mapping.optional,
      completedForms,
      missingForms,
      canTransition: missingForms.length === 0,
    };
  }

  /**
   * Lấy một document theo ID
   */
  async getById(id: string) {
    const document = await this.prisma.proposalDocument.findUnique({
      where: { id },
      include: {
        proposal: {
          select: { id: true, code: true, title: true, state: true },
        },
      },
    });

    if (!document || document.deletedAt) {
      throw new NotFoundException(`Document không tồn tại: ${id}`);
    }

    return {
      ...document,
      formInfo: {
        ...FORM_INFO[document.formType],
        templateFile: FORM_TYPE_TO_FILE[document.formType],
      },
    };
  }

  /**
   * Cập nhật document
   */
  async update(id: string, dto: UpdateProposalDocumentDto, userId: string) {
    const document = await this.prisma.proposalDocument.findUnique({
      where: { id },
    });

    if (!document || document.deletedAt) {
      throw new NotFoundException(`Document không tồn tại: ${id}`);
    }

    // Cannot update finalized documents
    if (document.status === FormDocumentStatus.FINALIZED) {
      throw new BadRequestException('Không thể sửa đổi biểu mẫu đã hoàn tất');
    }

    return this.prisma.proposalDocument.update({
      where: { id },
      data: {
        ...dto,
        formData: dto.formData ? dto.formData : undefined,
      },
    });
  }

  /**
   * Approve/Reject document
   */
  async approveReject(id: string, dto: ApproveRejectDocumentDto, userId: string) {
    const document = await this.prisma.proposalDocument.findUnique({
      where: { id },
    });

    if (!document || document.deletedAt) {
      throw new NotFoundException(`Document không tồn tại: ${id}`);
    }

    if (dto.status === FormDocumentStatus.APPROVED) {
      return this.prisma.proposalDocument.update({
        where: { id },
        data: {
          status: FormDocumentStatus.APPROVED,
          approvedBy: userId,
          approvedAt: new Date(),
        },
      });
    } else if (dto.status === FormDocumentStatus.REJECTED) {
      return this.prisma.proposalDocument.update({
        where: { id },
        data: {
          status: FormDocumentStatus.REJECTED,
          rejectedBy: userId,
          rejectedAt: new Date(),
          rejectionReason: dto.rejectionReason,
        },
      });
    }

    throw new BadRequestException('Invalid status');
  }

  /**
   * Generate form document từ template
   */
  async generateForm(dto: GenerateFormDto, userId: string): Promise<GenerateFormResultDto> {
    // Get proposal
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: dto.proposalId },
      include: {
        owner: true,
        faculty: true,
        council: {
          include: {
            members: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Đề tài không tồn tại: ${dto.proposalId}`);
    }

    // Check existing document
    let document = await this.prisma.proposalDocument.findFirst({
      where: {
        proposalId: dto.proposalId,
        formType: dto.formType,
        deletedAt: null,
      },
      orderBy: { version: 'desc' },
    });

    // If exists and not forcing regenerate, return existing
    if (document && document.filePath && !dto.regenerate) {
      // Check if PDF exists
      const pdfPath = document.filePath.replace('.docx', '.pdf');

      return {
        document: {
          id: document.id,
          proposalId: document.proposalId,
          documentType: document.formType,
          fileName: document.fileName || '',
          fileSize: document.fileSize || 0,
          sha256Hash: document.sha256Hash || '',
          generatedBy: document.createdBy || '',
          generatedAt: document.createdAt?.toISOString() || new Date().toISOString(),
        },
        pdfPath: pdfPath,
        docxUrl: `/api/proposal-documents/${document.id}/download`,
        pdfUrl: `/api/proposal-documents/${document.id}/download-pdf`,
      };
    }

    // Build context using FormContextService
    const contextType = FORM_TYPE_TO_CONTEXT_TYPE[dto.formType];
    const templateFile = FORM_TYPE_TO_FILE[dto.formType]; // e.g., "1b.docx"
    const templateName = templateFile; // Keep full name with .docx for FormEngine

    // Transform proposal to ProposalContextInput format
    const contextInput = {
      code: proposal.code,
      title: proposal.title,
      ownerName: proposal.owner?.displayName || '',
      ownerEmail: proposal.owner?.email || '',
      facultyName: proposal.faculty?.name || '',
      facultyCode: proposal.faculty?.code || '',
      state: proposal.state,
      createdAt: proposal.createdAt.toISOString(),
      councilName: proposal.council?.name || '',
      formData: proposal.formData as Record<string, unknown> || {},
      ...dto.additionalData,
    };

    const context = this.formContext.buildContext(contextType, contextInput, dto.additionalData || {});

    // Call FormEngine to render
    const result = await this.formEngine.renderForm({
      templateName,
      context: context as Record<string, any>,
      userId,
      proposalId: dto.proposalId,
    });

    // Generate filename (remove .docx from template name for cleaner filename)
    const baseName = templateName.replace('.docx', '');
    const fileName = `${baseName}_${proposal.code}.docx`;

    // Create or update document record
    if (!document) {
      document = await this.prisma.proposalDocument.create({
        data: {
          proposalId: dto.proposalId,
          formType: dto.formType,
          status: FormDocumentStatus.DRAFT,
          version: 1,
          filePath: result.docx_path,
          fileName,
          fileSize: null, // FormEngine doesn't return file size
          sha256Hash: result.sha256_docx,
          formData: context as any,
          createdBy: userId,
        },
      });
    } else {
      document = await this.prisma.proposalDocument.update({
        where: { id: document.id },
        data: {
          filePath: result.docx_path,
          fileName,
          fileSize: null,
          sha256Hash: result.sha256_docx,
          formData: context as any,
        },
      });
    }

    this.logger.log(`Generated form ${dto.formType} for proposal ${dto.proposalId}`);

    // Return format matching frontend FormGenerationResult interface
    // Note: Controller wraps this with { success: true, data: ... }
    return {
      document: {
        id: document.id,
        proposalId: document.proposalId,
        documentType: document.formType,
        fileName: document.fileName || fileName,
        fileSize: document.fileSize || 0,
        sha256Hash: document.sha256Hash || result.sha256_docx,
        generatedBy: userId,
        generatedAt: document.createdAt?.toISOString() || new Date().toISOString(),
      },
      pdfPath: result.pdf_path,
      docxUrl: `/api/proposal-documents/${document.id}/download`,
      pdfUrl: result.pdf_path ? `/api/proposal-documents/${document.id}/download-pdf` : undefined,
    };
  }

  /**
   * Query documents with pagination
   */
  async query(dto: QueryProposalDocumentsDto): Promise<PaginatedProposalDocumentsDto> {
    const where: Prisma.ProposalDocumentWhereInput = {
      deletedAt: null,
      ...(dto.proposalId && { proposalId: dto.proposalId }),
      ...(dto.formType && { formType: dto.formType }),
      ...(dto.status && { status: dto.status }),
    };

    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.proposalDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          proposal: {
            select: { code: true, title: true },
          },
        },
      }),
      this.prisma.proposalDocument.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Soft delete document
   */
  async delete(id: string, userId: string) {
    const document = await this.prisma.proposalDocument.findUnique({
      where: { id },
    });

    if (!document || document.deletedAt) {
      throw new NotFoundException(`Document không tồn tại: ${id}`);
    }

    return this.prisma.proposalDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Lấy danh sách forms cần thiết cho trạng thái hiện tại
   */
  getRequiredFormsForState(state: ProjectState) {
    return STATUS_FORM_MAPPING[state] || { required: [], optional: [] };
  }

  /**
   * Kiểm tra xem có thể chuyển trạng thái không
   */
  async canTransition(proposalId: string): Promise<{ canTransition: boolean; missingForms: FormType[] }> {
    const result = await this.getByProposal(proposalId);
    return {
      canTransition: result.canTransition,
      missingForms: result.missingForms,
    };
  }

  /**
   * Lấy thông tin form
   */
  getFormInfo(formType: FormType) {
    return FORM_INFO[formType];
  }

  /**
   * Lấy tất cả form types
   */
  getAllFormTypes() {
    return Object.keys(FORM_INFO).map(key => ({
      formType: key,
      ...FORM_INFO[key as FormType],
      templateFile: FORM_TYPE_TO_FILE[key as FormType],
    }));
  }

  /**
   * Kiểm tra FormEngine service có khả dụng không
   */
  async checkFormEngineHealth(): Promise<boolean> {
    return this.formEngine.isAvailable();
  }

  /**
   * Lấy danh sách forms mà user có thể tạo cho proposal
   * Dựa trên: role của user + state của proposal + ownership
   */
  async getAvailableFormsForUser(
    proposalId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{
    available: Array<{
      formType: FormType;
      name: string;
      description: string;
      phase: string;
      isRequired: boolean;
      isGenerated: boolean;
      documentId?: string;
    }>;
    proposalState: ProjectState;
    canCreateForms: boolean;
  }> {
    // Get proposal with current state
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        state: true,
        ownerId: true,
        code: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Đề tài không tồn tại: ${proposalId}`);
    }

    // Get existing documents for this proposal
    const existingDocs = await this.prisma.proposalDocument.findMany({
      where: {
        proposalId,
        deletedAt: null,
      },
      select: {
        id: true,
        formType: true,
      },
    });

    const existingFormTypes = new Map<string, string>(
      existingDocs.map(doc => [doc.formType, doc.id])
    );

    // Get forms allowed by state
    const stateMapping = STATUS_FORM_MAPPING[proposal.state] || { required: [], optional: [] };
    const formsAllowedByState = [...stateMapping.required, ...stateMapping.optional];

    // Get forms allowed by role
    let formsAllowedByRole = ROLE_FORM_PERMISSIONS[userRole] || [];

    // Special case: If user is proposal owner (GIANG_VIEN), they can create owner-specific forms
    const isOwner = isProposalOwner(proposal, userId);
    if (isOwner && userRole !== UserRole.ADMIN) {
      // Owner can always create their own forms regardless of role
      formsAllowedByRole = [
        ...new Set([
          ...formsAllowedByRole,
          ...ROLE_FORM_PERMISSIONS[UserRole.GIANG_VIEN],
        ]),
      ];
    }

    // Intersection: forms that are both allowed by state AND allowed by role
    const availableForms = formsAllowedByState.filter(formType =>
      formsAllowedByRole.includes(formType)
    );

    // Build response with form details
    const available = availableForms.map(formType => {
      const info = FORM_INFO[formType];
      const isRequired = stateMapping.required.includes(formType);
      const existingDocId = existingFormTypes.get(formType);

      return {
        formType,
        name: info?.name || formType,
        description: info?.description || '',
        phase: info?.phase || '',
        isRequired,
        isGenerated: !!existingDocId,
        documentId: existingDocId,
      };
    });

    // Sort: required first, then by form type
    available.sort((a, b) => {
      if (a.isRequired !== b.isRequired) {
        return a.isRequired ? -1 : 1;
      }
      return a.formType.localeCompare(b.formType);
    });

    return {
      available,
      proposalState: proposal.state,
      canCreateForms: available.length > 0,
    };
  }
}
