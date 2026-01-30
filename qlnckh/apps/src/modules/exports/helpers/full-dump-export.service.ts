import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../auth/prisma.service';
import * as ExcelJS from 'exceljs';
import { ProjectState, WorkflowAction } from '@prisma/client';

/**
 * Full Dump Export Interfaces
 * Story 10.2: Export Excel (Full Dump)
 *
 * Epic 9 Retro: Proper interfaces, NO as unknown
 */

/**
 * User Export Row
 */
export interface UserExportRow {
  id: string;
  email: string;
  displayName: string;
  role: string;
  facultyCode: string | null;
  facultyName: string | null;
  createdAt: string;
}

/**
 * Proposal Export Row
 */
export interface ProposalExportRow {
  id: string;
  code: string;
  title: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  state: string;
  facultyCode: string | null;
  facultyName: string | null;
  councilId: string | null;
  holderUnit: string | null;
  holderUserName: string | null;
  slaStartDate: string | null;
  slaDeadline: string | null;
  actualStartDate: string | null;
  completedDate: string | null;
  createdAt: string;
  // Exception states (Epic 9)
  cancelledAt: string | null;
  withdrawnAt: string | null;
  rejectedAt: string | null;
  pausedAt: string | null;
  rejectedById: string | null;
  pauseReason: string | null;
  prePauseState: string | null;
}

/**
 * Workflow Log Export Row
 */
export interface WorkflowLogExportRow {
  id: string;
  proposalId: string;
  proposalCode: string;
  action: string;
  fromState: string | null;
  toState: string;
  actorId: string;
  actorName: string;
  returnTargetState: string | null;
  reasonCode: string | null;
  comment: string | null;
  timestamp: string;
}

/**
 * Evaluation Export Row
 */
export interface EvaluationExportRow {
  id: string;
  proposalId: string;
  proposalCode: string;
  councilId?: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorEmail: string;
  state: string;
  totalScore: number | null;
  submittedAt: string | null;
  createdAt: string;
}

/**
 * Full Export Result
 */
export interface FullExportResult {
  buffer: Buffer;
  filename: string;
  recordCounts: {
    users: number;
    proposals: number;
    workflowLogs: number;
    evaluations: number;
  };
}

/**
 * Full Dump Export Service
 * Story 10.2: Export Excel (Full Dump)
 *
 * Generates multi-sheet Excel export with all system data.
 *
 * Epic 9 Retro Patterns Applied:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper typing for all data
 * - Vietnamese localization for headers and labels
 */
@Injectable()
export class FullDumpExportService {
  private readonly logger = new Logger(FullDumpExportService.name);

  // State labels in Vietnamese
  private readonly STATE_LABELS: Record<string, string> = {
    DRAFT: 'Nháp',
    FACULTY_COUNCIL_OUTLINE_REVIEW: 'Hội đồng Khoa - Đề cương',
    SCHOOL_COUNCIL_OUTLINE_REVIEW: 'Hội đồng Trường - Đề cương',
    CHANGES_REQUESTED: 'Yêu cầu sửa',
    APPROVED: 'Đã duyệt',
    IN_PROGRESS: 'Đang thực hiện',
    FACULTY_COUNCIL_ACCEPTANCE_REVIEW: 'Hội đồng Khoa - Nghiệm thu',
    SCHOOL_COUNCIL_ACCEPTANCE_REVIEW: 'Hội đồng Trường - Nghiệm thu',
    HANDOVER: 'Bàn giao',
    COMPLETED: 'Hoàn thành',
    // Exception states (Epic 9)
    CANCELLED: 'Đã hủy',
    WITHDRAWN: 'Đã rút',
    REJECTED: 'Đã từ chối',
    PAUSED: 'Tạm dừng',
  };

