import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileUpload } from './FileUpload';
import { Attachment } from '../../lib/api/attachments';

// Mock ProgressBar component
vi.mock('./ProgressBar', () => ({
  ProgressBar: ({ progress }: { progress: number }) => (
    <div data-testid="progress-bar" style={{ width: `${progress}%` }} />
  ),
}));

// Mock the attachments API
vi.mock('../../lib/api/attachments', () => ({
  attachmentsApi: {
    upload: vi.fn(),
  },
  Attachment: {},
}));

import { attachmentsApi } from '../../lib/api/attachments';

const mockOnUploadSuccess = vi.fn();
const mockProposalId = 'prop-123';

// Create a mock FileList
const createMockFileList = (files: File[]): FileList => {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] || null,
    [Symbol.iterator]: function* () {
      for (const file of files) {
        yield file;
      }
    },
  } as FileList;
  files.forEach((file, index) => {
    Object.defineProperty(fileList, index, { value: file, writable: false });
  });
  return fileList;
};

describe('FileUpload Component (Story 2.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    ).toBeDefined();
    expect(
      screen.getByText('PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (tối đa 5MB)')
    ).toBeDefined();
  });

  it('should render disabled when disabled prop is true', () => {
    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
        disabled
      />
    );

    expect(screen.getByText('Upload bị vô hiệu')).toBeDefined();
  });

  it('should show current total size when provided', () => {
    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
        currentTotalSize={10 * 1024 * 1024} // 10MB
      />
    );

    expect(screen.getByText(/Đã dùng: 10\.0 MB \/ 50 MB/)).toBeDefined();
  });

  it('should validate file size before upload (AC2)', async () => {
    vi.mocked(attachmentsApi.upload).mockResolvedValue({} as Attachment);

    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const largeFile = new File(['content'], 'large.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 }); // 6MB

      const mockFiles = createMockFileList([largeFile]);
      Object.defineProperty(input, 'files', { value: mockFiles, writable: false });

      input.dispatchEvent(new Event('change', { bubbles: true }));

      await waitFor(() => {
        expect(screen.queryByText('File quá 5MB. Vui lòng nén hoặc chia nhỏ.')).toBeDefined();
      });
    }

    expect(attachmentsApi.upload).not.toHaveBeenCalled();
  });

  it('should validate file type before upload (AC1)', async () => {
    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const invalidFile = new File(['content'], 'test.zip', {
        type: 'application/zip',
      });

      const mockFiles = createMockFileList([invalidFile]);
      Object.defineProperty(input, 'files', { value: mockFiles, writable: false });

      input.dispatchEvent(new Event('change', { bubbles: true }));

      await waitFor(() => {
        expect(screen.queryByText('Định dạng file không được hỗ trợ.')).toBeDefined();
      });
    }

    expect(attachmentsApi.upload).not.toHaveBeenCalled();
  });

  it('should validate total size before upload (AC5)', async () => {
    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
        currentTotalSize={49 * 1024 * 1024} // 49MB already used
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['content'], 'new.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(file, 'size', { value: 2 * 1024 * 1024 }); // 2MB

      const mockFiles = createMockFileList([file]);
      Object.defineProperty(input, 'files', { value: mockFiles, writable: false });

      input.dispatchEvent(new Event('change', { bubbles: true }));

      await waitFor(() => {
        expect(screen.queryByText(/Tổng dung lượng sẽ vượt giới hạn/)).toBeDefined();
      });
    }

    expect(attachmentsApi.upload).not.toHaveBeenCalled();
  });

  it('should show warning when approaching 80% of limit (AC5)', async () => {
    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
        currentTotalSize={40 * 1024 * 1024} // 40MB
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['content'], 'new.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }); // 5MB

      const mockFiles = createMockFileList([file]);
      Object.defineProperty(input, 'files', { value: mockFiles, writable: false });

      input.dispatchEvent(new Event('change', { bubbles: true }));

      await waitFor(() => {
        expect(screen.queryByText(/Tổng dung lượng sau khi upload sẽ là 45\.0 MB \/ 50 MB/)).toBeDefined();
      });

      // Should have "Tiếp tục" button to proceed
      expect(screen.queryByText('Tiếp tục')).toBeDefined();
    }
  });

  it('should upload valid file and call onUploadSuccess (AC3)', async () => {
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

    vi.mocked(attachmentsApi.upload).mockResolvedValue(mockAttachment);

    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['content'], 'document.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB

      const mockFiles = createMockFileList([file]);
      Object.defineProperty(input, 'files', { value: mockFiles, writable: false });

      input.dispatchEvent(new Event('change', { bubbles: true }));

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalledWith(mockAttachment);
      });
    }
  });

  it('should handle upload timeout error (AC4)', async () => {
    vi.mocked(attachmentsApi.upload).mockRejectedValue(
      new Error('TIMEOUT: Upload quá hạn. Vui lòng thử lại.')
    );

    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['content'], 'document.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });

      const mockFiles = createMockFileList([file]);
      Object.defineProperty(input, 'files', { value: mockFiles, writable: false });

      input.dispatchEvent(new Event('change', { bubbles: true }));

      await waitFor(() => {
        expect(screen.queryByText('Upload quá hạn. Vui lòng thử lại.')).toBeDefined();
      });
    }
  });

  it('should clear error when X button clicked', async () => {
    const user = userEvent.setup();

    render(
      <FileUpload
        proposalId={mockProposalId}
        onUploadSuccess={mockOnUploadSuccess}
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const largeFile = new File(['content'], 'large.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });

      const mockFiles = createMockFileList([largeFile]);
      Object.defineProperty(input, 'files', { value: mockFiles, writable: false });

      input.dispatchEvent(new Event('change', { bubbles: true }));

      await waitFor(() => {
        expect(screen.queryByText('File quá 5MB. Vui lòng nén hoặc chia nhỏ.')).toBeDefined();
      });

      // Click X button to clear error
      const closeButton = screen.getAllByRole('button').find((btn) =>
        btn.querySelector('svg')
      ) as HTMLElement;
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('File quá 5MB. Vui lòng nén hoặc chia nhỏ.')).toBeNull();
      });
    }
  });
});
