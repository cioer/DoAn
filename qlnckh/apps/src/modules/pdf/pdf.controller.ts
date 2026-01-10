import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PdfService } from './pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../rbac/permissions.enum';
import { UserRole } from '@prisma/client';

/**
 * User object attached to request by JWT guard
 */
interface RequestUser {
  id: string;
  email: string;
  role: string;
  facultyId: string | null;
}

@ApiTags('pdf')
@Controller('proposals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  /**
   * GET /api/proposals/:id/pdf
   * Story 3.9: Generate PDF export for proposal detail
   *
   * Returns PDF buffer for proposal detail with WYSIWYG formatting.
   * Checks for pre-generated seed PDF first, falls back to on-demand generation.
   *
   * Authenticated users can access PDF export.
   */
  @Get(':id/pdf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xuất PDF chi tiết đề tài',
    description:
      'Xuất PDF cho đề tài với định dạng giống UI (WYSIWYG). Trả về pre-generated PDF cho seed data, hoặc generate on-demand cho đề tài mới.',
  })
  @ApiParam({
    name: 'id',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF file',
    content: {
      'application/pdf': {
        example: 'Binary PDF content',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: 'Không tìm thấy đề tài',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'PDF generation failed',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PDF_GENERATION_FAILED',
          message: 'Không thể tạo PDF. Vui lòng thử lại.',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - chưa đăng nhập',
  })
  async getProposalPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Generate PDF
      const pdfBuffer = await this.pdfService.generateProposalPdf(id);

      // Generate filename with timestamp
      const timestamp = new Date().getTime();
      const filename = `proposal_detail_${id}_${timestamp}.pdf`;

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());

      // Send PDF buffer
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException({
        success: false,
        error: {
          code: 'PDF_GENERATION_FAILED',
          message: 'Không thể tạo PDF. Vui lòng thử lại.',
        },
      });
    }
  }

  /**
   * GET /api/proposals/:id/revision-pdf
   * Story 4.6: Generate PDF export for revision request
   *
   * Returns PDF buffer for revision request with proposal info,
   * revision details, and timeline. Only available for proposals
   * in CHANGES_REQUESTED state with a RETURN log.
   *
   * Authenticated users can access revision PDF export.
   */
  @Get(':id/revision-pdf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xuất PDF yêu cầu sửa',
    description:
      'Xuất PDF cho yêu cầu sửa đổi với đầy đủ thông tin đề tài, lý do, các phần cần sửa và timeline.',
  })
  @ApiParam({
    name: 'id',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF file',
    content: {
      'application/pdf': {
        example: 'Binary PDF content',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal or return log not found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: 'Không tìm thấy đề tài hoặc thông tin yêu cầu sửa',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'PDF generation failed',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PDF_GENERATION_FAILED',
          message: 'Không thể tạo PDF. Vui lòng thử lại.',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - chưa đăng nhập',
  })
  async getRevisionPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Get proposal code for filename first (Fix #8: Use public method)
      const proposalCode = await this.pdfService.getProposalCode(id);

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateRevisionPdf(id);

      // Generate filename with timestamp: {code}_revision_{timestamp}.pdf
      const timestamp = new Date().getTime();
      const filename = `${proposalCode}_revision_${timestamp}.pdf`;

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());

      // Send PDF buffer
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException({
        success: false,
        error: {
          code: 'PDF_GENERATION_FAILED',
          message: 'Không thể tạo PDF. Vui lòng thử lại.',
        },
      });
    }
  }

  /**
   * GET /api/proposals/:id/evaluation-pdf
   * Story 5.6: Generate PDF export for evaluation
   *
   * Returns PDF buffer for finalized evaluation with proposal info,
   * evaluation scores and comments, and conclusion. Only available
   * for proposals with FINALIZED evaluation state.
   *
   * RBAC: Only THU_KY_HOI_DONG, PHONG_KHCN, or ADMIN can export evaluation PDF.
   */
  @Get(':id/evaluation-pdf')
  @UseGuards(RolesGuard) // Story 5.6: Enable RBAC check for evaluation PDF export
  @RequireRoles(UserRole.THU_KY_HOI_DONG, UserRole.PHONG_KHCN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xuất PDF đánh giá',
    description:
      'Xuất PDF cho phiếu đánh giá đã hoàn tất với đầy đủ thông tin đề tài, điểm số, nhận xét và kết luận.',
  })
  @ApiParam({
    name: 'id',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF file',
    content: {
      'application/pdf': {
        example: 'Binary PDF content',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Evaluation not finalized',
    schema: {
      example: {
        success: false,
        error: {
          code: 'EVALUATION_NOT_FINALIZED',
          message: 'Chỉ có thể xuất PDF cho phiếu đánh giá đã hoàn tất',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Evaluation not found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'EVALUATION_NOT_FOUND',
          message: 'Không tìm thấy phiếu đánh giá',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'PDF generation failed',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PDF_GENERATION_FAILED',
          message: 'Không thể tạo PDF. Vui lòng thử lại.',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - chưa đăng nhập',
  })
  async getEvaluationPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Get proposal code for filename
      const proposalCode = await this.pdfService.getProposalCode(id);

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateEvaluationPdf(id);

      // Generate filename with timestamp: {code}_evaluation_{timestamp}.pdf
      const timestamp = new Date().getTime();
      const filename = `${proposalCode}_evaluation_${timestamp}.pdf`;

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());

      // Send PDF buffer
      res.send(pdfBuffer);
    } catch (error) {
      // Fix: Use instanceof for proper NestJS exception type checking
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException({
        success: false,
        error: {
          code: 'PDF_GENERATION_FAILED',
          message: 'Không thể tạo PDF. Vui lòng thử lại.',
        },
      });
    }
  }

  /**
   * GET /api/proposals/:id/export
   * GIANG_VIEN Feature: Export proposal to PDF for proposal owners
   *
   * Returns PDF buffer for proposal with option to include evaluation results.
   * Proposal owners (GIANG_VIEN) can export their own proposals.
   *
   * @param id - Proposal ID
   * @param type - Export type: 'summary', 'full', or 'with_evaluation'
   * @param req - Request with user info
   * @param res - Response object for PDF stream
   */
  @Get(':id/export')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.EXPORT_PROPOSAL_PDF)
  @ApiOperation({
    summary: 'Xuất PDF đề tài',
    description:
      'Xuất PDF cho đề tài. Chủ đề tài có thể xuất đề tài của mình. ' +
      'Hỗ trợ các loại: summary (tóm tắt), full (đầy đủ), with_evaluation (có kết quả đánh giá).',
  })
  @ApiParam({
    name: 'id',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF file',
    content: {
      'application/pdf': {
        example: 'Binary PDF content',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not proposal owner',
    schema: {
      example: {
        success: false,
        error: {
          code: 'NOT_PROPOSAL_OWNER',
          message: 'Bạn không có quyền xuất đề tài này',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: 'Không tìm thấy đề tài',
        },
      },
    },
  })
  async exportProposalPdf(
    @Param('id') id: string,
    @Req() req: { user: RequestUser },
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Get proposal to verify ownership
      const proposal = await this.pdfService.getProposalForExport(id);

      // Verify user is the proposal owner
      if (proposal.ownerId !== req.user.id) {
        throw new ForbiddenException({
          success: false,
          error: {
            code: 'NOT_PROPOSAL_OWNER',
            message: 'Bạn không có quyền xuất đề tài này',
          },
        });
      }

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateProposalPdf(id);

      // Generate filename: {code}_{timestamp}.pdf
      const timestamp = new Date().getTime();
      const filename = `${proposal.code}_${timestamp}.pdf`;

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());

      // Send PDF buffer
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException({
        success: false,
        error: {
          code: 'PDF_GENERATION_FAILED',
          message: 'Không thể tạo PDF. Vui lòng thử lại.',
        },
      });
    }
  }
}
