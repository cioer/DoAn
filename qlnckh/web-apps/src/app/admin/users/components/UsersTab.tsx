import { useState, useEffect } from 'react';
import { Search, Edit, Trash2, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { usersApi } from '../../../../lib/api/users';
import type { UserListItem, CreateUserResponse } from '../../../../shared/types/users';
import { UserRole } from '../../../../shared/types/auth';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { DeleteUserDialog } from './DeleteUserDialog';

interface UsersTabProps {
  onCreateUser: () => void;
}

export function UsersTab({ onCreateUser }: UsersTabProps) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  // Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);

  // Load users
  const loadUsers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await usersApi.getUsers({
        page,
        limit,
        search: searchQuery || undefined,
        role: roleFilter as UserRole || undefined,
      });

      setUsers(response.users);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.error_code || err.response?.data?.error?.message || 'Lỗi tải danh sách người dùng';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and reload on filter/page change
  useEffect(() => {
    loadUsers();
  }, [page, limit, roleFilter]);

  // Handle search (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      loadUsers();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Open edit modal
  const handleEdit = (user: UserListItem) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  // Open delete dialog
  const handleDelete = (user: UserListItem) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  // Handle create success
  const handleCreateSuccess = (response: CreateUserResponse) => {
    loadUsers();
  };

  // Handle edit success
  const handleEditSuccess = (updatedUser: UserListItem) => {
    setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
  };

  // Handle delete success
  const handleDeleteSuccess = (deletedUser: UserListItem) => {
    setUsers(users.filter((u) => u.id !== deletedUser.id));
    setTotal(total - 1);
  };

  // Role display mapping
  const roleLabels: Record<UserRole, string> = {
    [UserRole.GIANG_VIEN]: 'Giảng viên / PI',
    [UserRole.QUAN_LY_KHOA]: 'Quản lý Khoa',
    [UserRole.HOI_DONG]: 'Thành viên HĐ',
    [UserRole.PHONG_KHCN]: 'Phòng KHCN',
    [UserRole.ADMIN]: 'Quản trị viên',
    [UserRole.BGH]: 'Ban Giám hiệu',
  };

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo email hoặc họ tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả vai trò</option>
              <option value={UserRole.GIANG_VIEN}>Giảng viên / PI</option>
              <option value={UserRole.QUAN_LY_KHOA}>Quản lý Khoa</option>
              <option value={UserRole.HOI_DONG}>Thành viên HĐ</option>
              <option value={UserRole.PHONG_KHCN}>Phòng KHCN</option>
              <option value={UserRole.ADMIN}>Quản trị viên</option>
              <option value={UserRole.BGH}>Ban Giám hiệu</option>
            </select>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-500">
          Tìm thấy <span className="font-medium">{total}</span> người dùng
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-gray-500">Đang tải...</div>
        ) : users.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Không tìm thấy người dùng nào
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Họ và tên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vai trò
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Đơn vị
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.displayName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {roleLabels[user.role] || user.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.facultyId || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Sửa"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t">
                <div className="text-sm text-gray-500">
                  Trang {page} / {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <EditUserModal
        isOpen={showEditModal}
        user={selectedUser}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
      />

      <DeleteUserDialog
        isOpen={showDeleteDialog}
        user={selectedUser}
        onClose={() => setShowDeleteDialog(false)}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
