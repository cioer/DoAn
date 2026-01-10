/**
 * Evaluation Results Viewer Component (GIANG_VIEN Feature)
 *
 * Displays evaluation results for proposal owners (GIANG_VIEN role).
 * Shows:
 * - Overall score with visual indicator
 * - Individual section scores with progress bars
 * - Comments from council members
 * - Final conclusion (Đạt/Không Đạt)
 * - Export to PDF option
 *
 * Aesthetic Direction:
 * - Modern card-based layout with subtle gradients
 * - Animated score counters
 * - Color-coded status indicators
 * - Clean typography with Vietnamese readability
 */

import { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  Award,
  TrendingUp,
  Calendar,
  User,
} from 'lucide-react';
import { EvaluationFormData, Evaluation } from '../../lib/api/evaluations';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dialog, DialogBody, DialogHeader } from '../ui/Dialog';

export interface EvaluationResultsViewerProps {
  proposalId: string;
  proposalCode: string;
  proposalTitle: string;
  evaluation: Evaluation;
  evaluatorName?: string;
  evaluatedAt?: string;
}

// Score colors for visual feedback
const getScoreColor = (score: number): string => {
  if (score >= 4.5) return 'text-emerald-600';
  if (score >= 3.5) return 'text-blue-600';
  if (score >= 2.5) return 'text-yellow-600';
  return 'text-red-600';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 4.5) return 'bg-emerald-100';
  if (score >= 3.5) return 'bg-blue-100';
  if (score >= 2.5) return 'bg-yellow-100';
  return 'bg-red-100';
};

const getProgressBarColor = (score: number): string => {
  if (score >= 4.5) return 'bg-gradient-to-r from-emerald-400 to-emerald-600';
  if (score >= 3.5) return 'bg-gradient-to-r from-blue-400 to-blue-600';
  if (score >= 2.5) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
  return 'bg-gradient-to-r from-red-400 to-red-600';
};

/**
 * Animated Score Counter Component
 */
function AnimatedScore({ score }: { score: number }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 50;
    const increment = score / steps;
    const stepDuration = duration / steps;

    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.round(current * 10) / 10);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [score]);

  return (
    <span className={`font-bold ${getScoreColor(score)}`}>
      {displayScore.toFixed(1)}
    </span>
  );
}

/**
 * Score Card Component
 */
