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
}
