import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import * as request from 'supertest';
import { ProjectState, UserRole } from '@prisma/client';
import { AppModule } from '../../app.module';
import { PrismaService } from '../auth/prisma.service';
import { AttachmentsService } from './attachments.service';
import { AuthService } from '../auth/auth.service';

/**
 * Integration Tests for Attachments Upload Flow (Story 2.4)
 *
 * Tests the complete upload flow including:
 * - Authentication
 * - Authorization (ownership check)
 * - File validation (size, type)
 * - State validation (DRAFT only)
 * - Total size validation (50MB per proposal)
 * - Audit logging
 */
describe('Attachments Upload Flow (Integration Tests)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let authToken: string;
  let testUserId: string;
  let testProposalId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    authService = app.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.attachment.deleteMany({
      where: { proposalId: { contains: 'test-' } },
    });
    await prisma.proposal.deleteMany({
      where: { code: { startsWith: 'TEST-' } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: '-test-attachments' } },
    });

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'giang-vien-test-attachments@example.com',
        passwordHash: 'hashedpassword',
        displayName: 'Test Giảng Viên',
        role: UserRole.GIANG_VIEN,
        facultyId: null,
      },
    });
    testUserId = testUser.id;

    // Generate auth token
    authToken = await authService.generateTokens(testUser.id, testUser.role);

    // Create test proposal in DRAFT state
    const testProposal = await prisma.proposal.create({
      data: {
        code: 'TEST-ATTACH-' + Date.now(),
        title: 'Test Proposal for Attachments',
        state: ProjectState.DRAFT,
        ownerId: testUserId,
        facultyId: null,
      },
    });
    testProposalId = testProposal.id;
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.attachment.deleteMany({
      where: { proposalId: testProposalId },
    });
    await prisma.proposal.delete({
      where: { id: testProposalId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
  });

  describe('POST /api/proposals/:id/attachments', () => {
    it('should upload valid file successfully (AC3)', async () => {
      const testFilePath = join(__dirname, '../../../../fixtures/test.pdf');
      const testFileContent = Buffer.from('Test PDF content');

      const response = await request(app.getHttpServer())
        .post(`/api/proposals/${testProposalId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFileContent, 'test.pdf')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        proposalId: testProposalId,
        fileName: expect.stringMatching(/^[a-f0-9-]+-test\.pdf$/),
        fileSize: testFileContent.length,
        mimeType: 'application/pdf',
        uploadedBy: testUserId,
      });

      // Verify audit log was created
      const auditEvents = await prisma.auditEvent.findMany({
        where: { action: 'ATTACHMENT_UPLOAD' },
      });
      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0].metadata).toMatchObject({
        proposalId: testProposalId,
        fileName: expect.any(String),
        fileSize: testFileContent.length,
      });
    });

    it('should reject file larger than 5MB (AC2)', async () => {
      const largeFile = Buffer.alloc(6 * 1024 * 1024); // 6MB

      const response = await request(app.getHttpServer())
        .post(`/api/proposals/${testProposalId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeFile, 'large.pdf')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
      expect(response.body.error.message).toBe('File quá 5MB. Vui lòng nén hoặc chia nhỏ.');
    });

    it('should reject invalid file type (AC1)', async () => {
      const invalidFile = Buffer.from('Some content');

      const response = await request(app.getHttpServer())
        .post(`/api/proposals/${testProposalId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', invalidFile, 'test.zip')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
    });

    it('should reject upload when proposal not in DRAFT state', async () => {
      // Update proposal to FACULTY_REVIEW state
      await prisma.proposal.update({
        where: { id: testProposalId },
        data: { state: ProjectState.FACULTY_REVIEW },
      });

      const testFile = Buffer.from('Test content');

      const response = await request(app.getHttpServer())
        .post(`/api/proposals/${testProposalId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFile, 'test.pdf')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROPOSAL_NOT_DRAFT');
      expect(response.body.error.message).toBe('Không thể tải lên khi hồ sơ không ở trạng thái nháp.');
    });

    it('should reject upload when user is not the owner (authorization)', async () => {
      // Create another user
      const anotherUser = await prisma.user.create({
        data: {
          email: 'another-user-test@example.com',
          passwordHash: 'hashedpassword',
          displayName: 'Another User',
          role: UserRole.GIANG_VIEN,
          facultyId: null,
        },
      });

      // Generate token for another user
      const anotherToken = await authService.generateTokens(
        anotherUser.id,
        anotherUser.role
      );

      const testFile = Buffer.from('Test content');

      const response = await request(app.getHttpServer())
        .post(`/api/proposals/${testProposalId}/attachments`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .attach('file', testFile, 'test.pdf')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('Bạn không có quyền tải tài liệu lên đề tài này.');

      // Clean up
      await prisma.user.delete({ where: { id: anotherUser.id } });
    });

    it('should reject when total size exceeds 50MB (AC5)', async () => {
      // Create attachments totalling 49MB
      for (let i = 0; i < 49; i++) {
        await prisma.attachment.create({
          data: {
            proposalId: testProposalId,
            fileName: `existing-${i}.pdf`,
            fileUrl: `/uploads/existing-${i}.pdf`,
            fileSize: 1 * 1024 * 1024, // 1MB each
            mimeType: 'application/pdf',
            uploadedBy: testUserId,
          },
        });
      }

      const newFile = Buffer.alloc(2 * 1024 * 1024); // 2MB - would exceed 50MB

      const response = await request(app.getHttpServer())
        .post(`/api/proposals/${testProposalId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', newFile, 'new.pdf')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOTAL_SIZE_EXCEEDED');
      expect(response.body.error.message).toBe('Tổng dung lượng đã vượt giới hạn (50MB/proposal).');
    });
  });

  describe('GET /api/proposals/:id/attachments', () => {
    it('should return list of attachments for proposal', async () => {
      // Create test attachments
      await prisma.attachment.createMany({
        data: [
          {
            proposalId: testProposalId,
            fileName: 'file1.pdf',
            fileUrl: '/uploads/file1.pdf',
            fileSize: 1024 * 1024,
            mimeType: 'application/pdf',
            uploadedBy: testUserId,
          },
          {
            proposalId: testProposalId,
            fileName: 'file2.pdf',
            fileUrl: '/uploads/file2.pdf',
            fileSize: 2 * 1024 * 1024,
            mimeType: 'application/pdf',
            uploadedBy: testUserId,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`/api/proposals/${testProposalId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(2);
      expect(response.body.meta.totalSize).toBe(3 * 1024 * 1024); // 3MB total
    });

    it('should exclude soft-deleted attachments', async () => {
      // Create one active and one deleted attachment
      await prisma.attachment.create({
        data: {
          proposalId: testProposalId,
          fileName: 'active.pdf',
          fileUrl: '/uploads/active.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          uploadedBy: testUserId,
        },
      });

      await prisma.attachment.create({
        data: {
          proposalId: testProposalId,
          fileName: 'deleted.pdf',
          fileUrl: '/uploads/deleted.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          uploadedBy: testUserId,
          deletedAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/proposals/${testProposalId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].fileName).toBe('active.pdf');
    });
  });
});
