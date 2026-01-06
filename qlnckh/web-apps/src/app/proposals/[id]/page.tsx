/**
 * Proposal Detail Page (Story 5.3 Integration)
 *
 * Displays proposal details with conditional sections based on state.
 * - OUTLINE_COUNCIL_REVIEW: Shows EvaluationForm for assigned secretary
 *
 * Story 5.3: AC1 - Evaluation Form Display
 * Story 5.3: AC5 - Add EvaluationForm to proposal detail page
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { EvaluationForm, isCouncilSecretary } from '../../../../components/evaluation';
import { proposalsApi, Proposal } from '../../../../lib/api/proposals';

/**
 * User info from auth context (TODO: integrate with actual auth)
 */
interface UserInfo {
  id: string;
  role: string;
  facultyId?: string | null;
}

/**
 * Mock user - replace with actual auth context
 * TODO: Integrate with JWT auth
 */
const MOCK_USER: UserInfo = {
  id: 'mock-secretary-id',
  role: 'THU_KY_HOI_DONG',
  facultyId: null,
};

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUser] = useState<UserInfo>(MOCK_USER);

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
   * Check if evaluation form should be shown (Story 5.3: AC1, AC5)
   * Conditions:
   * - Proposal state is OUTLINE_COUNCIL_REVIEW
   * - Current user is THU_KY_HOI_DONG
   * - proposal.holder_user equals current user
   */
  const shouldShowEvaluationForm = Boolean(
    proposal &&
      proposal.state === 'OUTLINE_COUNCIL_REVIEW' &&
      isCouncilSecretary(currentUser.role) &&
      proposal.holderUser === currentUser.id,
  );

  /**
   * Loading state
   */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải đề tài...</p>
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
      <div className="mb-6 pb-4 border-b">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {proposal.title}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Mã: {proposal.code} • Trạng thái: {proposal.state}
            </p>
          </div>
          <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {proposal.state.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Proposal Information */}
        <section className="border rounded-lg p-6 bg-white dark:bg-gray-800">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Thông tin đề tài
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-600 dark:text-gray-400">Mã đề tài:</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{proposal.code}</dd>
            </div>
            <div>
              <dt className="text-gray-600 dark:text-gray-400">Trạng thái:</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {proposal.state.replace(/_/g, ' ')}
              </dd>
            </div>
            <div>
              <dt className="text-gray-600 dark:text-gray-400">Người tạo:</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{proposal.ownerId}</dd>
            </div>
            <div>
              <dt className="text-gray-600 dark:text-gray-400">Khoa:</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{proposal.facultyId}</dd>
            </div>
            {proposal.councilId && (
              <div>
                <dt className="text-gray-600 dark:text-gray-400">Hội đồng:</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{proposal.councilId}</dd>
              </div>
            )}
            {proposal.holderUser && (
              <div>
                <dt className="text-gray-600 dark:text-gray-400">Người xử lý:</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{proposal.holderUser}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Evaluation Form (Story 5.3: AC5) */}
        {/* Conditionally show when state = OUTLINE_COUNCIL_REVIEW and holder_user = current user */}
        {shouldShowEvaluationForm && (
          <section className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-900">
            <EvaluationForm
              proposalId={proposal.id}
              holderUser={proposal.holderUser}
              currentState={proposal.state}
              currentUserId={currentUser.id}
              currentUserRole={currentUser.role}
              isSecretary={isCouncilSecretary(currentUser.role)}
            />
          </section>
        )}

        {/* State-specific message */}
        {!shouldShowEvaluationForm && proposal.state === 'OUTLINE_COUNCIL_REVIEW' && (
          <section className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-900/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-yellow-800 dark:text-yellow-200">
                  Phiếu đánh giá
                </h3>
                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  {isCouncilSecretary(currentUser.role)
                    ? 'Đề tài này chưa được phân bổ cho bạn đánh giá.'
                    : 'Chỉ Thư ký Hội đồng được phân công mới có thể đánh giá đề tài này.'}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Form Data (for reference) */}
        {proposal.formData && Object.keys(proposal.formData).length > 0 && (
          <section className="border rounded-lg p-6 bg-white dark:bg-gray-800">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Nội dung đề tài
            </h2>
            <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-96">
              {JSON.stringify(proposal.formData, null, 2)}
            </pre>
          </section>
        )}
      </div>
    </div>
  );
}
