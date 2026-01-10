import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { calendarApi, Holiday } from '../../lib/api/calendar';
import { useAuthStore } from '../../stores/authStore';
import { Permission } from '../../shared/types/permissions';
import { Button } from '../../components/ui/Button';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Select, SelectOption } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';

/**
 * Calendar Management Page (Quản lý lịch làm việc)
 *
 * Story 1.8: Business Calendar Basic
 *
 * Features:
 * - List holidays with year/month filter
 * - Add new holiday
 * - Edit existing holiday
 * - Delete holiday
 *
 * Requires CALENDAR_MANAGE permission
 */

const currentYear = new Date().getFullYear();
const yearOptions: SelectOption[] = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear + i - 2),
  label: String(currentYear + i - 2),
}));

const monthOptions: SelectOption[] = [
  { value: '', label: 'Tất cả các tháng' },
  { value: '1', label: 'Tháng 1' },
  { value: '2', label: 'Tháng 2' },
  { value: '3', label: 'Tháng 3' },
  { value: '4', label: 'Tháng 4' },
  { value: '5', label: 'Tháng 5' },
  { value: '6', label: 'Tháng 6' },
  { value: '7', label: 'Tháng 7' },
  { value: '8', label: 'Tháng 8' },
  { value: '9', label: 'Tháng 9' },
  { value: '10', label: 'Tháng 10' },
  { value: '11', label: 'Tháng 11' },
  { value: '12', label: 'Tháng 12' },
];

const holidayTypeOptions: SelectOption[] = [
  { value: 'true', label: 'Ngày lễ' },
  { value: 'false', label: 'Ngày làm việc' },
];

