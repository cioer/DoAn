import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { proposalsApi, HandoverChecklistItem } from '@/lib/api/proposals';

interface HandoverChecklistPanelProps {
  proposalId: string;
  proposalState: string;
  existingChecklist?: HandoverChecklistItem[];
  onComplete?: () => void;
}

/**
 * Story 6.5: Handover Checklist Panel
 *
 * Displays handover checklist and allows completion.
 * Auto-saves checklist draft on change.
 *
 * @param proposalId - Proposal ID
 * @param proposalState - Current proposal state
 * @param existingChecklist - Existing checklist from form data
 * @param onComplete - Callback after successful completion
 */
const HANDOVER_CHECKLIST_ITEMS = [
  { id: 'bao_cao_ket_qua', label: 'Báo cáo kết quả', required: true },
  { id: 'san_pham_dau_ra', label: 'Sản phẩm đầu ra', required: true },
  { id: 'tai_lieu_huong_dan', label: 'Tài liệu hướng dẫn', required: false },
  { id: 'source_code', label: 'File source code', required: false },
  { id: 'tai_lieu_khac', label: 'Các tài liệu khác', required: false },
] as const;

export function HandoverChecklistPanel({
  proposalId,
  proposalState,
  existingChecklist,
  onComplete,
}: HandoverChecklistPanelProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [checklist, setChecklist] = useState<HandoverChecklistItem[]>([]);

  // Initialize checklist from existing data or defaults
  useEffect(() => {
    if (existingChecklist && existingChecklist.length > 0) {
      setChecklist(existingChecklist);
    } else {
      setChecklist(
        HANDOVER_CHECKLIST_ITEMS.map((item) => ({
          id: item.id,
          checked: false,
          note: '',
        })),
      );
    }
  }, [existingChecklist]);

  // Only show in HANDOVER or COMPLETED state
  if (proposalState !== 'HANDOVER' && proposalState !== 'COMPLETED') {
    return null;
  }

  const handleItemChange = (id: string, checked: boolean) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, checked } : item
    );
    setChecklist(updated);
    saveDraft(updated);
  };

  const handleNoteChange = (id: string, note: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, note } : item
    );
    setChecklist(updated);
    saveDraft(updated);
  };

  const saveDraft = async (items: HandoverChecklistItem[]) => {
    setIsSaving(true);
    try {
      await proposalsApi.saveHandoverChecklist(proposalId, items);
    } catch (error) {
      // Silently fail for auto-save
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    const checkedItems = checklist.filter((item) => item.checked);
    if (checkedItems.length === 0) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Vui lòng chọn ít least một mục.',
        variant: 'destructive',
      });
      return;
    }

    // Validate required items
    const requiredItemIds = HANDOVER_CHECKLIST_ITEMS
      .filter((item) => item.required)
      .map((item) => item.id);
    const missingRequired = requiredItemIds.filter(
      (id) => !checklist.find((item) => item.id === id && item.checked)
    );

    if (missingRequired.length > 0) {
      const missingLabels = HANDOVER_CHECKLIST_ITEMS
        .filter((item) => missingRequired.includes(item.id))
        .map((item) => item.label);
      toast({
        title: 'Thiếu mục bắt buộc',
        description: `Vui lòng chọn: ${missingLabels.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setIsCompleting(true);
    try {
      await proposalsApi.completeHandover(proposalId, checklist);
      toast({
        title: 'Đã hoàn thành bàn giao',
        description: 'Đề tài đã được chuyển sang trạng thái Hoàn thành.',
      });
      onComplete?.();
    } catch (error: any) {
      toast({
        title: 'Không thể hoàn thành',
        description: error.response?.data?.error?.message || 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const allRequiredChecked = HANDOVER_CHECKLIST_ITEMS
    .filter((item) => item.required)
    .every((item) => checklist.find((c) => c.id === item.id && c.checked));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Checklist bàn giao
        </CardTitle>
        <CardDescription>
          Đánh dấu các mục đã hoàn thành và bổ sung ghi chú.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {HANDOVER_CHECKLIST_ITEMS.map((item) => {
          const checklistItem = checklist.find((c) => c.id === item.id) || {
            id: item.id,
            checked: false,
            note: '',
          };
          return (
            <div key={item.id} className="space-y-2">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id={item.id}
                  checked={checklistItem.checked}
                  onCheckedChange={(checked) =>
                    handleItemChange(item.id, checked as boolean)
                  }
                  disabled={proposalState === 'COMPLETED'}
                />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={item.id}
                    className={item.required ? 'font-medium' : ''}
                  >
                    {item.label}
                    {item.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Input
                    placeholder="Ghi chú (tùy chọn)"
                    value={checklistItem.note}
                    onChange={(e) => handleNoteChange(item.id, e.target.value)}
                    disabled={proposalState === 'COMPLETED'}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {isSaving && (
          <p className="text-sm text-muted-foreground">Đang lưu...</p>
        )}

        {proposalState === 'HANDOVER' && (
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleComplete}
              disabled={!allRequiredChecked || isCompleting}
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isCompleting ? 'Đang xử lý...' : 'Hoàn thành bàn giao'}
            </Button>
          </div>
        )}

        {proposalState === 'COMPLETED' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800">
              Đã hoàn thành bàn giao
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
