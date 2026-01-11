import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { facultiesApi, Faculty } from '../../../../lib/api/users';
import { CreateFacultyModal } from './CreateFacultyModal';
import { EditFacultyModal } from './EditFacultyModal';
import { DeleteFacultyDialog } from './DeleteFacultyDialog';

interface FacultiesTabProps {
  onCreateFaculty: () => void;
}

export function FacultiesTab({ onCreateFaculty }: FacultiesTabProps) {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);

  // Load faculties
  const loadFaculties = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await facultiesApi.getFaculties({
        page,
        limit,
        search: searchQuery || undefined,
        type: typeFilter || undefined,
      });

      setFaculties(response.faculties);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.error_code || err.response?.data?.error?.message || 'Lỗi tải danh sách khoa';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and reload on filter/page change
  useEffect(() => {
    loadFaculties();
  }, [page, limit, typeFilter]);

  // Handle search (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      loadFaculties();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Open edit modal
  const handleEdit = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setShowEditModal(true);
  };

  // Open delete dialog
  const handleDelete = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setShowDeleteDialog(true);
  };

  // Handle create success
  const handleCreateSuccess = (faculty: Faculty) => {
    loadFaculties();
  };

  // Handle edit success
  const handleEditSuccess = (updatedFaculty: Faculty) => {
    setFaculties(faculties.map((f) => (f.id === updatedFaculty.id ? updatedFaculty : f)));
  };

  // Handle delete success
  const handleDeleteSuccess = (deletedFaculty: Faculty) => {
    setFaculties(faculties.filter((f) => f.id !== deletedFaculty.id));
    setTotal(total - 1);
  };

  // Type display mapping
  const typeLabels: Record<string, string> = {
    FACULTY: 'Khoa',
    DEPARTMENT: 'Bộ môn/Phòng',
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
                placeholder="Tìm kiếm theo mã hoặc tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả loại</option>
              <option value="FACULTY">Khoa</option>
              <option value="DEPARTMENT">Bộ môn/Phòng</option>
            </select>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-500">
          Tìm thấy <span className="font-medium">{total}</span> khoa
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Faculties table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-gray-500">Đang tải...</div>
        ) : faculties.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Không tìm thấy khoa nào
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã khoa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên khoa
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
                  {faculties.map((faculty) => (
                    <tr key={faculty.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {faculty.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {faculty.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {typeLabels[faculty.type] || faculty.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(faculty)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Sửa"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(faculty)}
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
      <EditFacultyModal
        isOpen={showEditModal}
        faculty={selectedFaculty}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
      />

      <DeleteFacultyDialog
        isOpen={showDeleteDialog}
        faculty={selectedFaculty}
        onClose={() => setShowDeleteDialog(false)}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
