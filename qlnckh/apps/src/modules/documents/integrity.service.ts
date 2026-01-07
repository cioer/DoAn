import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import { PrismaService } from '../auth/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Verification Result
 *
 * Result of document integrity verification
 */
export interface VerificationResult {
  valid: boolean;
  storedHash: string;
  currentHash: string;
  verifiedAt: Date;
  verifiedBy: string;
  documentId: string;
}

/**
 * Integrity Service
 *
 * Handles SHA-256 hash calculation and verification for documents.
 * Tracks document integrity using DocumentManifest records.
 *
 * Epic 7 Story 7.3: DOCX Generation + SHA-256 + Manifest
 *
 * Features:
 * - SHA-256 hash calculation
 * - Document integrity verification
 * - Manifest creation and update
 */
@Injectable()
export class IntegrityService {
  private readonly logger = new Logger(IntegrityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate SHA-256 hash of a buffer
   *
   * @param buffer - Data to hash
   * @returns SHA-256 hash as hex string
   */
  calculateSHA256(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Calculate SHA-256 hash of a file
   *
   * @param filePath - Path to file
   * @returns SHA-256 hash as hex string
   */
  async calculateFileHash(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    return this.calculateSHA256(buffer);
  }

  /**
   * Verify document integrity
   *
   * Recalculates SHA-256 hash and compares with stored hash.
   * Updates DocumentManifest with verification result.
   *
   * @param documentId - Document ID to verify
   * @param userId - User performing verification
   * @returns Verification result
   */
  async verifyDocument(
    documentId: string,
    userId: string,
  ): Promise<VerificationResult> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { proposal: true },
    });

    if (!doc) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Calculate current hash
    const currentHash = await this.calculateFileHash(doc.filePath);

    // Compare with stored hash
    const valid = currentHash === doc.sha256Hash;

    // Update manifest
    await this.prisma.documentManifest.update({
      where: { documentId },
      data: {
        verifiedAt: new Date(),
        verifiedBy: userId,
        verificationResult: valid ? 'VALID' : 'MISMATCH',
      },
    });

    this.logger.log(
      `Document verification ${valid ? 'PASSED' : 'FAILED'}: ${documentId}`,
    );

    return {
      valid,
      storedHash: doc.sha256Hash,
      currentHash,
      verifiedAt: new Date(),
      verifiedBy: userId,
      documentId,
    };
  }

  /**
   * Create document manifest
   *
   * Creates a manifest record for tracking document integrity.
   *
   * @param documentId - Document ID
   * @param templateId - Template ID used
   * @param templateVersion - Template version
   * @param proposalData - Proposal data snapshot
   * @param userId - User who generated the document
   * @returns Created manifest
   */
  async createManifest(
    documentId: string,
    templateId: string,
    templateVersion: number,
    proposalData: unknown,
    userId: string,
  ) {
    return this.prisma.documentManifest.create({
      data: {
        documentId,
        templateId,
        templateVersion,
        proposalData: proposalData as Prisma.InputJsonValue,
        generatedBy: userId,
        generatedAt: new Date(),
      },
    });
  }

  /**
   * Get document manifest
   *
   * @param documentId - Document ID
   * @returns Document manifest
   */
  async getManifest(documentId: string) {
    return this.prisma.documentManifest.findUnique({
      where: { documentId },
    });
  }

  /**
   * Calculate retention date
   *
   * Documents are retained for 7 years as per policy.
   *
   * @param years - Number of years to retain (default: 7)
   * @returns Retention date
   */
  calculateRetentionDate(years = 7): Date {
    const date = new Date();
    date.setFullYear(date.getFullYear() + years);
    return date;
  }
}
