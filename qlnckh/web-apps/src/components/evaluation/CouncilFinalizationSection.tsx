import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertCircle, FileText } from 'lucide-react';
import {
  evaluationApi,
  CouncilMemberEvaluation,
  AllEvaluationsData,
  generateIdempotencyKey,
} from '../../lib/api/evaluations';

export interface CouncilFinalizationSectionProps {
  proposalId: string;
  proposalCode: string;
  isSecretary: boolean;
  onFinalized?: () => void;
}

/**
 * Council Finalization Section Component
 * Shows all member evaluations and allows secretary to finalize
 */
export function CouncilFinalizationSection({
  proposalId,
  proposalCode,
  isSecretary,
  onFinalized,
}: CouncilFinalizationSectionProps) {
  const [evaluationsData, setEvaluationsData] = useState<AllEvaluationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finalConclusion, setFinalConclusion] = useState<'DAT' | 'KHONG_DAT'>('DAT');
  const [finalComments, setFinalComments] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  const loadEvaluations = useCallback(async () => {
    if (!isSecretary) return;

    setLoading(true);
    setError(null);
    try {
      const data = await evaluationApi.getAllEvaluations(proposalId);
      setEvaluationsData(data);
    } catch (err: any) {
      console.error('Failed to load evaluations:', err);
      setError(err.response?.data?.error?.message || 'Không thể tải danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  }, [proposalId, isSecretary]);

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  const handleFinalize = async () => {
    if (!evaluationsData?.allSubmitted) return;

    setIsFinalizing(true);
    setError(null);
    try {
      const idempotencyKey = generateIdempotencyKey();
      await evaluationApi.finalizeCouncilEvaluation(proposalId, {
        finalConclusion,
        finalComments: finalComments || undefined,
        idempotencyKey,
      });
      onFinalized?.();
    } catch (err: any) {
      console.error('Failed to finalize:', err);
      setError(err.response?.data?.error?.message || 'Không thể finalize đánh giá');
    } finally {
      setIsFinalizing(false);
    }
  };

  if (!isSecretary) {
    return null;
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="ml-2 text-sm text-gray-600">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (error && !evaluationsData) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm text-red-800">Lỗi</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!evaluationsData) {
    return null;
  }

  const { councilName, secretaryName, evaluations, totalMembers, submittedCount, allSubmitted } = evaluationsData;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Finalize Đánh giá Hội đồng</h3>
        <p className="mt-1 text-sm text-gray-600">
          Hội đồng: {councilName} • Thư ký: {secretaryName}
        </p>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 mb-4 ${
        allSubmitted
          ? 'bg-green-50 border border-green-200'
          : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <div className="flex items-center gap-2">
          {allSubmitted ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          )}
          <span className={`text-sm font-medium ${
            allSubmitted ? 'text-green-800' : 'text-yellow-800'
          }`}>
            {allSubmitted
              ? 'Tất cả thành viên đã nộp đánh giá. Bạn có thể finalize.'
              : `Chờ ${totalMembers - submittedCount}/${totalMembers} thành viên nộp đánh giá`}
          </span>
        </div>
      </div>

      {/* Member Evaluations List */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Đánh giá của thành viên ({submittedCount}/{totalMembers})</h4>
        <div className="space-y-3">
          {evaluations.map((evaluation) => {
            const isSubmitted = evaluation.state === 'SUBMITTED' || evaluation.state === 'FINALIZED';
            const totalScore =
              (evaluation.formData.scientificContent?.score || 0) +
              (evaluation.formData.researchMethod?.score || 0) +
              (evaluation.formData.feasibility?.score || 0) +
              (evaluation.formData.budget?.score || 0);
            const avgScore = totalScore / 4;

            return (
              <div
                key={evaluation.id}
                className={`rounded-lg border p-3 ${
                  isSubmitted
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      isSubmitted ? 'bg-green-100' : 'bg-gray-200'
                    }`}>
                      <FileText className={`h-4 w-4 ${
                        isSubmitted ? 'text-green-600' : 'text-gray-500'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">
                          {evaluation.evaluatorName}
                        </span>
                        {evaluation.councilRole && (
                          <span className="text-xs text-gray-500">
                            ({evaluation.councilRole === 'SECRETARY' ? 'Thư ký' :
                              evaluation.councilRole === 'CHAIR' ? 'Chủ tịch' : 'Thành viên'})
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-600">
                        <span>Điểm trung bình: {avgScore.toFixed(1)}/5</span>
                        <span>Kết luận: {
                          evaluation.formData.conclusion === 'DAT' ? 'Đạt' : 'Không đạt'
                        }</span>
                      </div>
                      {evaluation.formData.otherComments && (
                        <p className="mt-2 text-xs text-gray-600 italic">
                          "{evaluation.formData.otherComments}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={`text-xs font-medium px-2 py-1 rounded ${
                    isSubmitted
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isSubmitted ? 'Đã nộp' : 'Chưa nộp'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Finalization Form */}
      {allSubmitted && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Kết luận cuối cùng</h4>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-600 mb-2 block">Kết luận:</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="finalConclusion"
                    value="DAT"
                    checked={finalConclusion === 'DAT'}
                    onChange={(e) => setFinalConclusion(e.target.value as 'DAT' | 'KHONG_DAT')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">Đạt</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="finalConclusion"
                    value="KHONG_DAT"
                    checked={finalConclusion === 'KHONG_DAT'}
                    onChange={(e) => setFinalConclusion(e.target.value as 'DAT' | 'KHONG_DAT')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">Không đạt</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600 mb-2 block">Nhận xét cuối cùng (optional):</label>
              <textarea
                value={finalComments}
                onChange={(e) => setFinalComments(e.target.value)}
                placeholder="Nhập nhận xét cuối cùng nếu có..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleFinalize}
                disabled={isFinalizing}
                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isFinalizing ? 'Đang finalize...' : 'Finalize Đánh giá'}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Sau khi finalize, đề tài sẽ chuyển sang trạng thái{' '}
              <span className="font-medium">{finalConclusion === 'DAT' ? 'Đã duyệt' : 'Yêu cầu sửa'}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
