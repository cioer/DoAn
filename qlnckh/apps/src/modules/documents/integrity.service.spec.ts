import { createHash } from 'crypto';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { IntegrityService } from './integrity.service';
import { PrismaService } from '../auth/prisma.service';
import * as fs from 'fs/promises';

// Mock fs/promises at the top level
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
}));

/**
 * IntegrityService Tests
 * Epic 7 Story 7.3: Document Integrity Tracking
 *
 * Tests verify:
 * - SHA-256 hash calculation
 * - Document verification
 * - Retention date calculation (7 years)
 */
describe('IntegrityService', () => {
  let service: IntegrityService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      document: {
        findUnique: vi.fn(),
      },
      documentManifest: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new IntegrityService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateSHA256', () => {
    it('should calculate correct SHA-256 hash', () => {
      const data = Buffer.from('test content');
      const expectedHash = createHash('sha256').update(data).digest('hex');

      const result = service.calculateSHA256(data);

      expect(result).toBe(expectedHash);
      expect(result.length).toBe(64); // SHA-256 produces 64 hex chars
    });

    it('should produce consistent hashes for same input', () => {
      const data = Buffer.from('consistent input');

      const hash1 = service.calculateSHA256(data);
      const hash2 = service.calculateSHA256(data);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const data1 = Buffer.from('input 1');
      const data2 = Buffer.from('input 2');

      const hash1 = service.calculateSHA256(data1);
      const hash2 = service.calculateSHA256(data2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty buffer', () => {
      const emptyBuffer = Buffer.from('');
      const expectedHash = createHash('sha256').update(emptyBuffer).digest('hex');

      const result = service.calculateSHA256(emptyBuffer);

      expect(result).toBe(expectedHash);
      expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should handle large buffer', () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB

      const result = service.calculateSHA256(largeBuffer);

      expect(result).toBeDefined();
      expect(result.length).toBe(64); // SHA-256 produces 64 hex chars
    });
  });

  describe('calculateRetentionDate', () => {
    it('should calculate 7-year retention date', () => {
      const result = service.calculateRetentionDate(7);
      const currentYear = new Date().getFullYear();

      expect(result.getFullYear()).toBe(currentYear + 7);
    });

    it('should support custom retention periods', () => {
      const currentYear = new Date().getFullYear();

      const result1 = service.calculateRetentionDate(1);
      const result2 = service.calculateRetentionDate(5);
      const result3 = service.calculateRetentionDate(10);

      expect(result1.getFullYear()).toBe(currentYear + 1);
      expect(result2.getFullYear()).toBe(currentYear + 5);
      expect(result3.getFullYear()).toBe(currentYear + 10);
    });
  });

  describe('verifyDocument', () => {
    it('should return verification result with integrity check', async () => {
      const mockDocument = {
        id: 'doc-1',
        filePath: '/path/to/doc.docx',
        sha256Hash: 'abc123',
        proposalId: 'proposal-1',
      };

      const fileBuffer = Buffer.from('file content');
      const currentHash = createHash('sha256').update(fileBuffer).digest('hex');

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.documentManifest.update.mockResolvedValue({});
      vi.mocked(fs.readFile).mockResolvedValue(fileBuffer);

      const result = await service.verifyDocument('doc-1', 'user-1');

      expect(result).toHaveProperty('documentId', 'doc-1');
      expect(result).toHaveProperty('verifiedBy', 'user-1');
      expect(result).toHaveProperty('storedHash', 'abc123');
      expect(result).toHaveProperty('currentHash', currentHash);
    });

    it('should detect hash mismatch', async () => {
      const originalFile = Buffer.from('original content');
      const modifiedFile = Buffer.from('modified content');
      const originalHash = createHash('sha256').update(originalFile).digest('hex');
      const modifiedHash = createHash('sha256').update(modifiedFile).digest('hex');

      const mockDocument = {
        id: 'doc-1',
        filePath: '/path/to/doc.docx',
        sha256Hash: originalHash,
        proposalId: 'proposal-1',
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.documentManifest.update.mockResolvedValue({});
      vi.mocked(fs.readFile).mockResolvedValue(modifiedFile);

      const result = await service.verifyDocument('doc-1', 'user-1');

      expect(result.valid).toBe(false);
      expect(result.storedHash).toBe(originalHash);
      expect(result.currentHash).toBe(modifiedHash);
    });

    it('should throw error when document does not exist', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);

      await expect(service.verifyDocument('non-existent', 'user-1')).rejects.toThrow('Document non-existent not found');
    });

    it('should update manifest with verification result', async () => {
      const mockDocument = {
        id: 'doc-1',
        filePath: '/path/to/doc.docx',
        sha256Hash: 'abc123',
        proposalId: 'proposal-1',
      };

      const fileBuffer = Buffer.from('file content');

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.documentManifest.update.mockResolvedValue({});
      vi.mocked(fs.readFile).mockResolvedValue(fileBuffer);

      await service.verifyDocument('doc-1', 'user-1');

      expect(mockPrisma.documentManifest.update).toHaveBeenCalledWith({
        where: { documentId: 'doc-1' },
        data: {
          verifiedAt: expect.any(Date),
          verifiedBy: 'user-1',
          verificationResult: expect.any(String),
        },
      });
    });
  });
});
