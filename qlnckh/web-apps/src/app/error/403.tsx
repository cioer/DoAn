import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

/**
 * 403 Forbidden Page
 *
 * Displayed when user tries to access a resource without proper permissions.
 *
 * Features:
 * - Lock icon from Lucide
 * - Clear error message in Vietnamese
 * - "Quay lại" button to navigate back or home
 */
export default function ForbiddenPage() {
  const handleGoBack = () => {
    // Try to go back in history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Otherwise go to home
      window.location.href = '/';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        {/* Lock Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <Lock className="h-10 w-10 text-red-600" />
        </div>

        {/* Error Code */}
        <h1 className="text-6xl font-bold text-gray-900">403</h1>

        {/* Error Message */}
        <h2 className="mt-4 text-2xl font-semibold text-gray-900">
          Truy cập bị từ chối
        </h2>
        <p className="mt-2 text-lg text-gray-600">
          Bạn không có quyền truy cập trang này
        </p>

        {/* Back Button */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Quay lại
          </button>
          <Link
            to="/"
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Về trang chủ
          </Link>
        </div>

        {/* Help Text */}
        <p className="mt-6 text-sm text-gray-500">
          Nếu bạn nghĩ đây là lỗi, vui lòng liên hệ với quản trị viên
        </p>
      </div>
    </div>
  );
}
