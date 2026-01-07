import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { proposalsApi } from '@/lib/api/proposals';

interface StartProjectButtonProps {
  proposalId: string;
  proposalState: string;
  onStart?: () => void;
}

/**
 * Story 6.1: Start Project Button
 *
 * Displays a button to start project execution (APPROVED → IN_PROGRESS).
 * Only visible when proposal is in APPROVED state.
 *
 * @param proposalId - Proposal ID
 * @param proposalState - Current proposal state
 * @param onStart - Callback after successful start
 */
export function StartProjectButton({ proposalId, proposalState, onStart }: StartProjectButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Only show in APPROVED state
  if (proposalState !== 'APPROVED') {
    return null;
  }

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await proposalsApi.startProject(proposalId);
      toast({
        title: 'Đã bắt đầu thực hiện',
        description: 'Đề tài đã được chuyển sang trạng thái Đang thực hiện.',
      });
      onStart?.();
    } catch (error: any) {
      toast({
        title: 'Không thể bắt đầu',
        description: error.response?.data?.error?.message || 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleStart}
      disabled={isLoading}
      variant="default"
      size="sm"
    >
      <PlayCircle className="h-4 w-4 mr-2" />
      {isLoading ? 'Đang xử lý...' : 'Bắt đầu thực hiện'}
    </Button>
  );
}