  // Workflow action labels in Vietnamese
  private readonly ACTION_LABELS: Record<string, string> = {
    CREATE: 'Tạo mới',
    SUBMIT: 'Nộp',
    APPROVE: 'Duyệt',
    RETURN: 'Trả về yêu cầu sửa',
    RESUBMIT: 'Nộp lại',
    START_PROJECT: 'Bắt đầu thực hiện',
    SUBMIT_FACULTY_ACCEPTANCE: 'Nộp nghiệm thu Khoa',
    FACULTY_ACCEPT: 'Khoa chấp nhận',
    FACULTY_REJECT: 'Khoa từ chối',
    SCHOOL_ACCEPT: 'Trường chấp nhận',
    SCHOOL_REJECT: 'Trường từ chối',
    HANDOVER_COMPLETE: 'Hoàn thành bàn giao',
    SUBMIT_ACCEPTANCE: 'Nộp nghiệm thu',
    ACCEPT: 'Chấp nhận',
    REJECT: 'Từ chối',
    CANCEL: 'Hủy bỏ',
    WITHDRAW: 'Rút hồ sơ',
    PAUSE: 'Tạm dừng',
    RESUME: 'Tiếp tục',
    FINALIZE: 'Hoàn tất',
    ASSIGN_COUNCIL: 'Phân bổ hội đồng',
    EVALUATION_SUBMITTED: 'Nộp phiếu đánh giá',
    TEMPLATE_UPLOAD: 'Upload template',
    TEMPLATE_ACTIVATE: 'Kích hoạt template',
    TEMPLATE_DELETE: 'Xóa template',
    DOC_GENERATED: 'Tạo tài liệu',
    DOC_DOWNLOADED: 'Tải xuống tài liệu',
    DOC_VERIFIED: 'Xác thực tài liệu',
    BULK_ASSIGN: 'Gán hàng loạt',
    BULK_REMIND: 'Nhắc hàng loạt',
    REMIND_SENT: 'Đã gửi email nhắc',
    EXPORT_EXCEL: 'Xuất Excel',
  };

  // Role labels in Vietnamese
  private readonly ROLE_LABELS: Record<string, string> = {
    GIANG_VIEN: 'Giảng viên',
    QUAN_LY_KHOA: 'Quản lý Khoa',
    THU_KY_KHOA: 'Thư ký Khoa',
    PHONG_KHCN: 'Phòng KHCN',
    THU_KY_HOI_DONG: 'Thư ký Hội đồng',
    THANH_TRUNG: 'Thành viên Hội đồng',
    BAN_GIAM_HOC: 'Ban Giám học',
    ADMIN: 'Admin',
  };

  /**
   * Generate full dump Excel export
   * Story 10.2: AC2 - Multi-Sheet Excel Structure
   *
   * @param prisma - PrismaService instance
   * @returns FullExportResult with buffer and record counts
   */
  async generateFullExport(prisma: PrismaService): Promise<FullExportResult> {
    const workbook = new ExcelJS.Workbook();

    // Fetch all data in parallel for performance
    const [users, proposals, workflowLogs, evaluations] = await Promise.all([
      this.fetchUsers(prisma),
      this.fetchProposals(prisma),
      this.fetchWorkflowLogs(prisma),
      this.fetchEvaluations(prisma),
    ]);

    // Create sheets - Proper typing, NO as unknown (Epic 7 retro pattern)
    this.createUsersSheet(workbook, users);
    this.createProposalsSheet(workbook, proposals);
    this.createWorkflowLogsSheet(workbook, workflowLogs);
    this.createEvaluationsSheet(workbook, evaluations);

    // Generate buffer - OUTSIDE any DB transaction (Epic 7 retro pattern)
    const buffer = await workbook.xlsx.writeBuffer();

    const timestamp = new Date().getTime();
    const filename = `export_full_dump_${timestamp}.xlsx`;

    this.logger.log(
      `Generated full export: ${users.length} users, ${proposals.length} proposals, ${workflowLogs.length} logs, ${evaluations.length} evaluations`,
    );

    return {
      buffer: Buffer.from(buffer),
      filename,
      recordCounts: {
        users: users.length,
        proposals: proposals.length,
        workflowLogs: workflowLogs.length,
        evaluations: evaluations.length,
      },
    };
  }

