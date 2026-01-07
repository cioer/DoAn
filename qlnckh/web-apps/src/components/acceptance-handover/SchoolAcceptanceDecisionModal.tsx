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
import { proposalsApi, SchoolDecision } from '@/lib/api/proposals';

interface SchoolAcceptanceDecisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  proposalTitle: string;
  facultyDecision?: { decision: string; comments?: string };
  onSuccess?: () => void;
}

/**
 * Story 6.4: School Acceptance Decision Modal
 *
 * Modal for school acceptance review decision.
 * Allows Phong KHCN/Thu Ky Hoi Dong to accept or reject the school acceptance.
 *
 * @param open - Whether modal is open
 * @param onOpenChange - Callback when modal state changes
 * @param proposalId - Proposal ID
 * @param proposalTitle - Proposal title for display
 * @param facultyDecision - Faculty decision data for display
 * @param onSuccess - Callback after successful decision
 */
export function SchoolAcceptanceDecisionModal({
  open,
  onOpenChange,
  proposalId,
  proposalTitle,
  facultyDecision,
  onSuccess,
}: SchoolAcceptanceDecisionModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [decision, setDecision] = useState<SchoolDecision | null>(null);
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

    if (decision === SchoolDecision.KHONG_DAT && !comments.trim()) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Vui lòng nhập lý do không đạt.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await proposalsApi.submitSchoolDecision(proposalId, {
        decision,
        comments: comments || undefined,
      });
      toast({
        title:
          decision === SchoolDecision.DAT
            ? 'Đã duyệt nghiệm thu'
            : 'Đã trả về',
        description:
          decision === SchoolDecision.DAT
            ? 'Đề tài đã được chuyển sang bàn giao.'
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
          <DialogTitle>Nghiệm thu cấp Trường</DialogTitle>
          <DialogDescription className="truncate">
            {proposalTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Faculty decision info */}
          {facultyDecision && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Quyết định Khoa:</p>
              <p className="text-sm">
                {facultyDecision.decision === 'DAT' ? (
                  <span className="text-green-600 font-medium">Đạt</span>
                ) : (
                  <span className="text-red-600 font-medium">Không đạt</span>
                )}
                {facultyDecision.comments && (
                  <span className="text-muted-foreground">
                    {' - '}{facultyDecision.comments}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Decision */}
          <div className="space-y-3">
            <Label>
              Quyết định nghiệm thu <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={decision || ''}
              onValueChange={(value) => setDecision(value as SchoolDecision)}
            >
              <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value={SchoolDecision.DAT} id="dat" />
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <label
                  htmlFor="dat"
                  className="flex-1 cursor-pointer font-medium"
                >
                  Đạt
                </label>
              </div>
              <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value={SchoolDecision.KHONG_DAT} id="khong-dat" />
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
              {decision === SchoolDecision.KHONG_DAT
                ? 'Lý do không đạt'
                : 'Ý kiến đánh giá'}
              {decision === SchoolDecision.KHONG_DAT && (
                <span className="text-red-500">*</span>
              )}
            </Label>
            <Textarea
              id="comments"
              placeholder={
                decision === SchoolDecision.KHONG_DAT
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
            variant={decision === SchoolDecision.KHONG_DAT ? 'destructive' : 'default'}
          >
            {isLoading
              ? 'Đang xử lý...'
              : decision === SchoolDecision.DAT
                ? 'Duyệt đạt'
                : 'Trả về'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
