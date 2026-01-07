import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { proposalsApi, FacultyDecision } from '@/lib/api/proposals';

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
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [decision, setDecision] = useState<FacultyDecision | null>(null);
  const [comments, setComments] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setDecision(null);
      setComments('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!decision) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Vui lòng chọn quyết định nghiệm thu.',
        variant: 'destructive',
      });
      return;
    }

    if (decision === FacultyDecision.KHONG_DAT && !comments.trim()) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Vui lòng nhập lý do không đạt.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await proposalsApi.submitFacultyDecision(proposalId, {
        decision,
        comments: comments || undefined,
      });
      toast({
        title:
          decision === FacultyDecision.DAT
            ? 'Đã duyệt nghiệm thu'
            : 'Đã trả về',
        description:
          decision === FacultyDecision.DAT
            ? 'Đề tài đã được chuyển lên cấp Trường.'
            : 'Đề tài đã được trả về chủ nhiệm.',
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Không thể ra quyết định',
        description: error.response?.data?.error?.message || 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nghiệm thu cấp Khoa</DialogTitle>
          <DialogDescription className="truncate">
            {proposalTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Decision */}
          <div className="space-y-3">
            <Label>
              Quyết định nghiệm thu <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={decision || ''}
              onValueChange={(value) => setDecision(value as FacultyDecision)}
            >
              <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value={FacultyDecision.DAT} id="dat" />
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <label
                  htmlFor="dat"
                  className="flex-1 cursor-pointer font-medium"
                >
                  Đạt
                </label>
              </div>
              <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value={FacultyDecision.KHONG_DAT} id="khong-dat" />
                <XCircle className="h-5 w-5 text-red-600" />
                <label
                  htmlFor="khong-dat"
                  className="flex-1 cursor-pointer font-medium"
                >
                  Không đạt
                </label>
              </div>
            </RadioGroup>
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
      </DialogContent>
    </Dialog>
  );
}
