/**
 * Council Evaluation Summary Component
 *
 * Displays aggregated council evaluation results for BAN_GIAM_HOC
 * to review before making final approval decision.
 *
 * Features:
 * - Progress indicator for council member submissions
 * - Aggregate scores table (avg, min, max)
 * - Final conclusion display
 * - Individual evaluator details with expand/collapse
 */

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Users, BarChart3, Star, AlertCircle, Crown, Loader2 } from 'lucide-react';
import { workflowApi, CouncilEvaluationSummaryData, AggregateScores } from '@/lib/api/workflow';

interface CouncilEvaluationSummaryProps {
  proposalId: string;
  onError?: (error: string) => void;
}

const SECTION_LABELS: Record<keyof AggregateScores, string> = {
  scientificContent: 'Nội dung khoa học',
  researchMethod: 'Phương pháp nghiên cứu',
  feasibility: 'Tính khả thi',
  budget: 'Kinh phí',
  overallAvg: 'Tổng điểm',
};

/**
 * Render star rating for a score (1-5)
 */
function StarRating({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i <= score ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Render score badge with color based on value
 */
function ScoreBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 4) return 'bg-green-100 text-green-700 border-green-300';
    if (score >= 3) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  return (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold text-sm ${getColor()}`}>
      {score.toFixed(1)}
    </span>
  );
}

/**
 * Main Component
 */
export function CouncilEvaluationSummary({
  proposalId,
  onError,
}: CouncilEvaluationSummaryProps) {
  const [data, setData] = useState<EvaluationSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvaluations, setExpandedEvaluations] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await workflowApi.getCouncilEvaluationSummary(proposalId);
        setData(result);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [proposalId, onError]);

  const toggleEvaluation = (id: string) => {
    setExpandedEvaluations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-xl border-2 border-amber-200 p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 text-amber-600 animate-spin mb-4" />
          <p className="text-amber-800 font-medium">Đang tải tổng kết đánh giá...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 rounded-xl border-2 border-red-200 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Không thể tải dữ liệu</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.evaluations.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl border-2 border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
          <p>Chưa có đánh giá nào từ hội đồng</p>
        </div>
      </div>
    );
  }

  const { aggregateScores, finalConclusion, finalComments, evaluations } = data;

  return (
    <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-xl border-2 border-amber-200 shadow-lg overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">TỔNG KẾT ĐÁNH GIÁ HỘI ĐỒNG</h3>
              <p className="text-amber-100 text-sm">{data.proposalCode} - {data.proposalTitle}</p>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="text-white font-semibold text-sm">
              {data.councilName}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Progress Indicator */}
        <div className="bg-white rounded-lg border border-amber-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-600" />
              <span className="font-medium text-gray-700">Tiến độ đánh giá</span>
            </div>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
              data.allSubmitted
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {data.submittedCount}/{data.totalMembers} thành viên
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(data.submittedCount / data.totalMembers) * 100}%` }}
            />
          </div>
        </div>

        {/* Aggregate Scores Table */}
        <div className="bg-white rounded-lg border border-amber-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-amber-200">
            <h4 className="font-semibold text-amber-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Điểm trung bình
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-amber-50/50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-amber-900">Tiêu chí</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-amber-900">Trung bình</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-amber-900">Thấp nhất</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-amber-900">Cao nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {(['scientificContent', 'researchMethod', 'feasibility', 'budget'] as const).map((key) => {
                  const scores = aggregateScores[key];
                  return (
                    <tr key={key} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {SECTION_LABELS[key]}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ScoreBadge score={scores.avg} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-semibold ${
                          scores.min <= 2 ? 'text-red-600' : 'text-gray-600'
                        }`}>{scores.min}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-semibold ${
                          scores.max >= 4 ? 'text-green-600' : 'text-gray-600'
                        }`}>{scores.max}</span>
                      </td>
                    </tr>
                  );
                })}
                {/* Overall Average - highlighted */}
                <tr className="bg-gradient-to-r from-amber-100 to-orange-100">
                  <td className="px-4 py-3 text-sm font-bold text-amber-900">
                    {SECTION_LABELS.overallAvg}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-4 py-2 bg-white rounded-full border-2 border-amber-300 shadow-sm">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      <span className="font-bold text-amber-900">{aggregateScores.overallAvg.toFixed(1)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-amber-800">
                      {Math.min(...['scientificContent', 'researchMethod', 'feasibility', 'budget'].map(k => aggregateScores[k].min))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-amber-800">
                      {Math.max(...['scientificContent', 'researchMethod', 'feasibility', 'budget'].map(k => aggregateScores[k].max))}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Final Conclusion */}
        {finalConclusion && (
          <div className={`rounded-lg border-2 p-5 ${
            finalConclusion === 'DAT'
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
          }`}>
            <div className="flex items-start gap-4">
              {finalConclusion === 'DAT' ? (
                <div className="bg-green-500 rounded-full p-2 flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              ) : (
                <div className="bg-red-500 rounded-full p-2 flex-shrink-0">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="flex-1">
                <h4 className={`font-bold text-lg mb-1 ${
                  finalConclusion === 'DAT' ? 'text-green-800' : 'text-red-800'
                }`}>
                  Kết luận: {finalConclusion === 'DAT' ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                </h4>
                {finalComments && (
                  <p className="text-gray-700 italic">"{finalComments}"</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Individual Evaluations */}
        <div className="bg-white rounded-lg border border-amber-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-amber-200">
            <h4 className="font-semibold text-amber-900">Chi tiết đánh giá thành viên</h4>
          </div>
          <div className="divide-y divide-amber-100">
            {evaluations.map((evaluation, index) => {
              const isExpanded = expandedEvaluations.has(evaluation.id);

              return (
                <div key={evaluation.id} className="transition-all duration-300">
                  {/* Summary Row */}
                  <button
                    onClick={() => toggleEvaluation(evaluation.id)}
                    className="w-full px-4 py-4 flex items-center justify-between hover:bg-amber-50/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                        evaluation.totalScore >= 16 ? 'bg-green-500' :
                        evaluation.totalScore >= 12 ? 'bg-blue-500' :
                        evaluation.totalScore >= 8 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>
                        {evaluation.totalScore}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {evaluation.evaluatorName}
                          {evaluation.isSecretary && (
                            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                              Thư ký
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          <StarRating score={evaluation.totalScore / 4} />
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            evaluation.conclusion === 'DAT'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {evaluation.conclusion || 'Chưa có kết luận'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-amber-50/30 animate-in slideDownFromTop">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {[
                          { label: 'Nội dung KH', score: evaluation.scientificContentScore },
                          { label: 'Phương pháp', score: evaluation.researchMethodScore },
                          { label: 'Khả thi', score: evaluation.feasibilityScore },
                          { label: 'Kinh phí', score: evaluation.budgetScore },
                        ].map((item) => (
                          <div key={item.label} className="bg-white rounded-lg p-3 border border-amber-200">
                            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                            <div className="flex items-center gap-2">
                              <StarRating score={item.score} />
                              <span className="font-bold text-gray-800">{item.score}/5</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {evaluation.otherComments && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200">
                          <p className="text-xs text-gray-500 mb-1">Nhận xét:</p>
                          <p className="text-sm text-gray-700 italic">
                            "{evaluation.otherComments}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer hint */}
        <div className="text-center text-xs text-amber-700/70">
          ⚠️ Đây là thông tin tham khảo. Vui lòng xem xét kỹ trước khi ra quyết định.
        </div>
      </div>
    </div>
  );
}

export default CouncilEvaluationSummary;
