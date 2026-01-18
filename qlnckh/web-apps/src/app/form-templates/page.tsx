import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formTemplatesApi, FormTemplate, FormTemplateImportResult } from '../../lib/api/form-templates';
import { useAuthStore } from '../../stores/authStore';
import { Permission } from '../../shared/types/permissions';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { ImportWordDialog } from './components/ImportWordDialog';
import { FormTemplatePreviewDialog } from './components/FormTemplatePreviewDialog';
import { FormEnginePanel } from './components/FormEnginePanel';

export default function FormTemplatesPage() {
  const navigate = useNavigate();
  const { user, getEffectiveUser, isAuthenticated, hasPermission } = useAuthStore();

  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'db' | 'engine'>('db');

  const effectiveUser = getEffectiveUser();
  const canImport = hasPermission(Permission.FORM_TEMPLATE_IMPORT);
  // Only ADMIN and PHONG_KHCN can see Form Engine tab
  const canViewFormEngine = effectiveUser?.role === 'ADMIN' || effectiveUser?.role === 'PHONG_KHCN';

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login');
      return;
    }
    fetchTemplates();
  }, [isAuthenticated, navigate]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await formTemplatesApi.getTemplates();
      setTemplates(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Không thể tải danh sách biểu mẫu';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSuccess = (result: FormTemplateImportResult) => {
    setSuccessMessage(
      `Đã nhập thành công ${result.imported}/${result.total} biểu mẫu` +
      (result.failed > 0 ? ` (${result.failed} thất bại)` : '')
    );

    if (result.errors.length > 0) {
      const errorDetails = result.errors.map(e => `${e.templateCode}: ${e.message}`).join('\n');
      setError(`Một số biểu mẫu không thể nhập:\n${errorDetails}`);
    }

    // Refresh the templates list
    fetchTemplates();

    // Auto-hide success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const getProjectTypeLabel = (type: string) => {
    return type === 'CAP_TRUONG' ? 'Cấp trường' : type === 'CAP_KHOA' ? 'Cấp khoa' : type;
  };

  const getProjectTypeColor = (type: string) => {
    return type === 'CAP_TRUONG' ? 'primary' : type === 'CAP_KHOA' ? 'success' : 'secondary';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600 mb-2"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Quản lý biểu mẫu
          </h1>
          <p className="text-gray-600 mt-1">
            Danh sách các biểu mẫu dùng cho đề tài Nghiên cứu Khoa học
          </p>
        </div>

        {/* Success message */}
        {successMessage && (
          <Alert variant="success" className="mb-4">
            {successMessage}
          </Alert>
        )}

        {/* Error message */}
        {error && (
          <Alert variant="error" className="mb-4">
            <pre className="whitespace-pre-wrap">{error}</pre>
          </Alert>
        )}

        {/* Tab Navigation */}
        {canViewFormEngine && (
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex gap-4">
              <button
                onClick={() => setActiveTab('db')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'db'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                DB Templates
              </button>
              <button
                onClick={() => setActiveTab('engine')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'engine'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Form Engine
              </button>
            </nav>
          </div>
        )}

        {/* Form Engine Tab Content */}
        {activeTab === 'engine' && canViewFormEngine && (
          <FormEnginePanel className="mb-6" />
        )}

        {/* DB Templates Tab Content */}
        {activeTab === 'db' && (
          <>
            {/* Actions bar */}
            <div className="mb-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {templates.length} biểu mẫu
              </div>
              {canImport && (
                <Button
                  variant="primary"
                  onClick={() => setIsImportDialogOpen(true)}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  }
                >
                  Import từ Word
                </Button>
              )}
            </div>

            {/* Templates grid */}
            {templates.length === 0 ? (
              <Card className="p-8 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-gray-600 mb-4">Chưa có biểu mẫu nào trong hệ thống</p>
                {canImport && (
                  <Button variant="primary" onClick={() => setIsImportDialogOpen(true)}>
                    Import biểu mẫu từ Word
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className="p-4 hover:shadow-lg transition-all cursor-pointer border hover:border-blue-300"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">{template.code}</p>
                      </div>
                      <Badge variant={getProjectTypeColor(template.projectType || '')}>
                        {getProjectTypeLabel(template.projectType || '')}
                      </Badge>
                    </div>

                    {template.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {template.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm mt-auto">
                      <span className="text-gray-500">
                        {template.sections.length} phần
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">
                          {template.version}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTemplate(template);
                          }}
                        >
                          Xem trước
                        </Button>
                      </div>
                    </div>

                    {/* Sections preview */}
                    {template.sections.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex flex-wrap gap-1">
                          {template.sections.slice(0, 3).map((section) => (
                            <span
                              key={section.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                            >
                              {section.label}
                            </span>
                          ))}
                          {template.sections.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                              +{template.sections.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {!template.isActive && (
                      <div className="mt-2">
                        <Badge variant="secondary">Đã vô hiệu</Badge>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

          {/* Import Dialog */}
          <ImportWordDialog
            isOpen={isImportDialogOpen}
            onClose={() => setIsImportDialogOpen(false)}
            onImportSuccess={handleImportSuccess}
          />

          {/* Preview Dialog */}
          <FormTemplatePreviewDialog
            template={selectedTemplate}
            isOpen={!!selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
          />
          </>
        )}
      </div>
    </div>
  );
}
