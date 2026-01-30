/**
 * Proposal Detail Page (Story 5.3, Story 11.5 Integration, GIANG_VIEN Features)
 *
 * Displays proposal details with conditional sections based on state.
 * - OUTLINE_COUNCIL_REVIEW: Shows EvaluationForm for assigned secretary
 * - Attachments section with upload/download/replace/delete (Story 11.5)
 * - Evaluation Results Viewer for GIANG_VIEN (Proposal Owner)
 * - Export to PDF functionality
 *
 * Story 5.3: AC1 - Evaluation Form Display
 * Story 5.3: AC5 - Add EvaluationForm to proposal detail page
 * Story 11.5: File Upload for Attachments
 * GIANG_VIEN Feature: View evaluation results, Export PDF
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, FileText, RotateCcw, RefreshCw, FileOutput } from 'lucide-react';
import { DocumentGenerator } from '../../../components/document-generation';
import { EvaluationForm, isCouncilSecretary, isCouncilMember, EvaluationResultsViewer } from '../../../components/evaluation/index';
import { CouncilFinalizationSection } from '../../../components/evaluation/CouncilFinalizationSection';
import { ProposalExportButton } from '../../../components/proposals/index';
import {
  ProposalActions,
  SchoolSelectionActions,
  CouncilReviewApprovalActions,
  SchoolAcceptanceActions,
} from '../../../components/workflow/index';
import { ChangesRequestedBanner } from '../../../components/workflow/ChangesRequestedBanner';
import { ExceptionActions } from '../../../components/workflow/exception-actions/ExceptionActions';
import { ChangeCouncilDialog } from '../../../components/councils';
import { CouncilEvaluationSummary } from '../../../components/workflow/CouncilEvaluationSummary';
import type { PauseInfo } from '../../../components/workflow/exception-actions/ResumeConfirmDialog';
// FacultyAcceptanceDecisionModal removed - using ProposalActions buttons instead
import { proposalsApi, Proposal } from '../../../lib/api/proposals';
import { workflowApi } from '../../../lib/api/workflow';
import { attachmentsApi, Attachment } from '../../../lib/api/attachments';
import { evaluationApi, Evaluation } from '../../../lib/api/evaluations';
import { FileUpload } from '../../../components/forms/FileUpload';
import { AttachmentList } from '../../../components/forms/AttachmentList';
import { ProposalDocumentsList } from '../../../components/forms/ProposalDocumentsList';
import { formEngineApi, ProposalDocument } from '../../../lib/api/form-engine';
import { useAuthStore } from '../../../stores/authStore';
import { getStateLabel } from '../../../lib/constants/states';

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, actingAs } = useAuthStore();
  // Use actingAs if set (demo mode), otherwise use user
  const currentUser = actingAs || user;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Attachments state (Story 11.5)
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsTotal, setAttachmentsTotal] = useState(0);
  const [attachmentsTotalSize, setAttachmentsTotalSize] = useState(0);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);

  // Proposal Documents (biểu mẫu NCKH đã tạo)
  const [proposalDocuments, setProposalDocuments] = useState<ProposalDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  // Evaluation state (GIANG_VIEN Feature - View evaluation results)
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);

  // Workflow action state (refresh proposal after action)
  const [actionSuccess, setActionSuccess] = useState(false);

  // Latest return log for ChangesRequestedBanner
  const [latestReturnLog, setLatestReturnLog] = useState<any>(null);

  // Faculty acceptance decision - handled by ProposalActions component

  // Pause info for ExceptionActions (Story 9.3)
  const [pauseInfo, setPauseInfo] = useState<PauseInfo | null>(null);

  // Change Council Dialog state
  const [isChangeCouncilDialogOpen, setIsChangeCouncilDialogOpen] = useState(false);

  /**
   * Load proposal data on mount
   */
  useEffect(() => {
    const loadProposal = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const data = await proposalsApi.getProposalById(id);
        setProposal(data);
      } catch (error) {
        const err = error as Error;
        setLoadError(err.message || 'Không thể tải đề tài');
      } finally {
        setIsLoading(false);
      }
    };

    void loadProposal();
  }, [id]);

  /**
   * Load attachments (Story 11.5)
   */
  const loadAttachments = useCallback(async () => {
    if (!id) return;

    setIsLoadingAttachments(true);
    try {
      const result = await attachmentsApi.getByProposalId(id);
      setAttachments(result.data);
      setAttachmentsTotal(result.total);
      setAttachmentsTotalSize(result.totalSize);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    } finally {
      setIsLoadingAttachments(false);
    }
  }, [id]);

  /**
   * Load proposal documents (biểu mẫu NCKH đã tạo)
   */
  const loadProposalDocuments = useCallback(async () => {
    if (!id) return;

    setIsLoadingDocuments(true);
    try {
      const docs = await formEngineApi.getProposalDocuments(id);
      setProposalDocuments(docs);
    } catch (error) {
      console.error('Failed to load proposal documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [id]);

  /**
   * Load evaluation results (GIANG_VIEN Feature)
   * Only available for finalized evaluations
   * Only calls API if proposal is in a state that supports evaluations
   */
  const loadEvaluation = useCallback(async () => {
    if (!id || !proposal) return;

    // Only load evaluation for proposals in council review states
    const councilReviewStates = ['SCHOOL_COUNCIL_OUTLINE_REVIEW', 'COUNCIL_REVIEW', 'APPROVED', 'CHANGES_REQUESTED'];
    if (!councilReviewStates.includes(proposal.state)) {
      return;
    }

    setIsLoadingEvaluation(true);
    try {
      const evalData = await evaluationApi.getOrCreateEvaluation(id);
      // Only show if evaluation is finalized
      if (evalData.state === 'FINALIZED') {
        setEvaluation(evalData);
      }
    } catch (error) {
      // Evaluation might not exist yet, which is fine
      console.log('No evaluation found or not accessible:', error);
    } finally {
      setIsLoadingEvaluation(false);
    }
  }, [id, proposal]);

  /**
   * Load attachments, proposal documents, and evaluation when proposal is loaded
   */
  useEffect(() => {
    if (proposal) {
      void loadAttachments();
      void loadProposalDocuments();
      // Load evaluation if proposal is in a state that may have evaluations (GIANG_VIEN Feature)
      const councilReviewStates = ['SCHOOL_COUNCIL_OUTLINE_REVIEW', 'COUNCIL_REVIEW', 'APPROVED', 'CHANGES_REQUESTED'];
      if (councilReviewStates.includes(proposal.state)) {
        void loadEvaluation();
      }
    }
  }, [proposal, loadAttachments, loadProposalDocuments, loadEvaluation]);

  /**
   * Handle upload success (Story 11.5)
   */
  const handleUploadSuccess = useCallback((attachment: Attachment) => {
    setAttachments((prev) => [...prev, attachment]);
    setAttachmentsTotal((prev) => prev + 1);
    setAttachmentsTotalSize((prev) => prev + attachment.fileSize);
  }, []);

  /**
   * Handle attachment change (replace/delete) (Story 11.5)
   */
  const handleAttachmentChange = useCallback(() => {
    void loadAttachments();
  }, [loadAttachments]);

  /**
   * Load latest return log for ChangesRequestedBanner
   */
  const loadLatestReturnLog = useCallback(async () => {
    if (!id) return;

    try {
      const logs = await workflowApi.getWorkflowLogs(id);
      const returnLog = logs.find((log) => log.action === 'RETURN') || null;
      setLatestReturnLog(returnLog);
    } catch (error) {
      console.log('No return log found:', error);
    }
  }, [id]);

  /**
   * Load latest return log when proposal state changes
   */
  useEffect(() => {
    if (proposal && proposal.state === 'CHANGES_REQUESTED') {
      void loadLatestReturnLog();
    }
  }, [proposal, loadLatestReturnLog]);

  /**
   * Handle action success (refresh proposal data)
   */
  const handleActionSuccess = useCallback(() => {
    setActionSuccess(true);
    // Reload proposal data
    if (id) {
      proposalsApi.getProposalById(id).then(setProposal).catch(() => {});
    }
    // Reload return log if needed
    void loadLatestReturnLog();
  }, [id, loadLatestReturnLog]);

  /**
   * Handle action error
   */
  const handleActionError = useCallback((error: { code: string; message: string }) => {
    console.error('Action error:', error);
    // Could show toast notification here
  }, []);

  /**
   * Check if evaluation form should be shown (Story 5.3: AC1, AC5, Multi-member)
   * Conditions:
   * - Proposal state is OUTLINE_COUNCIL_REVIEW
   * - Current user is a member of the assigned council (from API response)
   * - Fallback to role-based check if isUserCouncilMember not available
   */
  const shouldShowEvaluationForm = Boolean(
    proposal &&
      currentUser &&
      proposal.state === 'SCHOOL_COUNCIL_OUTLINE_REVIEW' &&
      (proposal.isUserCouncilMember || isCouncilMember(currentUser.role)),
  );

  /**
   * Check if currentUser can upload attachments (Story 11.5)
   * - User is the proposal owner
   * - Proposal is in DRAFT state (or allow uploads in other states as per requirements)
   */
  const canUploadAttachments = Boolean(
    currentUser && proposal && (proposal.ownerId === currentUser.id || proposal.holderUser === currentUser.id),
  );

  /**
   * Loading state
   */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Đang tải đề tài...</p>
        </div>
      </div>
    );
  }

  /**
   * Error state
   */
  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p>{loadError}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  /**
   * Proposal not found
   */
  if (!proposal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Không tìm thấy đề tài</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-300 bg-white/50 backdrop-blur-sm rounded-t-xl -mx-6 px-6 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {proposal.title}
            </h1>
            <p className="text-sm text-gray-700 font-medium mt-1">
              Mã: {proposal.code} • Trạng thái: {getStateLabel(proposal.state)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Export PDF Button (GIANG_VIEN Feature) */}
            <ProposalExportButton
              proposalId={proposal.id}
              proposalCode={proposal.code}
              proposalTitle={proposal.title}
              formData={proposal.formData || {}}
              hasEvaluation={evaluation !== null}
            />
            <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {getStateLabel(proposal.state)}
            </div>
          </div>
        </div>
      </div>

      {/* ChangesRequestedBanner - Show when proposal is returned */}
      {proposal.state === 'CHANGES_REQUESTED' && latestReturnLog && currentUser && (
        <ChangesRequestedBanner
          returnLog={latestReturnLog}
          proposalId={proposal.id}
          currentUserId={currentUser.id}
          isProposalOwner={currentUser.id === proposal.ownerId}
          onActionSuccess={handleActionSuccess}
          onActionError={handleActionError}
        />
      )}

      {/* Council Evaluation Summary - BAN_GIAM_HOC only */}
      {/* Shows aggregated council evaluation results before approval decision */}
      {proposal.state === 'SCHOOL_COUNCIL_OUTLINE_REVIEW' && currentUser?.role === 'BAN_GIAM_HOC' && (
        <div className="mb-6">
          <CouncilEvaluationSummary
            proposalId={proposal.id}
            onError={(error) => console.error('Council Evaluation Summary error:', error)}
          />
        </div>
      )}

      {/* Workflow Actions - Show for currentUsers with approval permissions */}
      {currentUser && (
        <div className="mb-6 flex justify-end gap-3 flex-wrap">
          {/* Faculty Acceptance Decision - handled by ProposalActions component below */}
          {/* Removed duplicate button - ProposalActions has complete logic with idempotency */}

          {/* Story 5.1: PHONG_KHCN School Selection Actions */}
          {/* Shows "Phân bổ hội đồng" and "Yêu cầu sửa" buttons */}
          {proposal.state === 'SCHOOL_COUNCIL_OUTLINE_REVIEW' && user?.role === 'PHONG_KHCN' && (
            <SchoolSelectionActions
              proposalId={proposal.id}
              proposalState={proposal.state}
              currentUser={{
                id: currentUser.id,
                role: currentUser.role,
                facultyId: currentUser.facultyId,
              }}
              onActionSuccess={handleActionSuccess}
              onActionError={handleActionError}
            />
          )}

          {/* PHONG_KHCN: Change Council Button */}
          {/* Shows "Thay hội đồng" button when proposal has a council assigned */}
          {proposal.holderUnit && user?.role === 'PHONG_KHCN' && (
            <button
              onClick={() => setIsChangeCouncilDialogOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Thay hội đồng
            </button>
          )}

          {/* BAN_GIAM_HOC: Council Review Approval Actions */}
          {/* Shows "Phê duyệt" and "Yêu cầu hoàn thiện" buttons at OUTLINE_COUNCIL_REVIEW state */}
          {proposal.state === 'SCHOOL_COUNCIL_OUTLINE_REVIEW' && user?.role === 'BAN_GIAM_HOC' && (
            <CouncilReviewApprovalActions
              proposalId={proposal.id}
              proposalState={proposal.state}
              currentUser={{
                id: currentUser.id,
                role: currentUser.role,
                facultyId: currentUser.facultyId,
              }}
              onActionSuccess={handleActionSuccess}
              onActionError={handleActionError}
            />
          )}

          {/* BAN_GIAM_HOC: School Acceptance Actions */}
          {/* Shows "Nghiệm thu" and "Yêu cầu hoàn thiện" buttons at SCHOOL_ACCEPTANCE_REVIEW state */}
          {proposal.state === 'SCHOOL_COUNCIL_ACCEPTANCE_REVIEW' && user?.role === 'BAN_GIAM_HOC' && (
            <SchoolAcceptanceActions
              proposalId={proposal.id}
              proposalState={proposal.state}
              currentUser={{
                id: currentUser.id,
                role: currentUser.role,
                facultyId: currentUser.facultyId,
              }}
              onActionSuccess={handleActionSuccess}
              onActionError={handleActionError}
            />
          )}

          {/* Story 4.1, 4.2: Faculty Review Actions for QUAN_LY_KHOA/THU_KY_KHOA */}
          {/* GIANG_VIEN Feature: Submit button for proposal owner at DRAFT state */}
          <ProposalActions
            proposalId={proposal.id}
            proposalState={proposal.state}
            ownerId={proposal.ownerId}
            currentUser={{
              id: currentUser.id,
              role: user?.role || currentUser.role, // Use actual user role for permissions
              facultyId: currentUser.facultyId,
            }}
            onActionSuccess={handleActionSuccess}
            onActionError={handleActionError}
          />

          {/* Story 9.1, 9.2, 9.3: Exception Actions */}
          {/* Cancel/Withdraw (owner), Reject (decision makers), Pause/Resume (PHONG_KHCN) */}
          <ExceptionActions
            proposalId={proposal.id}
            proposalState={proposal.state}
            proposalTitle={proposal.title}
            currentUser={{
              id: currentUser.id,
              role: user?.role || currentUser.role,
              facultyId: currentUser.facultyId,
              isOwner: currentUser.id === proposal.ownerId,
            }}
            pauseInfo={pauseInfo}
            onActionSuccess={handleActionSuccess}
            onActionError={handleActionError}
          />
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">
        {/* Proposal Information */}
        <section className="border border-gray-200 rounded-xl p-6 bg-white/90 backdrop-blur-sm shadow-soft">
          <h2 className="text-lg font-bold mb-4 text-gray-900">
            Thông tin đề tài
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-700 font-medium">Mã đề tài:</dt>
              <dd className="font-semibold text-gray-900">{proposal.code}</dd>
            </div>
            <div>
              <dt className="text-gray-700 font-medium">Trạng thái:</dt>
              <dd className="font-semibold text-gray-900">
                {getStateLabel(proposal.state)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-700 font-medium">Người tạo:</dt>
              <dd className="font-semibold text-gray-900">
                {proposal.owner?.displayName || proposal.ownerId}
              </dd>
            </div>
            <div>
              <dt className="text-gray-700 font-medium">Khoa:</dt>
              <dd className="font-semibold text-gray-900">
                {proposal.faculty?.name || proposal.facultyId}
              </dd>
            </div>
            {proposal.councilId && (
              <div>
                <dt className="text-gray-700 font-medium">Hội đồng:</dt>
                <dd className="font-semibold text-gray-900">{proposal.councilId}</dd>
              </div>
            )}
            {proposal.holderUser && (
              <div>
                <dt className="text-gray-700 font-medium">Người xử lý:</dt>
                <dd className="font-semibold text-gray-900">
                  {proposal.holderUserInfo?.displayName || proposal.holderUser}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* Evaluation Form (Story 5.3: AC5, Multi-member) */}
        {/* Conditionally show when state = OUTLINE_COUNCIL_REVIEW and user is council member */}
        {shouldShowEvaluationForm && (
          <section className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-900">
            <EvaluationForm
              proposalId={proposal.id}
              holderUser={proposal.holderUser}
              currentState={proposal.state}
              currentUserId={currentUser.id}
              currentUserRole={currentUser.role}
              isSecretary={proposal.isUserCouncilSecretary || isCouncilSecretary(currentUser.role)}
              isCouncilMember={proposal.isUserCouncilMember || isCouncilMember(currentUser.role)}
            />
          </section>
        )}

        {/* Council Finalization Section (Multi-member Evaluation) */}
        {/* Show for secretary to finalize after all members have submitted */}
        {proposal && currentUser && proposal.state === 'SCHOOL_COUNCIL_OUTLINE_REVIEW' && (proposal.isUserCouncilSecretary || isCouncilSecretary(currentUser.role)) && (
          <section className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-900">
            <CouncilFinalizationSection
              proposalId={proposal.id}
              proposalCode={proposal.code}
              isSecretary={proposal.isUserCouncilSecretary || isCouncilSecretary(currentUser.role)}
              onFinalized={() => {
                // Reload proposal after finalization
                if (id) {
                  proposalsApi.getProposalById(id).then(setProposal).catch(() => {});
                }
              }}
            />
          </section>
        )}

        {/* Evaluation Results Viewer (GIANG_VIEN Feature) */}
        {/* Show for proposal owners when evaluation is finalized */}
        {evaluation && currentUser && proposal.ownerId === currentUser.id && (
          <section className="rounded-lg border-0 shadow-lg overflow-hidden">
            <EvaluationResultsViewer
              proposalId={proposal.id}
              proposalCode={proposal.code}
              proposalTitle={proposal.title}
              evaluation={evaluation}
              evaluatorName={proposal.holderUser}
              evaluatedAt={evaluation.updatedAt}
            />
          </section>
        )}

        {/* State-specific message */}
        {!shouldShowEvaluationForm && proposal.state === 'SCHOOL_COUNCIL_OUTLINE_REVIEW' && (
          <section className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-900/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-yellow-800 dark:text-yellow-200">
                  Phiếu đánh giá
                </h3>
                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  {currentUser && isCouncilMember(currentUser.role)
                    ? 'Đề tài này chưa được phân bổ cho bạn đánh giá.'
                    : 'Chỉ thành viên hội đồng mới có thể đánh giá đề tài này.'}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Attachments Section (Story 11.5) - Gộp biểu mẫu đã tạo + tài liệu đính kèm */}
        <section className="border border-gray-200 rounded-xl p-6 bg-white/90 backdrop-blur-sm shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-bold text-gray-900">
              Tài liệu đính kèm
            </h2>
          </div>

          {/* Biểu mẫu NCKH đã tạo - hiển thị theo trạng thái đã qua */}
          {!isLoadingDocuments ? (
            proposalDocuments.length > 0 && (
              <div className="mb-6">
                <ProposalDocumentsList
                  proposalId={proposal.id}
                  currentState={proposal.state}
                  documents={proposalDocuments}
                  showAllStates={currentUser?.role === 'ADMIN' || currentUser?.role === 'PHONG_KHCN'}
                />
              </div>
            )
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              Đang tải biểu mẫu...
            </div>
          )}

          {/* Divider nếu có cả biểu mẫu và attachments */}
          {proposalDocuments.length > 0 && attachments.length > 0 && (
            <hr className="my-6 border-gray-200" />
          )}

          {/* File Upload Component (Story 11.5) */}
          {canUploadAttachments && (
            <div className="mb-6">
              <FileUpload
                proposalId={proposal.id}
                onUploadSuccess={handleUploadSuccess}
                disabled={!proposal || (proposal.state !== 'DRAFT' && proposal.state !== 'CHANGES_REQUESTED')}
                currentTotalSize={attachmentsTotalSize}
              />
            </div>
          )}

          {/* Attachment List Component (Story 11.5) */}
          {!isLoadingAttachments ? (
            <AttachmentList
              proposalId={proposal.id}
              proposalState={proposal.state}
              attachments={attachments}
              totalSize={attachmentsTotalSize}
              onAttachmentChange={handleAttachmentChange}
            />
          ) : (
            <div className="text-center py-8 text-gray-600 text-sm font-medium">
              Đang tải tài liệu...
            </div>
          )}
        </section>

        {/* Document Generation Section (FormEngine Integration) */}
        <section className="border border-gray-200 rounded-xl p-6 bg-white/90 backdrop-blur-sm shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <FileOutput className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-bold text-gray-900">
              Tạo biểu mẫu NCKH
            </h2>
          </div>
          <DocumentGenerator
            proposalId={proposal.id}
            proposalCode={proposal.code}
            onSuccess={(docId) => {
              console.log('Document generated:', docId);
              // Refresh documents list sau khi tạo biểu mẫu mới
              void loadProposalDocuments();
            }}
            onError={(error) => {
              console.error('Document generation failed:', error);
            }}
          />
        </section>

        {/* Form Data (for reference) */}
        {proposal.formData && Object.keys(proposal.formData).length > 0 && (
          <section className="border border-gray-200 rounded-xl p-6 bg-white/90 backdrop-blur-sm shadow-soft">
            <h2 className="text-lg font-bold mb-4 text-gray-900">
              Nội dung đề tài
            </h2>
            <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-4 overflow-auto max-h-96 border border-gray-200">
              {JSON.stringify(proposal.formData, null, 2)}
            </pre>
          </section>
        )}
      </div>

      {/* Change Council Dialog - PHONG_KHCN */}
      <ChangeCouncilDialog
        isOpen={isChangeCouncilDialogOpen}
        onClose={() => setIsChangeCouncilDialogOpen(false)}
        onSuccess={handleActionSuccess}
        proposalId={proposal.id}
        proposalCode={proposal.code}
        currentCouncilId={proposal.holderUnit || undefined}
        currentCouncilName={proposal.council?.name || `Council: ${proposal.holderUnit}`}
      />
    </div>
  );
}
