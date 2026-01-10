import { useState, useEffect } from 'react';
import { PlusCircle, XCircle } from 'lucide-react';
import { proposalsApi, ProductType, FacultyAcceptanceProduct } from '../../lib/api/proposals';
import { Button } from '../ui';
import { Textarea } from '../ui';
import { Input } from '../ui';
import { Label } from '../ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui';
import { useToast } from '../../hooks/use-toast';

interface FacultyAcceptanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  onSuccess?: () => void;
}

/**
 * Story 6.2: Faculty Acceptance Modal
 *
 * Modal for submitting faculty acceptance review.
 * Allows user to enter results and add products.
 *
 * @param open - Whether modal is open
 * @param onOpenChange - Callback when modal state changes
 * @param proposalId - Proposal ID
 * @param onSuccess - Callback after successful submission
 */
export function FacultyAcceptanceModal({
  open,
  onOpenChange,
  proposalId,
  onSuccess,
}: FacultyAcceptanceModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState('');
  const [products, setProducts] = useState<FacultyAcceptanceProduct[]>([]);
  const [newProduct, setNewProduct] = useState<{ name: string; type: ProductType; note: string }>({
    name: '',
    type: ProductType.KHAC,
    note: '',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setResults('');
      setProducts([]);
      setNewProduct({ name: '', type: ProductType.KHAC, note: '' });
    }
  }, [open]);

  const handleAddProduct = () => {
    if (!newProduct.name.trim()) {
      return;
    }
    setProducts([
      ...products,
      {
        name: newProduct.name,
        type: newProduct.type,
        note: newProduct.note || undefined,
      },
    ]);
    setNewProduct({ name: '', type: ProductType.KHAC, note: '' });
  };

  const handleRemoveProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!results.trim()) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Vui lòng nhập kết quả thực hiện.',
        variant: 'destructive',
      });
      return;
    }

    if (products.length === 0) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Vui lòng thêm ít nhất một sản phẩm.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await proposalsApi.submitFacultyAcceptance(proposalId, {
        results,
        products,
      });
      toast({
        title: 'Đã nộp hồ sơ nghiệm thu',
        description: 'Hồ sơ đã được gửi cho Khoa xem xét.',
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Không thể nộp hồ sơ',
        description: error.response?.data?.error?.message || 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const productTypeLabels: Record<ProductType, string> = {
    [ProductType.BAI_BAO]: 'Bài báo khoa học',
    [ProductType.SACH]: 'Sách/Chương sách',
    [ProductType.PHAN_MEM]: 'Phần mềm',
    [ProductType.SAN_PHAM]: 'Sản phẩm',
    [ProductType.KHAC]: 'Khác',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nộp hồ sơ nghiệm thu Khoa</DialogTitle>
          <DialogDescription>
            Nhập kết quả thực hiện và danh sách sản phẩm để gửi Khoa xem xét.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Results */}
          <div className="space-y-2">
            <Label htmlFor="results">
              Kết quả thực hiện <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="results"
              placeholder="Mô tả kết quả đã đạt được..."
              value={results}
              onChange={(e) => setResults(e.target.value)}
              rows={4}
            />
          </div>

          {/* Products */}
          <div className="space-y-4">
            <Label>
              Sản phẩm đầu ra <span className="text-red-500">*</span>
            </Label>

            {/* Product list */}
            {products.length > 0 && (
              <div className="space-y-2">
                {products.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {productTypeLabels[product.type]}
                        {product.note && ` - ${product.note}`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveProduct(index)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add product form */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  placeholder="Tên sản phẩm"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                />
              </div>
              <div className="w-48">
                <Select
                  value={newProduct.type}
                  onValueChange={(value) =>
                    setNewProduct({ ...newProduct, type: value as ProductType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Loại sản phẩm" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(productTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Ghi chú (tùy chọn)"
                  value={newProduct.note}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, note: e.target.value })
                  }
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddProduct}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Đang xử lý...' : 'Nộp hồ sơ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