function ScoreCard({
  icon: Icon,
  title,
  score,
  comments,
  delay = 0,
}: {
  icon: typeof Award;
  title: string;
  score: number;
  comments: string;
  delay?: number;
}) {
  const percentage = (score / 5) * 100;

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
      style={{
        animation: `slideIn 0.5s ease-out ${delay}ms both`,
      }}
    >
      {/* Decorative gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Header */}
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2.5 ${getScoreBgColor(score)}`}>
            <Icon className={`h-5 w-5 ${getScoreColor(score)}`} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{title}</h4>
            <p className="text-sm text-gray-500">Đánh giá chi tiết</p>
          </div>
        </div>
        <div className={`rounded-lg px-3 py-1.5 ${getScoreBgColor(score)}`}>
          <AnimatedScore score={score} />
          <span className="text-xs text-gray-500"> / 5</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${getProgressBarColor(score)} transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Comments */}
      {comments && (
        <div className="relative mt-4 rounded-lg bg-gray-50 p-3">
          <p className="text-sm text-gray-700 leading-relaxed">"{comments}"</p>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Main Evaluation Results Viewer Component
 */
export function EvaluationResultsViewer({
  proposalId,
  proposalCode,
  proposalTitle,
  evaluation,
  evaluatorName = 'Thư ký Hội đồng',
  evaluatedAt,
}: EvaluationResultsViewerProps) {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { formData, state } = evaluation;
  const isFinalized = state === 'FINALIZED';
  const isPassed = formData.conclusion === 'DAT';

  // Calculate average score
  const averageScore =
    (formData.scientificContent.score +
      formData.researchMethod.score +
      formData.feasibility.score +
      formData.budget.score) / 4;

  // Handle export to PDF
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      // TODO: Implement PDF export API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setShowExportDialog(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-xl">
        {/* Decorative elements */}
        <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 translate-y-1/2 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative">
          {/* Proposal Info */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-400">
                <FileText className="h-4 w-4" />
                <span className="text-sm">{proposalCode}</span>
              </div>
              <h2 className="mt-2 text-2xl font-bold">{proposalTitle}</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              className="text-white hover:bg-white/10"
              leftIcon={<Download className="h-4 w-4" />}
            >
              Xuất PDF
            </Button>
          </div>

          {/* Status Banner */}
          <div className="flex items-center justify-between rounded-xl bg-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              {isPassed ? (
                <div className="rounded-full bg-emerald-500/20 p-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
              ) : (
                <div className="rounded-full bg-red-500/20 p-3">
                  <XCircle className="h-8 w-8 text-red-400" />
                </div>
              )}
              <div>
                <p className="text-sm text-slate-400">Kết quả đánh giá</p>
                <p className="text-xl font-bold">
                  {isPassed ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                </p>
              </div>
            </div>

            {/* Average Score */}
            <div className="text-right">
              <p className="text-sm text-slate-400">Điểm trung bình</p>
              <p className="text-3xl font-bold">
                <AnimatedScore score={averageScore} />
                <span className="text-lg text-slate-400">/5</span>
              </p>
            </div>
          </div>

          {/* Meta Info */}
          <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Đánh giá bởi: {evaluatorName}</span>
            </div>
            {evaluatedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Ngày đánh giá: {new Date(evaluatedAt).toLocaleDateString('vi-VN')}</span>
              </div>
            )}
            <div className="ml-auto">
              <Badge
                variant={isFinalized ? 'success' : 'warning'}
                className={isFinalized ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}
              >
                {isFinalized ? 'Đã hoàn thiện' : 'Nháp'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Score Cards Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        <ScoreCard
          icon={Award}
          title="Nội dung khoa học"
          score={formData.scientificContent.score}
          comments={formData.scientificContent.comments}
          delay={100}
        />
        <ScoreCard
          icon={TrendingUp}
          title="Phương pháp nghiên cứu"
          score={formData.researchMethod.score}
          comments={formData.researchMethod.comments}
          delay={200}
        />
        <ScoreCard
          icon={CheckCircle2}
          title="Tính khả thi"
          score={formData.feasibility.score}
          comments={formData.feasibility.comments}
          delay={300}
        />
        <ScoreCard
          icon={FileText}
          title="Kinh phí"
          score={formData.budget.score}
          comments={formData.budget.comments}
          delay={400}
        />
      </div>

      {/* Other Comments Section */}
      {formData.otherComments && (
        <Card variant="elevated" className="overflow-hidden">
          <CardHeader
            title="Ý kiến bổ sung"
            subtitle="Nhận xét thêm từ hội đồng đánh giá"
          />
          <CardBody>
            <div className="rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-5 border-l-4 border-amber-400">
              <p className="text-gray-700 leading-relaxed">
                {formData.otherComments}
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Conclusion Card */}
      <Card
        variant={isPassed ? 'default' : 'bordered'}
        className={`overflow-hidden ${isPassed ? 'border-emerald-200' : 'border-red-200'}`}
      >
        <div className={`p-6 ${isPassed ? 'bg-gradient-to-r from-emerald-50 to-teal-50' : 'bg-gradient-to-r from-red-50 to-pink-50'}`}>
          <div className="flex items-center gap-4">
            <div className={`rounded-full p-3 ${isPassed ? 'bg-emerald-500' : 'bg-red-500'}`}>
              {isPassed ? (
                <CheckCircle2 className="h-6 w-6 text-white" />
              ) : (
                <XCircle className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">KẾT LUẬN CUỐI CÙNG</h3>
              <p className={`text-lg font-bold ${isPassed ? 'text-emerald-700' : 'text-red-700'}`}>
                {isPassed ? 'Đề tài ĐẠT yêu cầu nghiệm thu' : 'Đề tài KHÔNG ĐẠT yêu cầu nghiệm thu'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Export Dialog */}
      <Dialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        title="Xuất kết quả đánh giá"
        size="md"
      >
        <DialogHeader
          title="Xuất kết quả đánh giá ra PDF"
          description="Tạo file PDF chứa đầy đủ thông tin đánh giá đề tài"
        />
        <DialogBody>
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-700 mb-2">File PDF sẽ bao gồm:</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Thông tin đề tài
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Điểm số từng mục
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Nhận xét chi tiết
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Kết luận cuối cùng
                </li>
              </ul>
            </div>
          </div>
        </DialogBody>
        <div className="p-6 border-t bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowExportDialog(false)}
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleExportPdf}
            isLoading={isExporting}
            leftIcon={<Download className="h-4 w-4" />}
          >
            {isExporting ? 'Đang xuất...' : 'Xuất PDF'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
