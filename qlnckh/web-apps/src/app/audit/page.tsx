import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Activity,
  Users,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  Download,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { auditApi, type AuditEvent, type AuditStatistics, type TimelineGroup } from '../../lib/api/audit';
import type { AuditQueryParams } from '../../lib/api/audit';

/**
 * Audit Log Viewer Page
 *
 * ADMIN ONLY - View system audit logs with filtering and statistics
 *
 * Features:
 * - Statistics dashboard (total events, by action type, by entity type, by actor)
 * - Timeline view grouped by date
 * - Filter panel (entity_type, entity_id, action, actor_user_id, date range)
 * - Audit events table with pagination
 */

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Tạo mới',
  UPDATE: 'Cập nhật',
  DELETE: 'Xóa',
  LOGIN: 'Đăng nhập',
  LOGOUT: 'Đăng xuất',
  APPROVE: 'Phê duyệt',
  REJECT: 'Từ chối',
  RETURN: 'Yêu cầu sửa',
  SUBMIT: 'Gửi',
  WITHDRAW: 'Rút lại',
  CANCEL: 'Hủy',
  PAUSE: 'Tạm dừng',
  RESUME: 'Tiếp tục',
  ASSIGN: 'Phân bổ',
  REMIND: 'Nhắc nhở',
  EXPORT: 'Xuất dữ liệu',
  IMPORT: 'Nhập dữ liệu',
  RESET: 'Đặt lại',
  SWITCH_ROLE: 'Chuyển vai trò',
  VIEW: 'Xem',
  UPLOAD: 'Tải lên',
  DOWNLOAD: 'Tải xuống',
  REPLACE: 'Thay thế',
};

const ENTITY_LABELS: Record<string, string> = {
  User: 'Người dùng',
  Proposal: 'Đề tài',
  Council: 'Hội đồng',
  Holiday: 'Ngày nghỉ',
  Evaluation: 'Đánh giá',
  Attachment: 'Tài liệu',
  AuditLog: 'Nhật ký',
  Workflow: 'Quy trình',
  Permission: 'Quy hạn',
  Role: 'Vai trò',
  Faculty: 'Khoa',
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  LOGIN: 'bg-gray-100 text-gray-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
  APPROVE: 'bg-emerald-100 text-emerald-800',
  REJECT: 'bg-red-100 text-red-800',
  RETURN: 'bg-amber-100 text-amber-800',
  SUBMIT: 'bg-blue-100 text-blue-800',
  WITHDRAW: 'bg-orange-100 text-orange-800',
  CANCEL: 'bg-gray-100 text-gray-800',
  PAUSE: 'bg-yellow-100 text-yellow-800',
  RESUME: 'bg-teal-100 text-teal-800',
  ASSIGN: 'bg-indigo-100 text-indigo-800',
  REMIND: 'bg-purple-100 text-purple-800',
  EXPORT: 'bg-cyan-100 text-cyan-800',
  IMPORT: 'bg-pink-100 text-pink-800',
  RESET: 'bg-slate-100 text-slate-800',
  SWITCH_ROLE: 'bg-violet-100 text-violet-800',
  UPLOAD: 'bg-blue-100 text-blue-800',
  DOWNLOAD: 'bg-blue-100 text-blue-800',
  REPLACE: 'bg-orange-100 text-orange-800',
};

type ViewMode = 'table' | 'timeline';

