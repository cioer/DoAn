import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AttachmentList } from './AttachmentList';
import { Attachment } from '../../lib/api/attachments';

// Mock attachmentsApi
vi.mock('../../lib/api/attachments', () => ({
  attachmentsApi: {
    formatFileSize: (bytes: number) => {
      if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      }
      return `${bytes} bytes`;
    },
    getDownloadUrl: (attachment: Attachment) => attachment.fileUrl,
  },
  Attachment: {},
}));

const mockAttachments: Attachment[] = [
  {
    id: 'att-1',
    proposalId: 'prop-1',
    fileName: 'uuid-document.pdf',
    fileUrl: '/uploads/uuid-document.pdf',
    fileSize: 1024 * 1024, // 1MB
    mimeType: 'application/pdf',
    uploadedBy: 'user-1',
    uploadedAt: new Date('2026-01-06T10:00:00Z'),
    deletedAt: null,
  },
  {
    id: 'att-2',
    proposalId: 'prop-1',
    fileName: 'uuid-spreadsheet.xlsx',
    fileUrl: '/uploads/uuid-spreadsheet.xlsx',
    fileSize: 2 * 1024 * 1024, // 2MB
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uploadedBy: 'user-1',
    uploadedAt: new Date('2026-01-06T11:00:00Z'),
    deletedAt: null,
  },
];

describe('AttachmentList Component (Story 2.4)', () => {
  beforeEach(() => {
    // Mock window.confirm
    global.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no attachments', () => {
    render(
      <AttachmentList
        proposalId="prop-1"
        attachments={[]}
        totalSize={0}
      />
    );

    expect(screen.getByText('Chưa có tài liệu đính kèm')).toBeDefined();
  });

  it('should render list of attachments', () => {
    render(
      <AttachmentList
        proposalId="prop-1"
        attachments={mockAttachments}
        totalSize={3 * 1024 * 1024}
      />
    );

    expect(screen.getByText('uuid-document.pdf')).toBeDefined();
    expect(screen.getByText('uuid-spreadsheet.xlsx')).toBeDefined();
  });

  it('should display formatted file sizes', () => {
    render(
      <AttachmentList
        proposalId="prop-1"
        attachments={mockAttachments}
        totalSize={3 * 1024 * 1024}
      />
    );

    // 1MB should be formatted as "1.0 MB"
    expect(screen.getByText(/1\.0 MB/)).toBeDefined();
    // 2MB should be formatted as "2.0 MB"
    expect(screen.getByText(/2\.0 MB/)).toBeDefined();
  });

  it('should display total size', () => {
    render(
      <AttachmentList
        proposalId="prop-1"
        attachments={mockAttachments}
        totalSize={3 * 1024 * 1024}
      />
    );

    expect(screen.getByText(/3\.0 MB \/ 50 MB/)).toBeDefined();
  });

  it('should show warning when over total size limit (AC5)', () => {
    render(
      <AttachmentList
        proposalId="prop-1"
        attachments={mockAttachments}
        totalSize={55 * 1024 * 1024} // Over 50MB limit
      />
    );

    expect(
      screen.getByText('Tổng dung lượng đã vượt giới hạn (50MB/proposal)')
    ).toBeDefined();
  });

  it('should display upload date for each attachment', () => {
    render(
      <AttachmentList
        proposalId="prop-1"
        attachments={mockAttachments}
        totalSize={3 * 1024 * 1024}
      />
    );

    // Check that date is displayed (format may vary by environment)
    const dates = screen.queryAllByText(/2026/);
    expect(dates.length).toBeGreaterThan(0);
  });

  it('should have download buttons for each attachment', () => {
    render(
      <AttachmentList
        proposalId="prop-1"
        attachments={mockAttachments}
        totalSize={3 * 1024 * 1024}
      />
    );

    const downloadButtons = screen.getAllByTitle('Tải xuống');
    expect(downloadButtons).toHaveLength(2);
  });

  it('should highlight total size in red when over limit', () => {
    render(
      <AttachmentList
        proposalId="prop-1"
        attachments={mockAttachments}
        totalSize={55 * 1024 * 1024}
      />
    );

    const totalSizeElement = screen.getByText(/55\.0 MB \/ 50 MB/);
    // Component uses text-error-600 design token, not text-red-600
    expect(totalSizeElement).toHaveClass('text-error-600');
  });

  it('should show replace and delete buttons when in DRAFT state', () => {
    render(
      <AttachmentList
        proposalId="prop-1"
        proposalState="DRAFT"
        attachments={mockAttachments}
        totalSize={3 * 1024 * 1024}
      />
    );

    const replaceButtons = screen.getAllByTitle('Thay thế tài liệu');
    const deleteButtons = screen.getAllByTitle('Xóa tài liệu');

    expect(replaceButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);
  });

  it('should show lock icon instead of action buttons when not in DRAFT state', () => {
    render(
      <AttachmentList
        proposalId="prop-1"
        proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
        attachments={mockAttachments}
        totalSize={3 * 1024 * 1024}
      />
    );

    const lockIcons = screen.getAllByTitle(/Không thể sửa sau khi nộp/);
    expect(lockIcons).toHaveLength(2);
  });
});
