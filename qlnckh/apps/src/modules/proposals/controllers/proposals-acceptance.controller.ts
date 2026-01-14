import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { ProposalsService } from '../proposals.service';
import { ProposalWithTemplateDto } from '../dto';
import {
    SubmitFacultyAcceptanceDto,
    FacultyAcceptanceDecisionDto,
    SchoolAcceptanceDecisionDto,
    CompleteHandoverDto,
    SaveHandoverChecklistDto,
} from '../dto';
import { RequireRoles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
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
 * ProposalsAcceptanceController
 * Handles Acceptance & Handover endpoints (Epic 6).
 */
@ApiTags('proposals')
@Controller('proposals')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(IdempotencyInterceptor)
@ApiBearerAuth()
export class ProposalsAcceptanceController {
    constructor(private readonly proposalsService: ProposalsService) { }

    /**
     * POST /api/proposals/:id/start - Start project execution
     */
    @Post(':id/start')
    @HttpCode(HttpStatus.OK)
    @RequireRoles(UserRole.GIANG_VIEN)
    @ApiOperation({ summary: 'Bắt đầu thực hiện đề tài', description: 'Chuyển đề tài từ DUYỆT sang ĐANG THỰC HIỆN.' })
    @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
    @ApiResponse({ status: 200, description: 'Đề tài đã được bắt đầu', type: ProposalWithTemplateDto })
    @ApiResponse({ status: 400, description: 'Bad request - proposal not in APPROVED state' })
    @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
    @ApiResponse({ status: 404, description: 'Proposal not found' })
    async startProject(
        @Param('id') id: string,
        @CurrentUser() user: RequestUser,
        @Query('ip') ip?: string,
        @Query('userAgent') userAgent?: string,
        @Query('requestId') requestId?: string,
    ): Promise<ProposalWithTemplateDto> {
        return this.proposalsService.startProject(id, user.id, {
            userId: user.id,
            userDisplayName: user.displayName,
            ip,
            userAgent,
            requestId,
        });
    }

    /**
     * POST /api/proposals/:id/faculty-acceptance - Submit faculty acceptance review
     */
    @Post(':id/faculty-acceptance')
    @HttpCode(HttpStatus.OK)
    @RequireRoles(UserRole.GIANG_VIEN)
    @ApiOperation({ summary: 'Nộp hồ sơ nghiệm thu cấp Khoa', description: 'Chuyển đề tài từ ĐANG THỰC HIỆN sang NGHIỆM THU KHOA.' })
    @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
    @ApiResponse({ status: 200, description: 'Đã nộp hồ sơ nghiệm thu', type: ProposalWithTemplateDto })
    @ApiResponse({ status: 400, description: 'Bad request - validation error or invalid state' })
    @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
    async submitFacultyAcceptance(
        @Param('id') id: string,
        @Body() dto: SubmitFacultyAcceptanceDto,
        @CurrentUser() user: RequestUser,
        @Query('ip') ip?: string,
        @Query('userAgent') userAgent?: string,
        @Query('requestId') requestId?: string,
    ): Promise<ProposalWithTemplateDto> {
        const serviceDto = {
            results: dto.results,
            products: dto.products.map(p => ({
                name: p.name,
                type: p.type,
                note: p.note,
                attachmentId: p.attachmentId,
            })),
            attachmentIds: dto.attachmentIds,
        };
        return this.proposalsService.submitFacultyAcceptance(id, serviceDto, user.id, {
            userId: user.id,
            userDisplayName: user.displayName,
            ip,
            userAgent,
            requestId,
        });
    }

    /**
     * POST /api/proposals/:id/faculty-acceptance-decision - Faculty acceptance decision
     */
    @Post(':id/faculty-acceptance-decision')
    @HttpCode(HttpStatus.OK)
    @RequireRoles(UserRole.QUAN_LY_KHOA, UserRole.ADMIN)
    @ApiOperation({ summary: 'Nghiệm thu cấp Khoa', description: 'Quản lý Khoa duyệt/không duyệt nghiệm thu.' })
    @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
    @ApiResponse({ status: 200, description: 'Đã ra quyết định nghiệm thu', type: ProposalWithTemplateDto })
    async facultyAcceptanceDecision(
        @Param('id') id: string,
        @Body() dto: FacultyAcceptanceDecisionDto,
        @CurrentUser() user: RequestUser,
    ): Promise<ProposalWithTemplateDto> {
        const serviceDto = {
            decision: dto.decision as 'DAT' | 'KHONG_DAT',
            comments: dto.comments,
        };
        return this.proposalsService.facultyAcceptance(id, serviceDto, user.id);
    }

    /**
     * GET /api/proposals/:id/faculty-acceptance-data - Get faculty acceptance data
     */
    @Get(':id/faculty-acceptance-data')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Lấy dữ liệu nghiệm thu Khoa', description: 'Lấy thông tin hồ sơ nghiệm thu để xem xét' })
    @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
    @ApiResponse({ status: 200, description: 'Dữ liệu nghiệm thu Khoa' })
    async getFacultyAcceptanceData(
        @Param('id') id: string,
        @CurrentUser() user: RequestUser,
    ): Promise<{
        results?: string;
        products?: Array<{ id: string; name: string; type: string; note?: string }>;
        submittedAt?: string;
    }> {
        return this.proposalsService.getFacultyAcceptanceData(id);
    }

    /**
     * POST /api/proposals/:id/school-acceptance-decision - School acceptance decision
     */
    @Post(':id/school-acceptance-decision')
    @HttpCode(HttpStatus.OK)
    @RequireRoles(UserRole.PHONG_KHCN, UserRole.THU_KY_HOI_DONG, UserRole.ADMIN)
    @ApiOperation({ summary: 'Nghiệm thu cấp Trường', description: 'Phòng KHCN duyệt/không duyệt nghiệm thu.' })
    @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
    @ApiResponse({ status: 200, description: 'Đã ra quyết định nghiệm thu', type: ProposalWithTemplateDto })
    async schoolAcceptanceDecision(
        @Param('id') id: string,
        @Body() dto: SchoolAcceptanceDecisionDto,
        @CurrentUser() user: RequestUser,
    ): Promise<ProposalWithTemplateDto> {
        const serviceDto = {
            decision: dto.decision as 'DAT' | 'KHONG_DAT',
            comments: dto.comments,
        };
        return this.proposalsService.schoolAcceptance(id, serviceDto, user.id, user.role, user.facultyId);
    }

    /**
     * GET /api/proposals/:id/school-acceptance-data - Get school acceptance data
     */
    @Get(':id/school-acceptance-data')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Lấy dữ liệu nghiệm thu Trường' })
    @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
    @ApiResponse({ status: 200, description: 'Dữ liệu nghiệm thu Trường' })
    async getSchoolAcceptanceData(
        @Param('id') id: string,
        @CurrentUser() user: RequestUser,
    ): Promise<{
        facultyDecision?: { decision: string; decidedAt: string; comments?: string };
        results?: string;
        products?: Array<{ id: string; name: string; type: string; note?: string }>;
    }> {
        return this.proposalsService.getSchoolAcceptanceData(id);
    }

    /**
     * PATCH /api/proposals/:id/handover-checklist - Save handover checklist draft
     */
    @Patch(':id/handover-checklist')
    @HttpCode(HttpStatus.OK)
    @RequireRoles(UserRole.GIANG_VIEN)
    @ApiOperation({ summary: 'Lưu nháp checklist bàn giao', description: 'Tự động lưu checklist bàn giao.' })
    @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
    @ApiResponse({ status: 200, description: 'Checklist đã được lưu', type: ProposalWithTemplateDto })
    async saveHandoverChecklist(
        @Param('id') id: string,
        @Body() dto: SaveHandoverChecklistDto,
        @CurrentUser() user: RequestUser,
    ): Promise<ProposalWithTemplateDto> {
        const serviceDto = {
            checklist: dto.checklist.map(item => ({
                id: item.id,
                checked: item.checked,
                note: item.note,
            })),
        };
        return this.proposalsService.saveHandoverChecklist(id, serviceDto.checklist, user.id);
    }

    /**
     * POST /api/proposals/:id/complete-handover - Complete handover
     */
    @Post(':id/complete-handover')
    @HttpCode(HttpStatus.OK)
    @RequireRoles(UserRole.GIANG_VIEN)
    @ApiOperation({ summary: 'Hoàn thành bàn giao', description: 'Chuyển đề tài từ BÀN GIAO sang HOÀN THÀNH.' })
    @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
    @ApiResponse({ status: 200, description: 'Đã hoàn thành bàn giao', type: ProposalWithTemplateDto })
    async completeHandover(
        @Param('id') id: string,
        @Body() dto: CompleteHandoverDto,
        @CurrentUser() user: RequestUser,
    ): Promise<ProposalWithTemplateDto> {
        return this.proposalsService.completeHandover(id, user.id, user.role, user.facultyId);
    }
}