export default function CalendarPage() {
  const { hasPermission } = useAuthStore();

  // State
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterMonth, setFilterMonth] = useState('');

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    isHoliday: true,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permission
  const canManage = hasPermission(Permission.CALENDAR_MANAGE);

  // Load holidays
  useEffect(() => {
    loadHolidays();
  }, [filterYear, filterMonth]);

  const loadHolidays = async () => {
    setIsLoading(true);
    setError('');

    try {
      const params: { year?: number; month?: number } = {};
      if (filterYear) params.year = Number(filterYear);
      if (filterMonth) params.month = Number(filterMonth);

      const data = await calendarApi.getHolidays(params);
      setHolidays(data);
    } catch (err: any) {
      console.error('Failed to load holidays:', err);
      setError('Không thể tải danh sách ngày nghỉ');
    } finally {
      setIsLoading(false);
    }
  };

  // Open add dialog
  const openAddDialog = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      name: '',
      isHoliday: true,
    });
    setFormError('');
    setShowAddDialog(true);
  };

  // Open edit dialog
  const openEditDialog = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setFormData({
      date: holiday.date,
      name: holiday.name,
      isHoliday: holiday.isHoliday,
    });
    setFormError('');
    setShowEditDialog(true);
  };

  // Open delete dialog
  const openDeleteDialog = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setShowDeleteDialog(true);
  };

  // Handle form input change
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormError('');
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.date.trim()) {
      setFormError('Vui lòng chọn ngày');
      return false;
    }
    if (!formData.name.trim()) {
      setFormError('Vui lòng nhập tên ngày nghỉ');
      return false;
    }
    return true;
  };

  // Handle create holiday
  const handleCreate = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      await calendarApi.createHoliday({
        date: formData.date,
        name: formData.name,
        isHoliday: formData.isHoliday,
      });
      setShowAddDialog(false);
      await loadHolidays();
    } catch (err: any) {
      console.error('Failed to create holiday:', err);
      setFormError(err.response?.data?.error?.message || 'Không thể tạo ngày nghỉ mới');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update holiday
  const handleUpdate = async () => {
    if (!validateForm() || !selectedHoliday) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      await calendarApi.updateHoliday(selectedHoliday.id, {
        name: formData.name,
        isHoliday: formData.isHoliday,
      });
      setShowEditDialog(false);
      setSelectedHoliday(null);
      await loadHolidays();
    } catch (err: any) {
      console.error('Failed to update holiday:', err);
      setFormError(err.response?.data?.error?.message || 'Không thể cập nhật ngày nghỉ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete holiday
  const handleDelete = async () => {
    if (!selectedHoliday) return;

    setIsSubmitting(true);

    try {
      await calendarApi.deleteHoliday(selectedHoliday.id);
      setShowDeleteDialog(false);
      setSelectedHoliday(null);
      await loadHolidays();
    } catch (err: any) {
      console.error('Failed to delete holiday:', err);
      setError('Không thể xóa ngày nghỉ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Get weekday name
  const getWeekday = (dateString: string) => {
    const date = new Date(dateString);
    const weekdays = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return weekdays[date.getDay()];
  };

  if (!canManage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-700">Không có quyền truy cập</h1>
          <p className="text-gray-500 mt-2">Bạn cần quyền quản lý lịch để truy cập trang này</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý lịch làm việc</h1>
            <p className="text-gray-600 mt-1">Quản lý ngày nghỉ và ngày lễ trong năm</p>
          </div>

          <Button
            variant="primary"
            onClick={openAddDialog}
            leftIcon={<Plus className="h-5 w-5" />}
          >
            Thêm ngày nghỉ
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-full sm:w-auto">
              <Select
                label="Năm"
                options={yearOptions}
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-auto flex-1 min-w-[200px]">
              <Select
                label="Tháng"
                options={monthOptions}
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Holidays table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              Đang tải dữ liệu...
            </div>
          ) : holidays.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium">Không tìm thấy ngày nghỉ</p>
              <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc thêm ngày nghỉ mới</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thứ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên ngày nghỉ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loại
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {holidays.map((holiday) => (
                    <tr key={holiday.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatDate(holiday.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getWeekday(holiday.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {holiday.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {holiday.isHoliday ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Ngày lễ
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Ngày làm việc
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditDialog(holiday)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(holiday)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Dialog */}
        <Dialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          title="Thêm ngày nghỉ mới"
          size="md"
        >
          <DialogBody>
            {formError && (
              <Alert variant="error" className="mb-4">
                {formError}
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên ngày nghỉ <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Ví dụ: Tết Nguyên Đán"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>

              <div>
                <Select
                  label="Loại ngày"
                  options={holidayTypeOptions}
                  value={String(formData.isHoliday)}
                  onChange={(e) => handleInputChange('isHoliday', e.target.value === 'true')}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowAddDialog(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              isLoading={isSubmitting}
            >
              Thêm mới
            </Button>
          </DialogFooter>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setSelectedHoliday(null);
          }}
          title="Chỉnh sửa ngày nghỉ"
          size="md"
        >
          <DialogBody>
            {formError && (
              <Alert variant="error" className="mb-4">
                {formError}
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày
                </label>
                <Input
                  type="date"
                  value={formData.date}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Không thể thay đổi ngày</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên ngày nghỉ <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Ví dụ: Tết Nguyên Đán"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>

              <div>
                <Select
                  label="Loại ngày"
                  options={holidayTypeOptions}
                  value={String(formData.isHoliday)}
                  onChange={(e) => handleInputChange('isHoliday', e.target.value === 'true')}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditDialog(false);
                setSelectedHoliday(null);
              }}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdate}
              isLoading={isSubmitting}
            >
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setSelectedHoliday(null);
          }}
          title="Xác nhận xóa"
          size="sm"
        >
          <DialogBody>
            <p className="text-gray-700">
              Bạn có chắc chắn muốn xóa ngày nghỉ <strong>"{selectedHoliday?.name}"</strong> ({selectedHoliday && formatDate(selectedHoliday.date)})?
            </p>
            <p className="text-sm text-gray-500 mt-2">Hành động này không thể hoàn tác.</p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedHoliday(null);
              }}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isSubmitting}
            >
              Xóa
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </div>
  );
}
