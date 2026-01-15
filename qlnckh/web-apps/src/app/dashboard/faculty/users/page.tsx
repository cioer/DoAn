import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Trash2, Users, Loader2, X, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { usersApi } from '../../../../lib/api/users';
import { UserRole } from '../../../../shared/types/users';
import { Button } from '../../../../components/ui/Button';

export default function FacultyUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    role: '',
  });
  const [formErrors, setFormErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load users
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await usersApi.getUsers({ limit: 100 });
      setUsers(response.users);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Show toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Reset form
  const resetForm = () => {
    setFormData({ email: '', displayName: '', role: '' });
    setFormErrors({});
  };

  // Open create modal
  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  // Open edit modal
  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (user: any) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Handle create user
  const handleCreateUser = async () => {
    const errors: any = {};
    if (!formData.email) errors.email = 'Email là bắt buộc';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email không hợp lệ';
    if (!formData.displayName) errors.displayName = 'Họ tên là bắt buộc';
    if (!formData.role) errors.role = 'Vai trò là bắt buộc';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const response = await usersApi.createUser({
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role as UserRole,
      });

      setTemporaryPassword(response.temporaryPassword);
      setShowCreateModal(false);
      setShowPasswordModal(true);
      resetForm();
      loadUsers();
      showToast('Tạo người dùng thành công', 'success');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Không thể tạo người dùng';
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update user
  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    const errors: any = {};
    if (!formData.displayName) errors.displayName = 'Họ tên là bắt buộc';
    if (!formData.role) errors.role = 'Vai trò là bắt buộc';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      await usersApi.updateUser(selectedUser.id, {
        displayName: formData.displayName,
        role: formData.role as UserRole,
      });

      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      loadUsers();
      showToast('Cập nhật người dùng thành công', 'success');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Không thể cập nhật người dùng';
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);

    try {
      await usersApi.deleteUser(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
      showToast('Xóa người dùng thành công', 'success');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Không thể xóa người dùng';
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter((u) =>
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ROLE_LABELS: Record<string, string> = {
    GIANG_VIEN: 'Giảng viên',
    QUAN_LY_KHOA: 'Quản lý khoa',
    THU_KY_KHOA: 'Thư ký khoa',
    PHONG_KHCN: 'Phòng KHCN',
    ADMIN: 'Quản trị viên',
  };

  const stats = {
    total: users.length,
    giangVien: users.filter(u => u.role === 'GIANG_VIEN').length,
    thuKy: users.filter(u => u.role === 'THU_KY_KHOA').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
        }`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard/faculty')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
                  Quản lý người dùng khoa
                </h1>
              </div>
              <p className="text-gray-600 ml-15">
                Quản lý tài khoản giảng viên và thư ký trong khoa
              </p>
            </div>
            <Button
              onClick={openCreateModal}
              leftIcon={<Plus className="w-4 h-4" />}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg"
            >
              Thêm người dùng
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-blue-100 text-sm font-medium mb-1">Tổng số</p>
              <p className="text-4xl font-bold">{stats.total}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-emerald-100 text-sm font-medium mb-1">Giảng viên</p>
              <p className="text-4xl font-bold">{stats.giangVien}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-amber-100 text-sm font-medium mb-1">Thư ký</p>
              <p className="text-4xl font-bold">{stats.thuKy}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo email hoặc họ tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
              <p className="mt-4 text-gray-600">Đang tải...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-500">Không tìm thấy người dùng nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-indigo-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Người dùng</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Vai trò</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      className="hover:bg-blue-50/30 transition-colors"
                      style={{ animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                            {user.displayName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user.displayName}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(user)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
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

        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Thêm người dùng mới</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên *</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {formErrors.displayName && <p className="text-red-500 text-xs mt-1">{formErrors.displayName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Chọn vai trò</option>
                  <option value="GIANG_VIEN">Giảng viên</option>
                  <option value="THU_KY_KHOA">Thư ký khoa</option>
                </select>
                {formErrors.role && <p className="text-red-500 text-xs mt-1">{formErrors.role}</p>}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-2">
              <Button
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
                variant="secondary"
              >
                Hủy
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={isSubmitting}
                variant="primary"
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                {isSubmitting ? 'Đang tạo...' : 'Tạo người dùng'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Chỉnh sửa người dùng</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Email không thể thay đổi</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên *</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {formErrors.displayName && <p className="text-red-500 text-xs mt-1">{formErrors.displayName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="GIANG_VIEN">Giảng viên</option>
                  <option value="THU_KY_KHOA">Thư ký khoa</option>
                </select>
                {formErrors.role && <p className="text-red-500 text-xs mt-1">{formErrors.role}</p>}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-2">
              <Button
                onClick={() => setShowEditModal(false)}
                disabled={isSubmitting}
                variant="secondary"
              >
                Hủy
              </Button>
              <Button
                onClick={handleUpdateUser}
                disabled={isSubmitting}
                variant="primary"
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Xác nhận xóa</h2>
              <p className="text-gray-600">
                Bạn có chắc chắn muốn xóa người dùng <strong>{selectedUser.displayName}</strong>?
              </p>
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-sm text-amber-800">⚠️ Hành động này không thể hoàn tác.</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-2">
              <Button
                onClick={() => setShowDeleteModal(false)}
                disabled={isSubmitting}
                variant="secondary"
              >
                Hủy
              </Button>
              <Button
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                variant="primary"
                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
              >
                {isSubmitting ? 'Đang xóa...' : 'Xóa người dùng'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && temporaryPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Đã tạo người dùng thành công</h2>
              <p className="text-gray-600 mb-4">Mật khẩu tạm thời:</p>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-200">
                <code className="text-lg font-mono text-blue-700 break-all">
                  {temporaryPassword}
                </code>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-sm text-amber-800">⚠️ Hãy lưu lại mật khẩu này ngay bây giờ.</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end">
              <Button
                onClick={() => {
                  setShowPasswordModal(false);
                  setTemporaryPassword('');
                }}
                variant="primary"
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                Tôi đã lưu lại
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
