import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from './FileUpload';
import { Attachment } from '../../lib/api/attachments';

// Mock the attachments API
jest.mock('../../lib/api/attachments', () => ({
  attachmentsApi: {
    upload: jest.fn(),
  },
  Attachment: {},
}));

import { attachmentsApi } from '../../lib/api/attachments';

const mockOnUploadSuccess = jest.fn();
const mockProposalId = 'prop-123';

describe('FileUpload Component (Story 2.4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render upload zone', () => {
    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
      />
    );

    expect(
      screen.getByText('Kéo file vào đây hoặc click để chọn')
    ).toBeInTheDocument();
    expect(
      screen.getByText('PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (tối đa 5MB)')
    ).toBeInTheDocument();
  });

  it('should render disabled when disabled prop is true', () => {
    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
        disabled
      />
    );

    expect(screen.getByText('Upload bị vô hiệu')).toBeInTheDocument();
  });

  it('should show current total size when provided', () => {
    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
        currentTotalSize={10 * 1024 * 1024} // 10MB
      />
    );

    expect(screen.getByText(/Đã dùng: 10\.0 MB \/ 50 MB/)).toBeInTheDocument();
  });

  it('should validate file size before upload (AC2)', async () => {
    const user = userEvent.setup();
    (attachmentsApi.upload as jest.Mock).mockResolvedValue({});

    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
      />
    );

    const input = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
    const largeFile = new File(['content'], 'large.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 }); // 6MB

    await user.upload(input, largeFile);

    await waitFor(() => {
      expect(screen.getByText('File quá 5MB. Vui lòng nén hoặc chia nhỏ.')).toBeInTheDocument();
    });

    expect(attachmentsApi.upload).not.toHaveBeenCalled();
  });

  it('should validate file type before upload (AC1)', async () => {
    const user = userEvent.setup();

    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
      />
    );

    const input = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
    const invalidFile = new File(['content'], 'test.zip', {
      type: 'application/zip',
    });

    await user.upload(input, invalidFile);

    await waitFor(() => {
      expect(screen.getByText('Định dạng file không được hỗ trợ.')).toBeInTheDocument();
    });

    expect(attachmentsApi.upload).not.toHaveBeenCalled();
  });

  it('should validate total size before upload (AC5)', async () => {
    const user = userEvent.setup();

    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
        currentTotalSize={49 * 1024 * 1024} // 49MB already used
      />
    );

    const input = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
    const file = new File(['content'], 'new.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(file, 'size', { value: 2 * 1024 * 1024 }); // 2MB - would exceed limit

    await user.upload(input, file);

    await waitFor(() => {
      expect(
        screen.getByText(/Tổng dung lượng sẽ vượt giới hạn \(50MB\/proposal\)/)
      ).toBeInTheDocument();
    });

    expect(attachmentsApi.upload).not.toHaveBeenCalled();
  });

  it('should show warning when approaching 80% of limit (AC5)', async () => {
    const user = userEvent.setup();

    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
        currentTotalSize={40 * 1024 * 1024} // 40MB
      />
    );

    const input = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
    const file = new File(['content'], 'new.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }); // 5MB - total 45MB (> 80% of 50MB)

    await user.upload(input, file);

    await waitFor(() => {
      expect(
        screen.getByText(/Tổng dung lượng sau khi upload sẽ là 45\.0 MB \/ 50 MB/)
      ).toBeInTheDocument();
    });

    // Should have "Tiếp tục" button to proceed
    expect(screen.getByText('Tiếp tục')).toBeInTheDocument();
  });

  it('should upload valid file and call onUploadSuccess (AC3)', async () => {
    const user = userEvent.setup();
    const mockAttachment: Attachment = {
      id: 'att-1',
      proposalId: mockProposalId,
      fileName: 'uuid-document.pdf',
      fileUrl: '/uploads/uuid-document.pdf',
      fileSize: 1024 * 1024,
      mimeType: 'application/pdf',
      uploadedBy: 'user-1',
      uploadedAt: new Date(),
      deletedAt: null,
    };

    (attachmentsApi.upload as jest.Mock).mockResolvedValue(mockAttachment);

    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
      />
    );

    const input = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
    const file = new File(['content'], 'document.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB

    await user.upload(input, file);

    await waitFor(() => {
      expect(mockOnUploadSuccess).toHaveBeenCalledWith(mockAttachment);
    });
  });

  it('should handle upload timeout error (AC4)', async () => {
    const user = userEvent.setup();
    (attachmentsApi.upload as jest.Mock).mockRejectedValue(
      new Error('TIMEOUT: Upload quá hạn. Vui lòng thử lại.')
    );

    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
      />
    );

    const input = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
    const file = new File(['content'], 'document.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('Upload quá hạn. Vui lòng thử lại.')).toBeInTheDocument();
    });
  });

  it('should clear error when X button clicked', async () => {
    const user = userEvent.setup();

    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
      />
    );

    // Manually set an error
    const input = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
    const largeFile = new File(['content'], 'large.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });

    await user.upload(input, largeFile);

    await waitFor(() => {
      expect(screen.getByText('File quá 5MB. Vui lòng nén hoặc chia nhỏ.')).toBeInTheDocument();
    });

    // Click X button to clear error
    const clearButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg')
    ) as HTMLElement;
    await user.click(clearButton);

    await waitFor(() => {
      expect(screen.queryByText('File quá 5MB. Vui lòng nén hoặc chia nhỏ.')).not.toBeInTheDocument();
    });
  });
});
