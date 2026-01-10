import { apiClient } from '../auth/auth';

/**
 * Audit Event Types
 */
export interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  changes?: Record<string, { old?: unknown; new?: unknown }>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

/**
 * Audit Statistics
 */
export interface AuditStatistics {
  totalEvents: number;
  byActionType: Record<string, number>;
  byEntityType: Record<string, number>;
  byActor: Record<string, { name: string; email: string; count: number }>;
  byDate: Record<string, number>;
}

/**
 * Audit Query Parameters
 */
export interface AuditQueryParams {
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Paginated Audit Response
 */
export interface AuditListResponse {
  success: true;
  data: {
    events: AuditEvent[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

/**
 * Statistics Response
 */
export interface AuditStatisticsResponse {
  success: true;
  data: AuditStatistics;
}

/**
 * Timeline Group
 */
export interface TimelineGroup {
  date: string;
  events: AuditEvent[];
  count: number;
}

/**
 * Timeline Response
 */
export interface AuditTimelineResponse {
  success: true;
  data: {
    groups: TimelineGroup[];
    meta: {
      total: number;
      totalGroups: number;
    };
  };
}

/**
 * Audit API Client
 *
 * All audit log API calls for ADMIN users
 */
export const auditApi = {
  /**
   * Get paginated audit logs with filters
   */
  getAuditLogs: async (params: AuditQueryParams = {}): Promise<AuditListResponse> => {
    const {
      entityType,
      entityId,
      actorUserId,
      action,
      fromDate,
      toDate,
      page = 1,
      limit = 50,
    } = params;

    const queryParams = new URLSearchParams();
    queryParams.append('page', String(page));
    queryParams.append('limit', String(limit));
    if (entityType) queryParams.append('entity_type', entityType);
    if (entityId) queryParams.append('entity_id', entityId);
    if (actorUserId) queryParams.append('actor_user_id', actorUserId);
    if (action) queryParams.append('action', action);
    if (fromDate) queryParams.append('from_date', fromDate);
    if (toDate) queryParams.append('to_date', toDate);

    const response = await apiClient.get<AuditListResponse>(
      `/audit?${queryParams.toString()}`,
    );

    return response.data;
  },

  /**
   * Get audit history for a specific entity
   */
  getEntityHistory: async (entityType: string, entityId: string): Promise<AuditEvent[]> => {
    const response = await apiClient.get<{ success: true; data: { events: AuditEvent[] }; meta: { total: number } }>(
      `/audit/entity/${entityType}/${entityId}`,
    );

    return response.data.data.events;
  },

  /**
   * Get audit statistics
   */
  getStatistics: async (): Promise<AuditStatistics> => {
    const response = await apiClient.get<AuditStatisticsResponse>(`/audit/statistics`);

    return response.data.data;
  },

  /**
   * Get audit logs grouped by action type
   */
  getGroupedLogs: async (params: AuditQueryParams = {}): Promise<AuditListResponse> => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const response = await apiClient.get<AuditListResponse>(
      `/audit/grouped?${queryParams.toString()}`,
    );

    return response.data;
  },

  /**
   * Get audit logs in timeline view
   */
  getTimeline: async (params: AuditQueryParams = {}): Promise<AuditTimelineResponse> => {
    const {
      entityType,
      entityId,
      actorUserId,
      action,
      fromDate,
      toDate,
      page = 1,
      limit = 50,
    } = params;

    const queryParams = new URLSearchParams();
    queryParams.append('page', String(page));
    queryParams.append('limit', String(limit));
    if (entityType) queryParams.append('entity_type', entityType);
    if (entityId) queryParams.append('entity_id', entityId);
    if (actorUserId) queryParams.append('actor_user_id', actorUserId);
    if (action) queryParams.append('action', action);
    if (fromDate) queryParams.append('from_date', fromDate);
    if (toDate) queryParams.append('to_date', toDate);

    const response = await apiClient.get<AuditTimelineResponse>(
      `/audit/timeline?${queryParams.toString()}`,
    );

    return response.data;
  },
};
