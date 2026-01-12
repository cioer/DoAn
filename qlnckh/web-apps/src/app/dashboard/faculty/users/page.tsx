import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Trash2, Users, Loader2, X, Check, AlertCircle } from 'lucide-react';
import { usersApi } from '../../../../lib/api/users';
import { UserRole } from '../../../../shared/types/users';

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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
        }`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard/faculty')}
            className="text-indigo-600 hover:text-indigo-800 mb-4"
          >
            ← Quay lại Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Quản lý người dùng khoa
              </h1>
              <p className="text-gray-600 mt-1">
                Quản lý tài khoản giảng viên và thư ký trong khoa
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Thêm người dùng
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo email hoặc họ tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tổng số</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Giảng viên</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'GIANG_VIEN').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Thư ký</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'THU_KY_KHOA').length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-indigo-600 mx-auto animate-spin" />
              <p className="mt-3 text-gray-600">Đang tải...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Không tìm thấy người dùng nào</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Người dùng</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vai trò</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
                          {user.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{user.displayName}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Thêm người dùng mới</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Họ tên *</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {formErrors.displayName && <p className="text-red-500 text-xs mt-1">{formErrors.displayName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vai trò *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Chọn vai trò</option>
                  <option value="GIANG_VIEN">Giảng viên</option>
                  <option value="THU_KY_KHOA">Thư ký khoa</option>
                </select>
                {formErrors.role && <p className="text-red-500 text-xs mt-1">{formErrors.role}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateUser}
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Đang tạo...' : 'Tạo người dùng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Chỉnh sửa người dùng</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Email không thể thay đổi</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Họ tên *</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {formErrors.displayName && <p className="text-red-500 text-xs mt-1">{formErrors.displayName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vai trò *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="GIANG_VIEN">Giảng viên</option>
                  <option value="THU_KY_KHOA">Thư ký khoa</option>
                </select>
                {formErrors.role && <p className="text-red-500 text-xs mt-1">{formErrors.role}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-rose-600" />
              </div>
              <h2 className="text-xl font-bold">Xác nhận xóa</h2>
              <p className="text-gray-600 mt-2">
                Bạn có chắc chắn muốn xóa người dùng <strong>{selectedUser.displayName}</strong>?
              </p>
              <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 mt-4">
                ⚠️ Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Đang xóa...' : 'Xóa người dùng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && temporaryPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold">Đã tạo người dùng thành công</h2>
              <p className="text-gray-600 mt-2">Mật khẩu tạm thời:</p>
              <div className="bg-indigo-50 rounded-xl p-4 my-4">
                <code className="text-lg font-mono text-indigo-700 break-all">
                  {temporaryPassword}
                </code>
              </div>
              <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
                ⚠️ Hãy lưu lại mật khẩu này ngay bây giờ.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setTemporaryPassword('');
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Tôi đã lưu lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
