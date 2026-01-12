import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { HealthService } from './health.service';
import {
  DashboardResponseDto,
  BulkRemindOverdueResultDto,
} from './dto/dashboard.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
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

/**
 * Dashboard Controller
 * Story 8.4: Morning Check Dashboard (KPI + Overdue List)
 *
 * Handles dashboard operations:
 * - Get dashboard KPI data
 * - Get overdue proposals list
 * - Bulk remind all overdue proposals
 *
 * All endpoints require PHONG_KHCN or ADMIN role.
 */
@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly healthService: HealthService,
  ) {}

  /**
   * GET /api/dashboard
   * Story 8.4: AC1 - Dashboard Access
   * Story 8.4: AC2 - KPI Cards
   * Story 8.4: AC4 - Overdue List Table
   *
   * Returns complete dashboard data including:
   * - KPI metrics (total waiting, overdue, T-2 warning, completed this month)
   * - Overdue proposals list
   *
   * Only PHONG_KHCN and ADMIN roles can access dashboard.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.PHONG_KHCN, UserRole.ADMIN)
  @RequirePermissions(Permission.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'Lấy dữ liệu dashboard tổng quan',
    description:
      'Trả về KPI metrics và danh sách hồ sơ quá hạn. Chỉ PHONG_KHCN và ADMIN mới có thể truy cập.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          kpi: {
            totalWaiting: 15,
            overdueCount: 3,
            t2WarningCount: 5,
            completedThisMonth: 8,
          },
          overdueList: [
            {
              id: 'uuid-1',
              code: 'DT-2024-001',
              title: 'Nghiên cứu AI',
              holderName: 'Nguyễn Văn A',
              holderEmail: 'nguyenvan@example.com',
              overdueDays: 5,
              slaDeadline: '2024-01-01T17:00:00.000Z',
              slaStatus: 'overdue',
              state: 'FACULTY_REVIEW',
            },
          ],
          lastUpdated: '2024-01-07T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user lacks required role',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Bạn không có quyền thực hiện thao tác này',
        },
      },
    },
  })
  async getDashboard(
    @CurrentUser() user: RequestUser,
  ): Promise<DashboardResponseDto> {
    // Validate permissions
    this.dashboardService.validateDashboardPermission(user.role);

    // Get dashboard data
    const data = await this.dashboardService.getDashboardData();

    return {
      success: true,
      data,
    };
  }

  /**
   * POST /api/dashboard/remind-overdue
   * Story 8.4: AC7 - Quick Actions
   *
   * Sends reminder emails to all holders of overdue proposals.
   * Only PHONG_KHCN and ADMIN roles can perform this action.
   */
  @Post('remind-overdue')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.PHONG_KHCN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Gửi email nhắc tất cả hồ sơ quá hạn',
    description:
      'Gửi email nhắc cho người xử lý của tất cả hồ sơ quá hạn. Chỉ PHONG_KHCN và ADMIN mới có thể thực hiện.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reminders sent successfully',
    schema: {
      example: {
        success: true,
        data: {
          success: 2,
          failed: 0,
          total: 2,
          recipients: [
            {
              userId: 'user-uuid-1',
              userName: 'Nguyễn Văn A',
              emailSent: true,
            },
            {
              userId: 'user-uuid-2',
              userName: 'Trần Văn B',
              emailSent: true,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user lacks required role',
  })
  async remindAllOverdue(
    @CurrentUser() user: RequestUser,
    @Body('ip') ip?: string,
    @Body('userAgent') userAgent?: string,
    @Body('requestId') requestId?: string,
  ): Promise<BulkRemindOverdueResultDto> {
    // Validate permissions
    this.dashboardService.validateDashboardPermission(user.role);

    // Execute bulk remind
    const result = await this.dashboardService.remindAllOverdue({
      userId: user.id,
      userRole: user.role,
      ip,
      userAgent,
      requestId,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /api/dashboard/health
   * Story 10.3: System Health Dashboard
   *
   * Returns comprehensive system health status including:
   * - Database connectivity and latency
   * - Error rate metrics
   * - Response time metrics
   * - Active user sessions
   * - Background job status
   * - System resource usage
   * - Health alerts
   *
   * Only ADMIN role can access health dashboard.
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Lấy trạng thái sức khỏe hệ thống',
    description:
      'Trả về chi tiết sức khỏe hệ thống bao gồm cơ sở dữ liệu, tỷ lệ lỗi, thời gian phản hồi, phiên hoạt động, v.v. Chỉ ADMIN mới có thể truy cập.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          overall: 'healthy',
          timestamp: '2024-01-07T10:00:00.000Z',
          uptime: 3600,
          database: {
            status: 'healthy',
            latency: 50,
            connectionPool: { active: 1, idle: 4, total: 5, max: 10 },
            size: { current: '150.5 MB', limit: '1 GB', usagePercent: 15 },
          },
          errorRate: {
            totalRequests: 1000,
            errorRequests: 10,
            errorRate: 1,
            trend: 'stable',
          },
          responseTime: { avg: 120, p50: 100, p95: 200, p99: 500 },
          sessions: { totalActive: 25, byRole: { ADMIN: 2, GIANG_VIEN: 23 } },
          backgroundJobs: { status: 'idle', activeJobs: 0 },
          systemMetrics: {
            cpu: { usagePercent: 45, cores: 4 },
            memory: { used: '512 MB', total: '1024 MB', usagePercent: 50 },
          },
          alerts: [],
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user lacks ADMIN role',
  })
  async getHealthStatus(
    @CurrentUser() user: RequestUser,
  ) {
    // Only ADMIN can access health dashboard
    if (user.role !== UserRole.ADMIN) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Chỉ Admin mới có thể xem thông tin sức khỏe hệ thống',
        },
      });
    }

    const healthStatus = await this.healthService.getHealthStatus();

    return {
      success: true,
      data: healthStatus,
    };
  }

  /**
   * GET /api/dashboard/researcher
   * GIANG_VIEN Feature: Personal dashboard for researchers
   * Returns personal proposal statistics and recent activity
   *
   * @param user - Current user from JWT
   * @returns Personal dashboard data
   */
  @Get('researcher')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'Lấy dữ liệu dashboard cá nhân cho giảng viên',
    description:
      'Trả về thống kê đề tài cá nhân, đề tài gần đây và hạn chờ sắp tới. ' +
      'Yêu cầu quyền DASHBOARD_VIEW.',
  })
  @ApiResponse({
    status: 200,
    description: 'Personal dashboard data retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          stats: {
            total: 10,
            draft: 2,
            underReview: 3,
            approved: 4,
            rejected: 1,
            changesRequested: 0,
          },
          recentProposals: [
            {
              id: 'uuid-1',
              code: 'NCKH-2024-001',
              title: 'Nghiên cứu AI',
              state: 'APPROVED',
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-05T00:00:00.000Z',
              slaDeadline: '2024-01-10T00:00:00.000Z',
            },
          ],
          upcomingDeadlines: [
            {
              proposalId: 'uuid-2',
              proposalCode: 'NCKH-2024-002',
              proposalTitle: 'Nghiên cứu Blockchain',
              deadline: '2024-01-15T00:00:00.000Z',
              daysRemaining: 5,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user lacks DASHBOARD_VIEW permission',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Bạn không có quyền thực hiện thao tác này',
        },
      },
    },
  })
  async getResearcherDashboard(@CurrentUser() user: RequestUser) {
    const data = await this.dashboardService.getResearcherDashboardData(user.id);

    return {
      success: true,
      data,
    };
  }

  /**
   * GET /api/dashboard/faculty
   * Faculty Dashboard for QUAN_LY_KHOA
   * Returns faculty-specific KPI and proposal list
   */
  @Get('faculty')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.QUAN_LY_KHOA)
  @RequirePermissions(Permission.FACULTY_DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'Lấy dữ liệu dashboard cấp Khoa',
    description:
      'Trả về KPI và danh sách đề tài của khoa. Chỉ QUAN_LY_KHOA có quyền FACULTY_DASHBOARD_VIEW mới có thể truy cập.',
  })
  @ApiResponse({
    status: 200,
    description: 'Faculty dashboard data retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          kpi: {
            totalProposals: 25,
            pendingReview: 5,
            approved: 10,
            returned: 2,
            inProgress: 3,
            completed: 5,
          },
          recentProposals: [
            {
              id: 'uuid-1',
              code: 'DT-2024-001',
              title: 'Nghiên cứu AI',
              state: 'FACULTY_REVIEW',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user lacks required role or permission',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Bạn không có quyền thực hiện thao tác này',
        },
      },
    },
  })
  async getFacultyDashboard(@CurrentUser() user: RequestUser) {
    // Validate faculty context
    if (!user.facultyId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FACULTY_CONTEXT_REQUIRED',
          message: 'Faculty context required for QUAN_LY_KHOA role',
        },
      });
    }

    const data = await this.dashboardService.getFacultyDashboardData(user.facultyId);

    return {
      success: true,
      data,
    };
  }
}
