import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { proposalsApi, FacultyDecision } from '../../lib/api/proposals';
import { Button } from '../ui';
import { Textarea } from '../ui';
import { Label } from '../ui';
import {
  Dialog,
  DialogFooter,
} from '../ui';

interface FacultyAcceptanceDecisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  proposalTitle: string;
  onSuccess?: () => void;
}

/**
 * Story 6.3: Faculty Acceptance Decision Modal
 *
 * Modal for faculty acceptance review decision.
 * Allows Quan Ly Khoa to accept or reject the faculty acceptance.
 *
 * @param open - Whether modal is open
 * @param onOpenChange - Callback when modal state changes
 * @param proposalId - Proposal ID
 * @param proposalTitle - Proposal title for display
 * @param onSuccess - Callback after successful decision
 */
export function FacultyAcceptanceDecisionModal({
  open,
  onOpenChange,
  proposalId,
  proposalTitle,
  onSuccess,
}: FacultyAcceptanceDecisionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [decision, setDecision] = useState<FacultyDecision | null>(null);
  const [comments, setComments] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setDecision(null);
      setComments('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!decision) {
      setError('Vui lòng chọn quyết định nghiệm thu.');
      return;
    }

    if (decision === FacultyDecision.KHONG_DAT && !comments.trim()) {
      setError('Vui lòng nhập lý do không đạt.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await proposalsApi.submitFacultyDecision(proposalId, {
        decision,
        comments: comments || undefined,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      setError(error.response?.data?.error?.message || 'Đã có lỗi xảy ra.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Nghiệm thu cấp Khoa"
      description={proposalTitle}
      size="md"
    >
      <div className="space-y-6">
        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Decision */}
        <div className="space-y-3">
          <Label>
            Quyết định nghiệm thu <span className="text-red-500">*</span>
          </Label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-accent cursor-pointer">
              <input
                type="radio"
                name="decision"
                value={FacultyDecision.DAT}
                checked={decision === FacultyDecision.DAT}
                onChange={(e) => setDecision(e.target.value as FacultyDecision)}
                className="w-4 h-4 text-blue-600"
              />
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="flex-1 font-medium">Đạt</span>
            </label>
            <label className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-accent cursor-pointer">
              <input
                type="radio"
                name="decision"
                value={FacultyDecision.KHONG_DAT}
                checked={decision === FacultyDecision.KHONG_DAT}
                onChange={(e) => setDecision(e.target.value as FacultyDecision)}
                className="w-4 h-4 text-blue-600"
              />
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="flex-1 font-medium">Không đạt</span>
            </label>
          </div>
        </div>

        {/* Comments */}
        <div className="space-y-2">
          <Label htmlFor="comments">
            {decision === FacultyDecision.KHONG_DAT
              ? 'Lý do không đạt'
              : 'Ý kiến đánh giá'}
            {decision === FacultyDecision.KHONG_DAT && (
              <span className="text-red-500">*</span>
            )}
          </Label>
          <Textarea
            id="comments"
            placeholder={
              decision === FacultyDecision.KHONG_DAT
                ? 'Nhập lý do không đạt...'
                : 'Nhập ý kiến đánh giá (tùy chọn)...'
            }
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Hủy
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !decision}
          variant={decision === FacultyDecision.KHONG_DAT ? 'destructive' : 'default'}
        >
          {isLoading
            ? 'Đang xử lý...'
            : decision === FacultyDecision.DAT
              ? 'Duyệt đạt'
              : 'Trả về'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