export default function AuditLogPage() {
  // State
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [timelineGroups, setTimelineGroups] = useState<TimelineGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Filters
  const [filters, setFilters] = useState<AuditQueryParams>({});
  const [showFilters, setShowFilters] = useState(true);

  // Filter inputs
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [action, setAction] = useState('');
  const [actorUserId, setActorUserId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Load statistics
  const loadStatistics = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const stats = await auditApi.getStatistics();
      setStatistics(stats);
    } catch (err: any) {
      console.error('Failed to load statistics:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Load audit logs
  const loadAuditLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await auditApi.getAuditLogs({
        ...filters,
        page,
        limit,
      });

      setEvents(response.data.events);
      setTotal(response.data.meta.total);
      setTotalPages(response.data.meta.totalPages);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      setError(err.message || 'Không thể tải nhật ký');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, limit]);

  // Load timeline
  const loadTimeline = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await auditApi.getTimeline({
        ...filters,
        page,
        limit,
      });

      setTimelineGroups(response.data.timeline);
      setTotal(response.data.timeline.reduce((sum, g) => sum + g.count, 0));
      setTotalPages(Math.ceil(response.data.timeline.length / limit));
    } catch (err: any) {
      console.error('Failed to load timeline:', err);
      setError(err.message || 'Không thể tải nhật ký');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, limit]);

  // Initial load
  useEffect(() => {
    void loadStatistics();
  }, [loadStatistics]);

  useEffect(() => {
    if (viewMode === 'table') {
      void loadAuditLogs();
    } else {
      void loadTimeline();
    }
  }, [viewMode, loadAuditLogs, loadTimeline]);

  // Apply filters
  const applyFilters = () => {
    const newFilters: AuditQueryParams = {};
    if (entityType) newFilters.entityType = entityType;
    if (entityId) newFilters.entityId = entityId;
    if (action) newFilters.action = action;
    if (actorUserId) newFilters.actorUserId = actorUserId;
    if (fromDate) newFilters.fromDate = fromDate;
    if (toDate) newFilters.toDate = toDate;

    setFilters(newFilters);
    setPage(1);
  };

  // Clear filters
  const clearFilters = () => {
    setEntityType('');
    setEntityId('');
    setAction('');
    setActorUserId('');
    setFromDate('');
    setToDate('');
    setFilters({});
    setPage(1);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format date for timeline grouping
  const formatDateGroup = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hôm nay';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua';
    }

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // Get action label
  const getActionLabel = (action: string) => {
    return ACTION_LABELS[action] || action;
  };

  // Get entity label
  const getEntityLabel = (entityType: string) => {
    return ENTITY_LABELS[entityType] || entityType;
  };

  // Get action color
  const getActionColor = (action: string) => {
    return ACTION_COLORS[action] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Nhật ký hệ thống
            </h1>
            <p className="text-gray-600 mt-1">Xem và tra cứu tất cả hoạt động trong hệ thống</p>
          </div>
          <button
            onClick={() => {
              if (viewMode === 'table') void loadAuditLogs();
              else void loadTimeline();
              void loadStatistics();
            }}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Làm mới"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {/* Statistics Cards */}
        {statistics && !isLoadingStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Tổng số sự kiện"
              value={statistics.totalEvents}
              icon={<Activity className="h-5 w-5" />}
              color="blue"
            />
            <StatsCard
              title="Loại hành động"
              value={Object.keys(statistics.eventsByAction).length}
              icon={<FileText className="h-5 w-5" />}
              color="green"
            />
            <StatsCard
              title="Loại đối tượng"
              value={Object.keys(statistics.eventsByEntityType).length}
              icon={<Eye className="h-5 w-5" />}
              color="purple"
            />
            <StatsCard
              title="Người dùng hoạt động"
              value={statistics.topActors.length}
              icon={<Users className="h-5 w-5" />}
              color="orange"
            />
          </div>
        )}

        {/* Statistics Detail */}
        {statistics && !isLoadingStats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* By Action Type */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Theo hành động
              </h3>
              <div className="space-y-2">
                {Object.entries(statistics.eventsByAction)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([action, count]) => (
                    <div key={action} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{getActionLabel(action)}</span>
                      <span className="font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* By Entity Type */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Theo đối tượng
              </h3>
              <div className="space-y-2">
                {Object.entries(statistics.eventsByEntityType)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([entity, count]) => (
                    <div key={entity} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{getEntityLabel(entity)}</span>
                      <span className="font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* By Actor */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Theo người dùng
              </h3>
              <div className="space-y-2">
                {statistics.topActors
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5)
                  .map((actor) => (
                    <div key={actor.userId} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 truncate">{actor.displayName}</span>
                      <span className="font-medium text-gray-900">{actor.count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        <div className="bg-white rounded-lg shadow mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <span className="font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Bộ lọc
            </span>
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showFilters && (
            <div className="px-6 pb-6 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Entity Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại đối tượng
                  </label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tất cả</option>
                    {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Entity ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID đối tượng
                  </label>
                  <input
                    type="text"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    placeholder="Nhập ID..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Action */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hành động
                  </label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tất cả</option>
                    {Object.entries(ACTION_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actor User ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID người dùng
                  </label>
                  <input
                    type="text"
                    value={actorUserId}
                    onChange={(e) => setActorUserId(e.target.value)}
                    placeholder="Nhập ID người dùng..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* From Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* To Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={applyFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Tìm kiếm
                </button>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Bảng
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-4 py-2 rounded-md transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Dòng thời gian
            </button>
          </div>

          <div className="text-sm text-gray-600">
            {total > 0 && (
              <span>
                Hiển thị {events.length || timelineGroups.reduce((sum, g) => sum + g.count, 0)} / {total} sự kiện
              </span>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="mt-2 text-sm text-gray-600">Đang tải...</p>
            </div>
          </div>
        )}

        {/* Table View */}
        {!isLoading && viewMode === 'table' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {events.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Không tìm thấy sự kiện nào</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Thời gian
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Hành động
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Đối tượng
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Người thực hiện
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Chi tiết
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {events.map((event) => (
                        <tr key={event.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(event.occurredAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(
                                event.action,
                              )}`}
                            >
                              {getActionLabel(event.action)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{getEntityLabel(event.entityType)}</div>
                              <div className="text-gray-500 text-xs">{event.entityId}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div>
                              <div className="font-medium text-gray-900">{event.actorDisplayName}</div>
                              <div className="text-gray-500 text-xs">{event.actorEmail}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                              <span className="text-xs">
                                {Object.keys(event.metadata).length} thay đổi
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Trang {page} / {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Trước
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Timeline View */}
        {!isLoading && viewMode === 'timeline' && (
          <div className="space-y-6">
            {timelineGroups.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Không tìm thấy sự kiện nào</p>
              </div>
            ) : (
              timelineGroups.map((group) => (
                <div key={group.date} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
                    <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDateGroup(group.date)}
                      <span className="text-sm font-normal text-blue-700">
                        ({group.count} sự kiện)
                      </span>
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {group.events.map((event) => (
                      <div key={event.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-16 text-sm text-gray-500">
                            {new Date(event.occurredAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="flex-grow">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded-full ${getActionColor(
                                  event.action,
                                )}`}
                              >
                                {getActionLabel(event.action)}
                              </span>
                              <span className="text-sm text-gray-600">
                                {getEntityLabel(event.entityType)}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-900">{event.actorDisplayName}</span>
                              <span className="text-gray-600"> đã thực hiện hành động trên </span>
                              <span className="font-medium text-gray-900">{event.entityId}</span>
                            </div>
                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                                  Xem chi tiết thay đổi
                                </summary>
                                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                  {Object.entries(event.metadata).map(([field, value]) => (
                                    <div key={field} className="mb-1">
                                      <span className="font-medium text-gray-700">{field}:</span>{' '}
                                      <span className="text-gray-900">{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center py-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Trước
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-600">
                    Trang {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Statistics Card Component
 */
interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatsCard({ title, value, icon, color }: StatsCardProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value.toLocaleString()}</p>
        </div>
        <div className={`p-3 rounded-full ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  );
}
