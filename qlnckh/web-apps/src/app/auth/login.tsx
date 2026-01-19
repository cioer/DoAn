import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, User, Lock, ArrowRight, Loader2, CheckCircle2, Users } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../lib/auth/auth';

// Demo accounts for quick login
const DEMO_ACCOUNTS = [
  { email: 'DT-USER-001@demo.qlnckh.edu.vn', role: 'Giảng viên', name: 'Nguyễn Văn A' },
  { email: 'DT-USER-002@demo.qlnckh.edu.vn', role: 'Quản lý Khoa', name: 'Trần Thị B' },
  { email: 'DT-USER-003@demo.qlnckh.edu.vn', role: 'Thư ký Khoa', name: 'Lê Văn C' },
  { email: 'DT-USER-004@demo.qlnckh.edu.vn', role: 'Phòng KHCN', name: 'Phạm Thị D' },
  { email: 'DT-USER-005@demo.qlnckh.edu.vn', role: 'Thư ký HĐ', name: 'Hoàng Văn E' },
  { email: 'DT-USER-006@demo.qlnckh.edu.vn', role: 'Thành Trung', name: 'Đặng Thị F' },
  { email: 'DT-USER-007@demo.qlnckh.edu.vn', role: 'Ban Giám hiệu', name: 'Vũ Văn G' },
  { email: 'DT-USER-008@demo.qlnckh.edu.vn', role: 'Admin', name: 'Admin System' },
];
const DEMO_PASSWORD = 'Demo@123';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser, setLoading, setError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setErrorLocal] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal('');
    setIsLoading(true);
    setIsSuccess(false);

    try {
      const response = await authApi.login(email, password);
      const user = response.user || response;
      setUser(user);
      setIsSuccess(true);
      setTimeout(() => navigate('/'), 500);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || 'Đăng nhập thất bại';
      setErrorLocal(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex">
      {/* Left Panel - Branding (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-900 relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=1600&fit=crop")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/70 via-blue-900/50 to-blue-900/90" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-12 justify-between pb-16">
          {/* Logo & Header */}
          <div className="pt-16">
            {/* Logo Icon */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                <School className="w-7 h-7 text-blue-200" />
              </div>
              <div>
                <h2 className="text-white text-sm tracking-widest font-semibold">
                  ĐẠI HỌC SƯ PHẠM KỸ THUẬT
                </h2>
                <p className="text-blue-200 text-xs tracking-wide">
                  NAM ĐỊNH • NUTE
                </p>
              </div>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl font-serif text-white leading-tight">
              Hệ Thống Quản Lý
            </h1>
            <h2 className="text-4xl font-serif text-blue-200 leading-tight mt-1">
              Nghiên Cứu Khoa Học
            </h2>
          </div>

          {/* Quote - Aligned with submit button */}
          <div className="border-l-4 border-amber-400 pl-5 py-2 max-w-md">
            <p className="text-blue-100 font-serif italic leading-relaxed text-sm">
              &quot;Kiến thức là ánh sáng, nghiên cứu là hành trình khám phá những chân trời mới.&quot;
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Form Header */}
          <div className="mb-8">
            {/* Mobile Logo - Only visible on small screens */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center">
                <School className="w-5 h-5 text-white" />
              </div>
              <div className="text-center">
                <h2 className="text-blue-900 text-xs tracking-widest font-bold">
                  NUTE
                </h2>
                <p className="text-slate-500 text-xs">
                  ĐH Sư phạm Kỹ thuật Nam Định
                </p>
              </div>
            </div>

            <h1 className="text-2xl font-serif text-slate-900 mb-1">
              Xin chào!
            </h1>
            <p className="text-slate-500 text-sm">
              Đăng nhập để truy cập hệ thống
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Demo Account Selector */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <label
                htmlFor="demo-account"
                className="block text-sm font-semibold text-amber-800 mb-2"
              >
                <Users className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                Chọn tài khoản Demo
              </label>
              <select
                id="demo-account"
                className="block w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm"
                onChange={(e) => {
                  const account = DEMO_ACCOUNTS.find(a => a.email === e.target.value);
                  if (account) {
                    setEmail(account.email);
                    setPassword(DEMO_PASSWORD);
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>-- Chọn tài khoản --</option>
                {DEMO_ACCOUNTS.map((account) => (
                  <option key={account.email} value={account.email}>
                    {account.role} - {account.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-amber-600 mt-1.5">
                Mật khẩu mặc định: <code className="bg-amber-100 px-1 rounded">Demo@123</code>
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 text-sm"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="block w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 ${isSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-900 hover:bg-blue-800'} disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Đăng nhập thành công!
                </>
              ) : (
                <>
                  Đăng nhập
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer - Copyright */}
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} Đại học Sư phạm Kỹ thuật Nam Định • NUTE
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
