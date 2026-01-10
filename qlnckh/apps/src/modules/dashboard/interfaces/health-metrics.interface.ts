/**
 * System Health Metrics Interface
 * Story 10.3: System Health Dashboard
 *
 * Epic 9 Retro: Proper interface, NO as unknown
 */

/**
 * Database Health Status
 */
export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'down';
  latency: number; // milliseconds
  connectionPool: {
    active: number;
    idle: number;
    total: number;
    max: number;
  };
  size: {
    current: string; // e.g., "150.5 MB"
    limit: string;
    usagePercent: number;
  };
}

/**
 * Error Rate Metrics
 */
export interface ErrorRateMetrics {
  totalRequests: number;
  errorRequests: number;
  errorRate: number; // percentage
  trend: 'up' | 'down' | 'stable';
  lastHourErrors: number;
  lastDayErrors: number;
}

/**
 * Response Time Metrics
 */
export interface ResponseTimeMetrics {
  avg: number; // milliseconds
  p50: number;
  p95: number;
  p99: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Active Session Info
 */
export interface ActiveSession {
  userId: string;
  email: string;
  role: string;
  loginTime: Date;
  lastActivity: Date;
  ip: string;
}

/**
 * Session Metrics
 */
export interface SessionMetrics {
  totalActive: number;
  byRole: Record<string, number>;
  recentLogins: number; // last 24 hours
  sessions: ActiveSession[];
}

/**
 * Background Job Status
 */
export interface BackgroundJobStatus {
  status: 'running' | 'idle' | 'error';
  activeJobs: number;
  queuedJobs: number;
  failedJobs: number;
  completedJobs: number;
  lastJobTime?: Date;
}

/**
 * System Resource Metrics
 */
export interface SystemMetrics {
  cpu: {
    usagePercent: number;
    cores: number;
  };
  memory: {
    used: string;
    total: string;
    usagePercent: number;
  };
  disk: {
    used: string;
    total: string;
    usagePercent: number;
  };
}

/**
 * Complete Health Status
 */
export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'down';
  timestamp: Date;
  uptime: number; // seconds
  database: DatabaseHealth;
  errorRate: ErrorRateMetrics;
  responseTime: ResponseTimeMetrics;
  sessions: SessionMetrics;
  backgroundJobs: BackgroundJobStatus;
  systemMetrics: SystemMetrics;
  alerts: HealthAlert[];
}

/**
 * Health Alert
 */
export interface HealthAlert {
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  metric?: string;
}
