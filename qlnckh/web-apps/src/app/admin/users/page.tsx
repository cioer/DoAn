import { useState } from 'react';
import { Plus } from 'lucide-react';
import { usersApi, Faculty, CreateUserResponse } from '../../../lib/api/users';
import { UsersTab } from './components/UsersTab';
import { FacultiesTab } from './components/FacultiesTab';
import { CreateUserModal } from './components/CreateUserModal';
import { CreateFacultyModal } from './components/CreateFacultyModal';

/**
 * UserManagementPage Component
 *
 * Main page for user and faculty management.
 * Requires USER_MANAGE permission.
 *
 * Features:
 * - Tab-based interface: Users | Faculties
 * - CRUD operations for users and faculties
 * - Vietnamese UI
 */
export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'faculties'>('users');

  // Modal states
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateFacultyModal, setShowCreateFacultyModal] = useState(false);

  const handleCreateUser = () => setShowCreateUserModal(true);
  const handleCreateFaculty = () => setShowCreateFacultyModal(true);

  const handleUserCreated = (response: CreateUserResponse) => {
    setShowCreateUserModal(false);
    // UsersTab will reload automatically
  };

  const handleFacultyCreated = (faculty: Faculty) => {
    setShowCreateFacultyModal(false);
    // FacultiesTab will reload automatically
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quản trị</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Quản lý người dùng và khoa
                </p>
              </div>
            </div>

            {/* Create button - changes based on active tab */}
            <button
              onClick={activeTab === 'users' ? handleCreateUser : handleCreateFaculty}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4" />
              {activeTab === 'users' ? 'Tạo người dùng' : 'Tạo khoa mới'}
            </button>
          </div>

          {/* Tab navigation */}
          <div className="mt-6 flex gap-1 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Người dùng
            </button>
            <button
              onClick={() => setActiveTab('faculties')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'faculties'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Khoa
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'users' && <UsersTab onCreateUser={handleCreateUser} />}
        {activeTab === 'faculties' && <FacultiesTab onCreateFaculty={handleCreateFaculty} />}
      </div>

      {/* Modals */}
      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={handleUserCreated}
      />

      <CreateFacultyModal
        isOpen={showCreateFacultyModal}
        onClose={() => setShowCreateFacultyModal(false)}
        onSuccess={handleFacultyCreated}
      />
    </div>
  );
}
