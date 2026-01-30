import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, FileArchive, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { proposalsApi, DossierPackType, DossierPackStatus } from '@/lib/api/proposals';

interface DossierExportButtonProps {
  proposalId: string;
  proposalCode: string;
  proposalState: string;
}

/**
 * Story 6.6: Dossier Export Button
 *
 * Dropdown button to export dossier packs as ZIP files.
 * Shows available pack types based on proposal state.
 *
 * @param proposalId - Proposal ID
 * @param proposalCode - Proposal code for display
 * @param proposalState - Current proposal state
 */
const PACK_TYPE_INFO: Record<
  DossierPackType,
  { label: string; description: string; minState: string }
> = {
  [DossierPackType.FACULTY_ACCEPTANCE]: {
    label: 'Hồ sơ nghiệm thu Khoa',
    description: 'Kết quả và sản phẩm nghiệm thu cấp Khoa',
    minState: 'FACULTY_COUNCIL_ACCEPTANCE_REVIEW',
  },
  [DossierPackType.SCHOOL_ACCEPTANCE]: {
    label: 'Hồ sơ nghiệm thu Trường',
    description: 'Kết quả nghiệm thu cấp Trường',
    minState: 'SCHOOL_COUNCIL_ACCEPTANCE_REVIEW',
  },
  [DossierPackType.HANDOVER]: {
    label: 'Hồ sơ bàn giao',
    description: 'Tài liệu bàn giao hoàn thành',
    minState: 'HANDOVER',
  },
  [DossierPackType.FINAL]: {
    label: 'Hồ sơ hoàn chỉnh',
    description: 'Toàn bộ hồ sơ từ đầu đến cuối',
    minState: 'COMPLETED',
  },
};

const STATE_ORDER = [
  'FACULTY_COUNCIL_ACCEPTANCE_REVIEW',
  'SCHOOL_COUNCIL_ACCEPTANCE_REVIEW',
  'HANDOVER',
  'COMPLETED',
];

function getStateRank(state: string): number {
  return STATE_ORDER.indexOf(state);
}

export function DossierExportButton({
  proposalId,
  proposalCode,
  proposalState,
}: DossierExportButtonProps) {
  const { toast } = useToast;
  const [statusMap, setStatusMap] = useState<Record<DossierPackType, DossierPackStatus>>({
    [DossierPackType.FACULTY_ACCEPTANCE]: { ready: false, state: proposalState, message: '' },
    [DossierPackType.SCHOOL_ACCEPTANCE]: { ready: false, state: proposalState, message: '' },
    [DossierPackType.HANDOVER]: { ready: false, state: proposalState, message: '' },
    [DossierPackType.FINAL]: { ready: false, state: proposalState, message: '' },
  });
  const [isGenerating, setIsGenerating] = useState<DossierPackType | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);

  // Update status map on state change
  useEffect(() => {
    Object.keys(PACK_TYPE_INFO).forEach(async (type) => {
      try {
        const status = await proposalsApi.getDossierPackStatus(
          proposalId,
          type as DossierPackType,
        );
        setStatusMap((prev) => ({ ...prev, [type]: status }));
      } catch {
        // Ignore error
      }
    });
  }, [proposalId, proposalState]);

  const availablePackTypes = Object.entries(PACK_TYPE_INFO)
    .filter(([_, info]) => getStateRank(proposalState) >= getStateRank(info.minState))
    .map(([type, _]) => type as DossierPackType);

  if (availablePackTypes.length === 0) {
    return null;
  }

  const handleExport = async (packType: DossierPackType) => {
    const status = statusMap[packType];
    if (!status.ready) {
      toast({
        title: 'Chưa sẵn sàng',
        description: status.message || 'Hồ sơ chưa sẵn sàng để xuất.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(packType);
    try {
      const result = await proposalsApi.generateDossierPack(proposalId, packType);
      setDownloadUrl(result.fileUrl);
      setShowDownloadDialog(true);
    } catch (error: any) {
      toast({
        title: 'Không thể xuất hồ sơ',
        description: error.response?.data?.error?.message || 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(null);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
      setShowDownloadDialog(false);
      setDownloadUrl(null);
    }
  };

  const getStatusIcon = (packType: DossierPackType) => {
    const status = statusMap[packType];
    if (!status.ready) {
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <FileArchive className="h-4 w-4 mr-2" />
            Xuất hồ sơ
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <div className="px-2 py-1.5 text-sm font-semibold">
            Xuất hồ sơ - {proposalCode}
          </div>
          <DropdownMenuSeparator />
          {availablePackTypes.map((packType) => {
            const info = PACK_TYPE_INFO[packType];
            const isLoading = isGenerating === packType;
            return (
              <DropdownMenuItem
                key={packType}
                onClick={() => handleExport(packType)}
                disabled={isLoading}
              >
                <div className="flex items-center gap-2 flex-1">
                  {isLoading ? (
                    <Clock className="h-4 w-4 animate-spin" />
                  ) : (
                    getStatusIcon(packType)
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{info.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {info.description}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Download Dialog */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Đã tạo file ZIP</DialogTitle>
            <DialogDescription>
              File hồ sơ đã được tạo thành công. Bạn có thể tải về ngay bây giờ.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-6">
            <FileArchive className="h-16 w-16 text-green-600" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDownloadDialog(false)}>
              Đóng
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Tải xuống
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
