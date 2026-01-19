import { Download, FileText, FileCheck, Clock, CheckCircle, XCircle } from 'lucide-react';
import { ProposalDocument, FORM_TYPE_NAMES, STATE_FORM_MAPPING, STATE_ORDER } from '../../shared/types/form-engine';
import { formEngineApi, downloadFile } from '../../lib/api/form-engine';
import { cn } from '../../lib/utils/cn';
import { useState } from 'react';

/**
 * ProposalDocumentsList Component
 *
 * Displays list of generated NCKH forms (biểu mẫu) with:
 * - Form name and type
 * - Creation date
 * - Status badge (DRAFT, PENDING, APPROVED, FINALIZED)
 * - Download buttons (DOCX, PDF)
 * - Filtering by passed states
 */
interface ProposalDocumentsListProps {
  proposalId: string;
  currentState: string;
  documents: ProposalDocument[];
  showAllStates?: boolean; // For admin/higher roles to see all documents
}

// Status badge colors
const getStatusStyle = (status: string) => {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    DRAFT: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Nháp' },
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Chờ duyệt' },
    APPROVED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Đã duyệt' },
    FINALIZED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Hoàn tất' },
  };
  return styles[status] || styles.DRAFT;
};

// Get forms that should be visible based on current state
const getVisibleFormTypes = (currentState: string): string[] => {
  const currentIndex = STATE_ORDER.indexOf(currentState);
  if (currentIndex === -1) return [];

  const visibleForms: string[] = [];

  // Add forms from all passed states
  for (let i = 0; i <= currentIndex; i++) {
    const state = STATE_ORDER[i];
    const forms = STATE_FORM_MAPPING[state];
    if (forms) {
      visibleForms.push(...forms);
    }
  }

  return visibleForms;
};

// Format file size
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export function ProposalDocumentsList({
  proposalId,
  currentState,
  documents,
  showAllStates = false,
}: ProposalDocumentsListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadType, setDownloadType] = useState<'docx' | 'pdf' | null>(null);

  // Filter documents based on passed states
  const visibleFormTypes = showAllStates ? null : getVisibleFormTypes(currentState);
  const filteredDocuments = visibleFormTypes
    ? documents.filter((doc) => visibleFormTypes.includes(doc.formType))
    : documents;

  // Sort by formType order
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    const formOrder = Object.keys(FORM_TYPE_NAMES);
    return formOrder.indexOf(a.formType) - formOrder.indexOf(b.formType);
  });

  const handleDownload = async (doc: ProposalDocument, type: 'docx' | 'pdf') => {
    if (!doc.filePath) return;

    setDownloadingId(doc.id);
    setDownloadType(type);

    try {
      const blob = type === 'pdf'
        ? await formEngineApi.downloadPdf(doc.id)
        : await formEngineApi.downloadDocx(doc.id);

      const fileName = doc.fileName || `${doc.formType}.${type}`;
      const downloadName = type === 'pdf'
        ? fileName.replace('.docx', '.pdf')
        : fileName;

      downloadFile(blob, downloadName);
    } catch (error) {
      console.error(`Download ${type} failed:`, error);
      alert(`Không thể tải file ${type.toUpperCase()}. Vui lòng thử lại.`);
    } finally {
      setDownloadingId(null);
      setDownloadType(null);
    }
  };

  if (sortedDocuments.length === 0) {
    return null; // Don't show section if no documents
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-50 to-indigo-50 flex items-center justify-center">
          <FileCheck className="w-4 h-4 text-primary-600" />
        </div>
        <h3 className="font-semibold text-gray-800">Biểu mẫu NCKH đã tạo</h3>
        <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-0.5 rounded-full">
          {sortedDocuments.length}
        </span>
      </div>

      {/* Documents list */}
      <div className="space-y-2">
        {sortedDocuments.map((doc) => {
          const statusStyle = getStatusStyle(doc.status);
          const isDownloading = downloadingId === doc.id;
          const formName = FORM_TYPE_NAMES[doc.formType] || doc.formType;

          return (
            <div
              key={doc.id}
              className={cn(
                'group flex items-center justify-between p-4 rounded-xl border transition-all duration-200',
                'shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5',
                'bg-white border-gray-100 hover:border-primary-200'
              )}
            >
              {/* File icon and info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-soft flex-shrink-0 bg-gradient-to-br from-primary-500 to-indigo-600">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-primary-600 transition-colors">
                    {formName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {/* Status badge */}
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      statusStyle.bg,
                      statusStyle.text
                    )}>
                      {statusStyle.label}
                    </span>
                    {/* File size */}
                    {doc.fileSize && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-500">
                          {formatFileSize(doc.fileSize)}
                        </span>
                      </>
                    )}
                    {/* Creation date */}
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {/* Download DOCX */}
                <button
                  onClick={() => handleDownload(doc, 'docx')}
                  disabled={!doc.filePath || isDownloading}
                  className={cn(
                    'p-2.5 rounded-lg transition-all duration-200',
                    'text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:shadow-soft',
                    (!doc.filePath || isDownloading) && 'opacity-50 cursor-not-allowed'
                  )}
                  title="Tải DOCX"
                >
                  {isDownloading && downloadType === 'docx' ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>

                {/* Download PDF */}
                <button
                  onClick={() => handleDownload(doc, 'pdf')}
                  disabled={!doc.filePath || isDownloading}
                  className={cn(
                    'p-2.5 rounded-lg transition-all duration-200',
                    'text-gray-500 hover:text-red-600 hover:bg-red-50 hover:shadow-soft',
                    (!doc.filePath || isDownloading) && 'opacity-50 cursor-not-allowed'
                  )}
                  title="Tải PDF"
                >
                  {isDownloading && downloadType === 'pdf' ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <span className="text-xs font-bold">PDF</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
