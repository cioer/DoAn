import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import {
  HealthStatus,
  DatabaseHealth,
  ErrorRateMetrics,
  ResponseTimeMetrics,
  SessionMetrics,
  BackgroundJobStatus,
  SystemMetrics,
  HealthAlert,
  ActiveSession,
} from './interfaces/health-metrics.interface';

/**
 * Process Uptime
 */
const PROCESS_UPTIME = process.uptime();

/**
 * Health Service
 * Story 10.3: System Health Dashboard
 *
 * Handles system health monitoring and metrics collection.
 *
 * Epic 9 Retro Patterns Applied:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper typing for all data
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private requestMetrics: Array<{ timestamp: number; duration: number; error: boolean }> = [];
  private readonly MAX_METRICS = 1000;

  constructor(private prisma: PrismaService) {}

  /**
   * Get complete health status
   * Story 10.3: AC1 - Health Dashboard Endpoint
   *
   * @returns Complete health status with all metrics
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const timestamp = new Date();

    // Gather all metrics in parallel
    const [
      database,
      errorRate,
      responseTime,
      sessions,
      backgroundJobs,
      systemMetrics,
    ] = await Promise.all([
      this.getDatabaseHealth(),
      this.getErrorRateMetrics(),
      this.getResponseTimeMetrics(),
      this.getSessionMetrics(),
      this.getBackgroundJobStatus(),
      this.getSystemMetrics(),
    ]);

    // Generate alerts based on metrics
    const alerts = this.generateAlerts({
      database,
      errorRate,
      responseTime,
      sessions,
      backgroundJobs,
      systemMetrics,
    });

    // Determine overall status
    const overall = this.determineOverallStatus(alerts);

    return {
      overall,
      timestamp,
      uptime: PROCESS_UPTIME,
      database,
      errorRate,
      responseTime,
      sessions,
      backgroundJobs,
      systemMetrics,
      alerts,
    };
  }

  /**
   * Get database health status
   * Story 10.3: AC3 - Database Connectivity
   */
  private async getDatabaseHealth(): Promise<DatabaseHealth> {
    const startTime = Date.now();

    try {
      // Simple query to check connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      const latency = Date.now() - startTime;

      // Get connection pool info (Prisma doesn't expose this directly, using defaults)
      const connectionPool = {
        active: 1, // Placeholder
        idle: 4, // Placeholder
        total: 5,
        max: 10,
      };

      // Get database size (PostgreSQL specific)
      let size = {
        current: 'Unknown',
        limit: 'Unknown',
        usagePercent: 0,
      };

      try {
        const sizeResult = await this.prisma.$queryRaw<
          Array<{ pg_database_size: string }>
        >`SELECT pg_database_size(current_database()) as pg_database_size`;

        if (sizeResult[0]) {
          const sizeInBytes = parseInt(sizeResult[0].pg_database_size, 10);
          const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
          size = {
            current: `${sizeInMB} MB`,
            limit: '1 GB', // Default limit assumption
            usagePercent: (sizeInBytes / (1024 * 1024 * 1024)) * 100,
          };
        }
      } catch {
        // Size query failed, use defaults
      }

      // Determine status based on latency
      let status: DatabaseHealth['status'] = 'healthy';
      if (latency > 1000) {
        status = 'degraded';
      }
      if (latency > 5000) {
        status = 'down';
      }

      return {
        status,
        latency,
        connectionPool,
        size,
      };
    } catch (error) {
      this.logger.error(`Database health check failed: ${error}`);
      return {
        status: 'down',
        latency: -1,
        connectionPool: {
          active: 0,
          idle: 0,
          total: 0,
          max: 10,
        },
        size: {
          current: 'Unknown',
          limit: 'Unknown',
          usagePercent: 0,
        },
      };
    }
  }

  /**
   * Get error rate metrics
   * Story 10.3: AC4 - Error Rate Tracking
   */
  private getErrorRateMetrics(): ErrorRateMetrics {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Filter metrics by time
    const lastHourMetrics = this.requestMetrics.filter((m) => m.timestamp >= oneHourAgo);
    const lastDayMetrics = this.requestMetrics.filter((m) => m.timestamp >= oneDayAgo);

    // Calculate error rates
    const lastHourErrors = lastHourMetrics.filter((m) => m.error).length;
    const lastDayErrors = lastDayMetrics.filter((m) => m.error).length;

    const totalRequests = this.requestMetrics.length;
    const errorRequests = this.requestMetrics.filter((m) => m.error).length;
    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;

    // Determine trend
    let trend: ErrorRateMetrics['trend'] = 'stable';
    if (lastHourMetrics.length > 10) {
      const recentErrorRate = (lastHourErrors / lastHourMetrics.length) * 100;
      if (recentErrorRate > errorRate + 5) {
        trend = 'up';
      } else if (recentErrorRate < errorRate - 5) {
        trend = 'down';
      }
    }

    return {
      totalRequests,
      errorRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      trend,
      lastHourErrors,
      lastDayErrors,
    };
  }

  /**
   * Get response time metrics
   * Story 10.3: AC5 - Response Time Tracking
   */
  private getResponseTimeMetrics(): ResponseTimeMetrics {
    if (this.requestMetrics.length === 0) {
      return {
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        trend: 'stable',
      };
    }

    // Extract durations
    const durations = this.requestMetrics.map((m) => m.duration).sort((a, b) => a - b);

    // Calculate percentiles
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const p50 = durations[Math.floor(durations.length * 0.5)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    // Determine trend (comparing recent vs overall)
    let trend: ResponseTimeMetrics['trend'] = 'stable';
    const recentCount = Math.min(50, durations.length);
    if (recentCount > 10) {
      const recentAvg =
        durations.slice(-recentCount).reduce((a, b) => a + b, 0) / recentCount;
      if (recentAvg > avg * 1.2) {
        trend = 'up';
      } else if (recentAvg < avg * 0.8) {
        trend = 'down';
      }
    }

    return {
      avg: Math.round(avg),
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      trend,
    };
  }

  /**
   * Get session metrics
   * Story 10.3: AC6 - Active Sessions
   */
  private async getSessionMetrics(): Promise<SessionMetrics> {
    // Get active sessions from refresh tokens (sessions with valid tokens)
    const now = new Date();
    const activeTokens = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: now },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Group by role
    const byRole: Record<string, number> = {};
    activeTokens.forEach((token) => {
      const role = token.user.role;
      byRole[role] = (byRole[role] || 0) + 1;
    });

    // Count recent logins (last 24 hours)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentLogins = await this.prisma.refreshToken.count({
      where: {
        createdAt: { gte: oneDayAgo },
      },
    });

    // Build active sessions list
    const sessions: ActiveSession[] = activeTokens.map((token) => ({
      userId: token.user.id,
      email: token.user.email,
      role: token.user.role,
      loginTime: token.createdAt,
      lastActivity: token.createdAt, // Placeholder - we don't track this
      ip: 'Unknown', // Placeholder - we don't store IP
    }));

    return {
      totalActive: activeTokens.length,
      byRole,
      recentLogins,
      sessions,
    };
  }

  /**
   * Get background job status
   * Story 10.3: AC7 - Background Jobs
   */
  private async getBackgroundJobStatus(): Promise<BackgroundJobStatus> {
    // For now, return placeholder values
    // In a real implementation, you would query your job queue (e.g., Bull, Agenda)
    return {
      status: 'idle',
      activeJobs: 0,
      queuedJobs: 0,
      failedJobs: 0,
      completedJobs: 0,
    };
  }

  /**
   * Get system metrics
   * Story 10.3: AC8 - System Metrics
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    // Get memory usage from Node.js
    const memUsage = process.memoryUsage();
    const usedMemory = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
    const totalMemory = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // CPU usage (placeholder - Node.js doesn't provide direct CPU usage)
    const cpuUsage = process.cpuUsage();

    return {
      cpu: {
        usagePercent: Math.round((cpuUsage.user + cpuUsage.system) / 1000000), // Very rough estimate
        cores: require('os').cpus().length,
      },
      memory: {
        used: `${usedMemory} MB`,
        total: `${totalMemory} MB`,
        usagePercent: Math.round(memoryUsagePercent * 100) / 100,
      },
      disk: {
        used: 'Unknown',
        total: 'Unknown',
        usagePercent: 0,
      },
    };
  }

  /**
   * Record a request metric
   * Called by middleware/interceptor
   */
  recordRequest(duration: number, error: boolean): void {
    this.requestMetrics.push({
      timestamp: Date.now(),
      duration,
      error,
    });

    // Trim old metrics
    if (this.requestMetrics.length > this.MAX_METRICS) {
      this.requestMetrics = this.requestMetrics.slice(-this.MAX_METRICS);
    }
  }

  /**
   * Generate health alerts based on metrics
   */
  private generateAlerts(metrics: {
    database: DatabaseHealth;
    errorRate: ErrorRateMetrics;
    responseTime: ResponseTimeMetrics;
    sessions: SessionMetrics;
    backgroundJobs: BackgroundJobStatus;
    systemMetrics: SystemMetrics;
  }): HealthAlert[] {
    const alerts: HealthAlert[] = [];
    const now = new Date();

    // Database alerts
    if (metrics.database.status === 'down') {
      alerts.push({
        severity: 'critical',
        message: 'Cơ sở dữ liệu không thể kết nối',
        timestamp: now,
        metric: 'database',
      });
    } else if (metrics.database.status === 'degraded') {
      alerts.push({
        severity: 'warning',
        message: 'Độ trễ cơ sở dữ liệu cao',
        timestamp: now,
        metric: 'database',
      });
    }

    // Error rate alerts
    if (metrics.errorRate.errorRate > 10) {
      alerts.push({
        severity: 'critical',
        message: `Tỷ lệ lỗi cao: ${metrics.errorRate.errorRate.toFixed(2)}%`,
        timestamp: now,
        metric: 'errorRate',
      });
    } else if (metrics.errorRate.errorRate > 5) {
      alerts.push({
        severity: 'warning',
        message: `Tỷ lệ lỗi tăng: ${metrics.errorRate.errorRate.toFixed(2)}%`,
        timestamp: now,
        metric: 'errorRate',
      });
    }

    // Response time alerts
    if (metrics.responseTime.p95 > 2000) {
      alerts.push({
        severity: 'critical',
        message: `Thời gian phản hồi chậm: P95 ${metrics.responseTime.p95}ms`,
        timestamp: now,
        metric: 'responseTime',
      });
    } else if (metrics.responseTime.p95 > 1000) {
      alerts.push({
        severity: 'warning',
        message: `Thời gian phản hồi tăng: P95 ${metrics.responseTime.p95}ms`,
        timestamp: now,
        metric: 'responseTime',
      });
    }

    // Memory alerts
    if (metrics.systemMetrics.memory.usagePercent > 90) {
      alerts.push({
        severity: 'critical',
        message: `Sử dụng bộ nhớ cao: ${metrics.systemMetrics.memory.usagePercent}%`,
        timestamp: now,
        metric: 'memory',
      });
    } else if (metrics.systemMetrics.memory.usagePercent > 80) {
      alerts.push({
        severity: 'warning',
        message: `Sử dụng bộ nhớ tăng: ${metrics.systemMetrics.memory.usagePercent}%`,
        timestamp: now,
        metric: 'memory',
      });
    }

    return alerts;
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(alerts: HealthAlert[]): HealthStatus['overall'] {
    const hasCritical = alerts.some((a) => a.severity === 'critical');
    const hasWarning = alerts.some((a) => a.severity === 'warning');

    if (hasCritical) {
      return 'down';
    } else if (hasWarning) {
      return 'degraded';
    }
    return 'healthy';
  }
}
