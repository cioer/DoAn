/**
 * Form Engine Panel Component
 *
 * Displays templates directly from Form Engine service.
 * Admin-only feature for testing document generation.
 */

import { useEffect, useState, useCallback } from 'react';
import { formEngineApi, EngineTemplate } from '../../../lib/api/form-engine';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Alert } from '../../../components/ui/Alert';
import { FORM_ID_DESCRIPTIONS } from '../../../shared/types/form-engine';
import { GenerateTestDialog } from './GenerateTestDialog';

interface FormEnginePanelProps {
  className?: string;
}

export function FormEnginePanel({ className = '' }: FormEnginePanelProps) {
  const [templates, setTemplates] = useState<EngineTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEngineOnline, setIsEngineOnline] = useState<boolean | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch health and templates in parallel for faster loading
      const [healthResult, templatesResult] = await Promise.allSettled([
        formEngineApi.getHealth(),
        formEngineApi.getEngineTemplates(),
      ]);

      // Process health result
      const isOnline = healthResult.status === 'fulfilled' && healthResult.value.available;
      setIsEngineOnline(isOnline);

      // Process templates result
      if (templatesResult.status === 'fulfilled') {
        const data = templatesResult.value;
        // Filter out utility files like test_checkbox.docx, toturial.docx
        const filteredTemplates = data.filter((t) => {
          const name = t.name.toLowerCase();
          return (
            !name.includes('test_') &&
            !name.includes('toturial') &&
            !name.includes('huongdan') &&
            !name.includes('temple')
          );
        });
        setTemplates(filteredTemplates);
      } else {
        // Templates fetch failed
        if (!isOnline) {
          setError('Form Engine service không khả dụng');
        } else {
          const err = templatesResult.reason;
          const errorMessage =
            err?.response?.data?.error?.message ||
            err?.message ||
            'Không thể tải danh sách templates';
          setError(errorMessage);
        }
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message ||
        err.message ||
        'Không thể tải danh sách templates';
      setError(errorMessage);
      setIsEngineOnline(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const getFormIdFromName = (name: string): string => {
    // Extract form ID from filename (e.g., "1b.docx" -> "1b")
    return name.replace('.docx', '').toLowerCase();
  };

  const getFormDescription = (name: string): string => {
    const formId = getFormIdFromName(name);
    return FORM_ID_DESCRIPTIONS[formId] || name;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleGenerateTest = (template: EngineTemplate) => {
    const formId = getFormIdFromName(template.name);
    setSelectedFormId(formId);
  };

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600"></div>
          <span className="text-gray-600">Đang tải Form Engine...</span>
        </div>
        {/* Skeleton loading */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header with health status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Form Engine Templates</h2>
          <Badge variant={isEngineOnline ? 'success' : 'error'}>
            {isEngineOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTemplates}>
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Làm mới
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={fetchTemplates}
          >
            Thử lại
          </Button>
        </Alert>
      )}

      {/* Templates info */}
      <div className="text-sm text-gray-600 mb-4">
        {templates.length} templates từ Form Engine
      </div>

      {/* Templates grid */}
      {templates.length === 0 && !error ? (
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
          <p className="text-gray-600">
            {isEngineOnline
              ? 'Không có templates nào trong Form Engine'
              : 'Form Engine không khả dụng'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map((template) => (
            <Card
              key={template.name}
              className="p-4 hover:shadow-md transition-all border hover:border-blue-300"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {template.name.replace('.docx', '').toUpperCase()}
                  </h3>
                  <p className="text-xs text-gray-500">{template.name}</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {formatFileSize(template.size)}
                </Badge>
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {getFormDescription(template.name)}
              </p>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleGenerateTest(template)}
                disabled={!isEngineOnline}
              >
                <svg
                  className="w-4 h-4 mr-1"
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
                Generate Test
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Generate Test Dialog */}
      <GenerateTestDialog
        formId={selectedFormId}
        isOpen={!!selectedFormId}
        onClose={() => setSelectedFormId(null)}
      />
    </div>
  );
}
