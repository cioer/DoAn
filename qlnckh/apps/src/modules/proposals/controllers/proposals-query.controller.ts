import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    HttpCode,
    HttpStatus,
    UseGuards,
    UseInterceptors,
    ParseArrayPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { ProposalsService } from '../proposals.service';
import { DossierExportService, DossierPackType } from '../dossier-export.service';
import { ProposalWithTemplateDto, PaginatedProposalsDto } from '../dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole, ProjectState, SectionId } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../rbac/guards/roles.guard';
import { IdempotencyInterceptor } from '../../../common/interceptors';

interface RequestUser {
    id: string;
    email: string;
    displayName?: string;
    role: UserRole;
    facultyId: string | null;
}

/**
 * ProposalsQueryController
 * Handles advanced query endpoints and dossier exports.
 */
@ApiTags('proposals')
@Controller('proposals')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(IdempotencyInterceptor)
@ApiBearerAuth()
export class ProposalsQueryController {
    constructor(
        private readonly proposalsService: ProposalsService,
        private readonly dossierExportService: DossierExportService,
    ) { }

    /**
     * GET /api/proposals/filter - List proposals with advanced filters
     * NOTE: This route must come BEFORE :id route to avoid path conflict
     */
    @Get('filter')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Danh sách đề tài với bộ lọc mở rộng' })
    @ApiQuery({ name: 'ownerId', required: false })
    @ApiQuery({ name: 'state', required: false, enum: ProjectState })
    @ApiQuery({ name: 'facultyId', required: false })
    @ApiQuery({ name: 'holderUnit', required: false })
    @ApiQuery({ name: 'holderUser', required: false })
    @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiResponse({ status: 200, description: 'Danh sách đề tài đã lọc' })
    async findAllWithFilters(
        @Query('ownerId') ownerId?: string,
        @Query('state') state?: ProjectState,
        @Query('facultyId') facultyId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ): Promise<PaginatedProposalsDto> {
        const pageSize = limit ? parseInt(limit, 10) : 20;
        const pageNum = page ? parseInt(page, 10) : 1;
        const skip = (pageNum - 1) * pageSize;

        return this.proposalsService.findAllWithFilters({
            ownerId,
            state,
            facultyId,
            skip,
            take: pageSize,
        });
    }

    /**
     * GET /api/proposals/holder/my-queue - Get proposals waiting for current user
     * NOTE: This route must come BEFORE :id route to avoid path conflict
     */
    @Get('holder/my-queue')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Đề tài đang chờ tôi xử lý' })
    @ApiQuery({ name: 'state', required: false, enum: ProjectState })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiResponse({ status: 200, description: 'Danh sách đề tài trong hàng chờ' })
    async findMyQueue(
        @CurrentUser() user: RequestUser,
        @Query('state') state?: ProjectState,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ): Promise<PaginatedProposalsDto> {
        const pageSize = limit ? parseInt(limit, 10) : 20;
        const pageNum = page ? parseInt(page, 10) : 1;
        const skip = (pageNum - 1) * pageSize;

        return this.proposalsService.findByHolder({
            holderUser: user.id,
            state,
            skip,
            take: pageSize,
        });
    }

    /**
     * GET /api/proposals/:id/sections - Get proposal with specific sections
     */
    @Get(':id/sections')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Lấy đề tài với các section cụ thể' })
    @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
    @ApiQuery({ name: 'sections', required: true, description: 'Array of section IDs' })
    @ApiResponse({ status: 200, description: 'Proposal with filtered sections', type: ProposalWithTemplateDto })
    async findOneWithSections(
        @Param('id') id: string,
        @Query('sections', new ParseArrayPipe({ items: String, separator: ',' })) sectionIds: string[],
        @CurrentUser() user: RequestUser,
    ): Promise<ProposalWithTemplateDto> {
        const validSectionIds: SectionId[] = [];
        for (const sectionId of sectionIds) {
            if (Object.values(SectionId).includes(sectionId as SectionId)) {
                validSectionIds.push(sectionId as SectionId);
            }
        }
        return this.proposalsService.findOneWithSections(id, validSectionIds, user.id);
    }

    // ========================================================================
    // Story 6.6: Dossier Export Endpoints
    // ========================================================================

    /**
     * GET /api/proposals/:id/dossier-status/:packType - Get dossier pack status
     */
    @Get(':id/dossier-status/:packType')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Kiểm tra trạng thái hồ sơ xuất' })
    @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
    @ApiParam({ name: 'packType', description: 'Loại hồ sơ', enum: DossierPackType })
    @ApiResponse({ status: 200, description: 'Trạng thái hồ sơ' })
    async getDossierPackStatus(
        @Param('id') id: string,
        @Param('packType') packType: DossierPackType,
        @CurrentUser() user: RequestUser,
    ): Promise<{ ready: boolean; state: ProjectState; message: string }> {
        return this.dossierExportService.getDossierPackStatus(id, packType);
    }

    /**
     * POST /api/proposals/:id/dossier/:packType - Generate dossier pack ZIP
     */
    @Post(':id/dossier/:packType')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xuất hồ sơ (ZIP)' })
    @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
    @ApiParam({ name: 'packType', description: 'Loại hồ sơ', enum: DossierPackType })
    @ApiResponse({ status: 200, description: 'Thông tin file ZIP đã tạo' })
    async generateDossierPack(
        @Param('id') id: string,
        @Param('packType') packType: DossierPackType,
        @CurrentUser() user: RequestUser,
        @Query('ip') ip?: string,
        @Query('userAgent') userAgent?: string,
        @Query('requestId') requestId?: string,
    ): Promise<{
        zipId: string;
        fileName: string;
        fileUrl: string;
        fileSize: number;
        createdAt: Date;
        expiresAt: Date;
    }> {
        return this.dossierExportService.generateDossierPack(id, packType, user.id, user.role, {
            userId: user.id,
            ip,
            userAgent,
            requestId,
        });
    }
}