  /**
   * Fetch users for export
   */
  private async fetchUsers(prisma: PrismaService): Promise<UserExportRow[]> {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        facultyId: true,
        faculty: {
          select: {
            code: true,
            name: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: this.ROLE_LABELS[user.role] || user.role,
      facultyCode: user.faculty?.code || null,
      facultyName: user.faculty?.name || null,
      createdAt: this.formatDateVn(user.createdAt),
    }));
  }

  /**
   * Fetch proposals for export
   * Story 10.2: AC4 - Exception State Handling
   */
  private async fetchProposals(prisma: PrismaService): Promise<ProposalExportRow[]> {
    const proposals = await prisma.proposal.findMany({
      select: {
        id: true,
        code: true,
        title: true,
        state: true,
        ownerId: true,
        facultyId: true,
        councilId: true,
        holderUnit: true,
        holderUser: true,
        slaStartDate: true,
        slaDeadline: true,
        actualStartDate: true,
        completedDate: true,
        createdAt: true,
        // Exception states (Epic 9)
        cancelledAt: true,
        withdrawnAt: true,
        rejectedAt: true,
        pausedAt: true,
        rejectedById: true,
        pauseReason: true,
        prePauseState: true,
        owner: {
          select: {
            displayName: true,
            email: true,
          },
        },
        faculty: {
          select: {
            code: true,
            name: true,
          },
        },
        rejectedByUser: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get holder users for all proposals
    const holderUserIds = proposals
      .map((p) => p.holderUser)
      .filter((id): id is string => id !== null);

    const holders = holderUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: holderUserIds } },
          select: { id: true, displayName: true },
        })
      : [];

    const holderMap = new Map(holders.map((h) => [h.id, h]));

    return proposals.map((proposal) => {
      const holder = proposal.holderUser ? holderMap.get(proposal.holderUser) : null;

      return {
        id: proposal.id,
        code: proposal.code,
        title: proposal.title,
        ownerId: proposal.ownerId,
        ownerName: proposal.owner?.displayName || '',
        ownerEmail: proposal.owner?.email || '',
        state: this.STATE_LABELS[proposal.state] || proposal.state,
        facultyCode: proposal.faculty?.code || null,
        facultyName: proposal.faculty?.name || null,
        councilId: proposal.councilId || null,
        holderUnit: proposal.holderUnit || null,
        holderUserName: holder?.displayName || null,
        slaStartDate: this.formatDateVn(proposal.slaStartDate),
        slaDeadline: this.formatDateVn(proposal.slaDeadline),
        actualStartDate: this.formatDateVn(proposal.actualStartDate),
        completedDate: this.formatDateVn(proposal.completedDate),
        createdAt: this.formatDateVn(proposal.createdAt),
        // Exception states (Epic 9)
        cancelledAt: this.formatDateVn(proposal.cancelledAt),
        withdrawnAt: this.formatDateVn(proposal.withdrawnAt),
        rejectedAt: this.formatDateVn(proposal.rejectedAt),
        pausedAt: this.formatDateVn(proposal.pausedAt),
        rejectedById: proposal.rejectedById || null,
        pauseReason: proposal.pauseReason || null,
        prePauseState: proposal.prePauseState ? this.STATE_LABELS[proposal.prePauseState] || proposal.prePauseState : null,
      };
    });
  }

  /**
   * Fetch workflow logs for export
   */
  private async fetchWorkflowLogs(prisma: PrismaService): Promise<WorkflowLogExportRow[]> {
    const logs = await prisma.workflowLog.findMany({
      select: {
        id: true,
        proposalId: true,
        action: true,
        fromState: true,
        toState: true,
        actorId: true,
        actorName: true,
        returnTargetState: true,
        reasonCode: true,
        comment: true,
        timestamp: true,
        proposal: {
          select: {
            code: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 10000, // Limit to prevent memory issues
    });

    return logs.map((log) => ({
      id: log.id,
      proposalId: log.proposalId,
      proposalCode: log.proposal?.code || '',
      action: this.ACTION_LABELS[log.action] || log.action,
      fromState: log.fromState ? this.STATE_LABELS[log.fromState] || log.fromState : null,
      toState: this.STATE_LABELS[log.toState] || log.toState,
      actorId: log.actorId,
      actorName: log.actorName,
      returnTargetState: log.returnTargetState ? this.STATE_LABELS[log.returnTargetState] || log.returnTargetState : null,
      reasonCode: log.reasonCode || null,
      comment: log.comment || null,
      timestamp: this.formatDateTimeVn(log.timestamp),
    }));
  }

  /**
   * Fetch evaluations for export
   */
  private async fetchEvaluations(prisma: PrismaService): Promise<EvaluationExportRow[]> {
    const evaluations = await prisma.evaluation.findMany({
      select: {
        id: true,
        proposalId: true,
        evaluatorId: true,
        state: true,
        createdAt: true,
        proposal: {
          select: {
            code: true,
          },
        },
        evaluator: {
          select: {
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return evaluations.map((evaluation) => ({
      id: evaluation.id,
      proposalId: evaluation.proposalId,
      proposalCode: evaluation.proposal?.code || '',
      evaluatorId: evaluation.evaluatorId,
      evaluatorName: evaluation.evaluator?.displayName || '',
      evaluatorEmail: evaluation.evaluator?.email || '',
      state: evaluation.state === 'DRAFT' ? 'Nháp' : 'Đã hoàn tất',
      totalScore: 0,
      submittedAt: null,
      createdAt: this.formatDateTimeVn(evaluation.createdAt),
    }));
  }

  /**
   * Create Users sheet
   * Story 10.2: AC5 - Vietnamese Headers
   */
  private createUsersSheet(workbook: ExcelJS.Workbook, users: UserExportRow[]): void {
    const worksheet = workbook.addWorksheet('Users');

    // Vietnamese headers
    const headers = {
      id: 'ID',
      email: 'Email',
      displayName: 'Tên hiển thị',
      role: 'Vai trò',
      facultyCode: 'Mã khoa',
      facultyName: 'Tên khoa',
      createdAt: 'Ngày tạo',
    } as const;

    worksheet.columns = [
      { header: headers.id, key: 'id', width: 40 },
      { header: headers.email, key: 'email', width: 30 },
      { header: headers.displayName, key: 'displayName', width: 25 },
      { header: headers.role, key: 'role', width: 20 },
      { header: headers.facultyCode, key: 'facultyCode', width: 15 },
      { header: headers.facultyName, key: 'facultyName', width: 25 },
      { header: headers.createdAt, key: 'createdAt', width: 15 },
    ];

    // Style header row
    this.styleHeaderRow(worksheet);

    // Add data
    users.forEach((user) => worksheet.addRow(user));
  }

  /**
   * Create Proposals sheet
   * Story 10.2: AC2, AC4, AC5 - Multi-Sheet with Exception States and Vietnamese Headers
   */
  private createProposalsSheet(workbook: ExcelJS.Workbook, proposals: ProposalExportRow[]): void {
    const worksheet = workbook.addWorksheet('Proposals');

    // Vietnamese headers with exception state fields
    const headers = {
      id: 'ID',
      code: 'Mã số',
      title: 'Tiêu đề',
      ownerId: 'ID chủ nhiệm',
      ownerName: 'Chủ nhiệm',
      ownerEmail: 'Email chủ nhiệm',
      state: 'Trạng thái',
      facultyCode: 'Mã khoa',
      facultyName: 'Tên khoa',
      councilId: 'ID hội đồng',
      holderUnit: 'Đơn vị xử lý',
      holderUserName: 'Người xử lý',
      slaStartDate: 'Ngày bắt đầu SLA',
      slaDeadline: 'Thời hạn SLA',
      actualStartDate: 'Ngày bắt đầu thực tế',
      completedDate: 'Ngày hoàn thành',
      createdAt: 'Ngày tạo',
      // Exception states (Epic 9) - Story 10.2: AC4
      cancelledAt: 'Ngày hủy',
      withdrawnAt: 'Ngày rút',
      rejectedAt: 'Ngày từ chối',
      pausedAt: 'Ngày tạm dừng',
      rejectedById: 'Người từ chối',
      pauseReason: 'Lý do tạm dừng',
      prePauseState: 'Trạng thái trước tạm dừng',
    } as const;

    worksheet.columns = [
      { header: headers.id, key: 'id', width: 40 },
      { header: headers.code, key: 'code', width: 15 },
      { header: headers.title, key: 'title', width: 40 },
      { header: headers.ownerId, key: 'ownerId', width: 40 },
      { header: headers.ownerName, key: 'ownerName', width: 25 },
      { header: headers.ownerEmail, key: 'ownerEmail', width: 30 },
      { header: headers.state, key: 'state', width: 20 },
      { header: headers.facultyCode, key: 'facultyCode', width: 15 },
      { header: headers.facultyName, key: 'facultyName', width: 25 },
      { header: headers.councilId, key: 'councilId', width: 40 },
      { header: headers.holderUnit, key: 'holderUnit', width: 20 },
      { header: headers.holderUserName, key: 'holderUserName', width: 25 },
      { header: headers.slaStartDate, key: 'slaStartDate', width: 15 },
      { header: headers.slaDeadline, key: 'slaDeadline', width: 15 },
      { header: headers.actualStartDate, key: 'actualStartDate', width: 15 },
      { header: headers.completedDate, key: 'completedDate', width: 15 },
      { header: headers.createdAt, key: 'createdAt', width: 15 },
      // Exception states
      { header: headers.cancelledAt, key: 'cancelledAt', width: 15 },
      { header: headers.withdrawnAt, key: 'withdrawnAt', width: 15 },
      { header: headers.rejectedAt, key: 'rejectedAt', width: 15 },
      { header: headers.pausedAt, key: 'pausedAt', width: 15 },
      { header: headers.rejectedById, key: 'rejectedById', width: 40 },
      { header: headers.pauseReason, key: 'pauseReason', width: 25 },
      { header: headers.prePauseState, key: 'prePauseState', width: 20 },
    ];

    // Style header row
    this.styleHeaderRow(worksheet);

    // Add data
    proposals.forEach((proposal) => worksheet.addRow(proposal));
  }

  /**
   * Create Workflow Logs sheet
   */
  private createWorkflowLogsSheet(workbook: ExcelJS.Workbook, logs: WorkflowLogExportRow[]): void {
    const worksheet = workbook.addWorksheet('WorkflowLogs');

    // Vietnamese headers
    const headers = {
      id: 'ID',
      proposalId: 'ID đề tài',
      proposalCode: 'Mã đề tài',
      action: 'Hành động',
      fromState: 'Từ trạng thái',
      toState: 'Đến trạng thái',
      actorId: 'ID người thực hiện',
      actorName: 'Người thực hiện',
      returnTargetState: 'Trạng thái trả về',
      reasonCode: 'Mã lý do',
      comment: 'Ghi chú',
      timestamp: 'Thời gian',
    } as const;

    worksheet.columns = [
      { header: headers.id, key: 'id', width: 40 },
      { header: headers.proposalId, key: 'proposalId', width: 40 },
      { header: headers.proposalCode, key: 'proposalCode', width: 15 },
      { header: headers.action, key: 'action', width: 25 },
      { header: headers.fromState, key: 'fromState', width: 20 },
      { header: headers.toState, key: 'toState', width: 20 },
      { header: headers.actorId, key: 'actorId', width: 40 },
      { header: headers.actorName, key: 'actorName', width: 25 },
      { header: headers.returnTargetState, key: 'returnTargetState', width: 20 },
      { header: headers.reasonCode, key: 'reasonCode', width: 15 },
      { header: headers.comment, key: 'comment', width: 40 },
      { header: headers.timestamp, key: 'timestamp', width: 20 },
    ];

    // Style header row
    this.styleHeaderRow(worksheet);

    // Add data
    logs.forEach((log) => worksheet.addRow(log));
  }

  /**
   * Create Evaluations sheet
   */
  private createEvaluationsSheet(workbook: ExcelJS.Workbook, evaluations: EvaluationExportRow[]): void {
    const worksheet = workbook.addWorksheet('Evaluations');

    // Vietnamese headers
    const headers = {
      id: 'ID',
      proposalId: 'ID đề tài',
      proposalCode: 'Mã đề tài',
      councilId: 'ID hội đồng',
      evaluatorId: 'ID người chấm',
      evaluatorName: 'Người chấm',
      evaluatorEmail: 'Email người chấm',
      state: 'Trạng thái',
      totalScore: 'Tổng điểm',
      submittedAt: 'Ngày nộp',
      createdAt: 'Ngày tạo',
    } as const;

    worksheet.columns = [
      { header: headers.id, key: 'id', width: 40 },
      { header: headers.proposalId, key: 'proposalId', width: 40 },
      { header: headers.proposalCode, key: 'proposalCode', width: 15 },
      { header: headers.councilId, key: 'councilId', width: 40 },
      { header: headers.evaluatorId, key: 'evaluatorId', width: 40 },
      { header: headers.evaluatorName, key: 'evaluatorName', width: 25 },
      { header: headers.evaluatorEmail, key: 'evaluatorEmail', width: 30 },
      { header: headers.state, key: 'state', width: 15 },
      { header: headers.totalScore, key: 'totalScore', width: 12 },
      { header: headers.submittedAt, key: 'submittedAt', width: 20 },
      { header: headers.createdAt, key: 'createdAt', width: 20 },
    ];

    // Style header row
    this.styleHeaderRow(worksheet);

    // Add data
    evaluations.forEach((evaluation) => worksheet.addRow(evaluation));
  }

  /**
   * Style header row consistently
   */
  private styleHeaderRow(worksheet: ExcelJS.Worksheet): void {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.height = 25;
  }

  /**
   * Format date to Vietnamese locale (dd/MM/yyyy)
   */
  private formatDateVn(date: Date | null | undefined): string | null {
    if (!date) return null;
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  /**
   * Format datetime to Vietnamese locale (dd/MM/yyyy HH:mm:ss)
   */
  private formatDateTimeVn(date: Date | null | undefined): string | null {
    if (!date) return null;
    return new Date(date).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
