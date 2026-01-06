import { render, screen } from '@testing-library/react';
import { AttachmentList } from './AttachmentList';
import { Attachment } from '../../lib/api/attachments';

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
  it('should render empty state when no attachments', () => {
    render(
      <AttachmentList
        proposalId="prop-1"
        attachments={[]}
        totalSize={0}
      />
    );

    expect(screen.getByText('Chưa có tài liệu đính kèm')).toBeInTheDocument();
  });

  it('should render list of attachments', () => {
    render(
      <AttachmentList
        proposalId="prop-1"
        attachments={mockAttachments}
        totalSize={3 * 1024 * 1024}
      />
    );

    expect(screen.getByText('uuid-document.pdf')).toBeInTheDocument();
    expect(screen.getByText('uuid-spreadsheet.xlsx')).toBeInTheDocument();
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
    expect(screen.getByText(/1\.0 MB/)).toBeInTheDocument();
    // 2MB should be formatted as "2.0 MB"
    expect(screen.getByText(/2\.0 MB/)).toBeInTheDocument();
  });

  it('should display total size', () => {
    render(
      <AttachmentList
        proposalId="prop-1"
        attachments={mockAttachments}
        totalSize={3 * 1024 * 1024}
      />
    );

    expect(screen.getByText(/3\.0 MB \/ 50 MB/)).toBeInTheDocument();
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
    ).toBeInTheDocument();
  });

  it('should display upload date for each attachment', () => {
    render(
      <AttachmentList
        proposalId="prop-1"
        attachments={mockAttachments}
        totalSize={3 * 1024 * 1024}
      />
    );

    // Check for formatted date (Vietnamese locale)
    expect(screen.getByText(/06\/01\/2026/)).toBeInTheDocument();
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
    expect(totalSizeElement).toHaveClass('text-red-600');
  });
});
