import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import {
  AttachmentDto,
  UploadAttachmentResponseDto,
  AttachmentsListResponseDto,
} from './dto';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';

/**
 * User object attached to request by JWT guard
 */
interface RequestUser {
  id: string;
  email: string;
  role: UserRole;
  facultyId: string | null;
}

/**
 * File upload interface for API documentation
 */
class UploadFileDto {
  file!: Express.Multer.File;
}

@ApiTags('attachments')
@Controller('proposals/:id/attachments')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class AttachmentsController {
  private readonly logger = new Logger(AttachmentsController.name);

  constructor(private readonly attachmentsService: AttachmentsService) {}

  /**
   * POST /api/proposals/:id/attachments - Upload file to proposal
   * Only proposal owner can upload to their own DRAFT proposals
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @RequireRoles(UserRole.GIANG_VIEN)
  @ApiOperation({
    summary: 'Tải tài liệu lên đề tài',
    description: 'Upload file vào đề tài. Chỉ đề tài ở trạng thái NHÁP (DRAFT) mới có thể tải tài liệu.',
  })
  @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to upload',
    type: UploadFileDto,
  })
  @ApiResponse({
    status: 201,
    description: 'File được tải lên thành công',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          proposalId: 'uuid',
          fileName: 'uuid-document.pdf',
          fileUrl: '/uploads/uuid-document.pdf',
          fileSize: 1234567,
          mimeType: 'application/pdf',
          uploadedBy: 'user-uuid',
          uploadedAt: '2026-01-06T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
    schema: {
      example: {
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File quá 5MB. Vui lòng nén hoặc chia nhỏ.',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - proposal not in DRAFT state',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PROPOSAL_NOT_DRAFT',
          message: 'Không thể tải lên khi hồ sơ không ở trạng thái nháp.',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not owner',
    schema: {
      example: {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền tải tài liệu lên đề tài này.',
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
          message: 'Đề tài với ID không tồn tại',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async upload(
    @Param('id') proposalId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
    @CurrentUser('id') userId: string,
  ): Promise<UploadAttachmentResponseDto> {
    if (!file) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NO_FILE_PROVIDED',
          message: 'Vui lòng chọn file để tải lên.',
        },
      });
    }

    this.logger.log(
      `User ${userId} uploading file ${file.originalname} (${file.size} bytes) to proposal ${proposalId}`,
    );

    const attachment = await this.attachmentsService.uploadFile(
      proposalId,
      file,
      userId,
      {
        uploadDir: process.env.UPLOAD_DIR || '/app/uploads',
        maxFileSize: parseInt(
          process.env.MAX_FILE_SIZE || String(5 * 1024 * 1024),
          10,
        ),
        maxTotalSize: parseInt(
          process.env.MAX_TOTAL_SIZE || String(50 * 1024 * 1024),
          10,
        ),
        uploadTimeout: parseInt(
          process.env.UPLOAD_TIMEOUT || String(30000),
          10,
        ),
      },
    );

    return {
      success: true,
      data: attachment,
    };
  }

  /**
   * GET /api/proposals/:id/attachments - List proposal attachments
   * Authenticated users can view attachments
   */
  @Get()
  @ApiOperation({
    summary: 'Danh sách tài liệu đính kèm',
    description: 'Lấy danh sách tất cả tài liệu đính kèm của một đề tài.',
  })
  @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tài liệu đính kèm',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid',
            proposalId: 'uuid',
            fileName: 'document.pdf',
            fileUrl: '/uploads/uuid-document.pdf',
            fileSize: 1234567,
            mimeType: 'application/pdf',
            uploadedBy: 'user-uuid',
            uploadedAt: '2026-01-06T10:30:00Z',
            deletedAt: null,
          },
        ],
        meta: {
          total: 1,
          totalSize: 1234567,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(
    @Param('id') proposalId: string,
  ): Promise<AttachmentsListResponseDto> {
    const attachments = await this.attachmentsService.getByProposalId(
      proposalId,
    );

    return {
      success: true,
      data: attachments,
      meta: {
        total: attachments.length,
        totalSize: (attachments as typeof attachments & { totalSize: number })
          .totalSize,
      },
    };
  }
}
