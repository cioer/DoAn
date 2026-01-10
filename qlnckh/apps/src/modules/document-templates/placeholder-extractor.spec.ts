import { BadRequestException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import PizZip from 'pizzip';
import { PlaceholderExtractor } from './utils/placeholder-extractor';

/**
 * PlaceholderExtractor Tests
 * Epic 7 Story 7.2: Template Upload & Registry
 *
 * Tests verify:
 * - Placeholder extraction from DOCX files
 * - Wildcard bug fix (Epic 6 retro)
 * - Placeholder validation
 */
describe('PlaceholderExtractor', () => {
  describe('extractPlaceholders', () => {
    it('should extract placeholders from document.xml', () => {
      const zip = new PizZip();
      zip.file('word/document.xml', '<w:document><w:body>{{proposal.title}} {{proposal.owner}}</w:body></w:document>');
      const docxBuffer = Buffer.from(zip.generate({ type: 'nodebuffer' }));

      const result = PlaceholderExtractor.extractPlaceholders(docxBuffer);

      expect(result).toEqual(['proposal.title', 'proposal.owner']);
    });

    it('should extract placeholders from headers (Epic 6 retro fix - no wildcards)', () => {
      const zip = new PizZip();
      // Main document
      zip.file('word/document.xml', '<w:document>{{proposal.code}}</w:document>');
      // Header file (note: word/header1.xml, not word/header*.xml)
      zip.file('word/header1.xml', '<w:hdr>{{currentDate}}</w:hdr>');
      // Footer file
      zip.file('word/footer1.xml', '<w:ftr>{{pageNumber}}</w:ftr>');

      const docxBuffer = Buffer.from(zip.generate({ type: 'nodebuffer' }));

      const result = PlaceholderExtractor.extractPlaceholders(docxBuffer);

      expect(result).toContain('proposal.code');
      expect(result).toContain('currentDate');
      expect(result).toContain('pageNumber');
    });

    it('should extract placeholders from multiple header files (no wildcard bug)', () => {
      const zip = new PizZip();
      zip.file('word/document.xml', '<w:doc>{{proposal.title}}</w:doc>');
      zip.file('word/header1.xml', '{{currentDate}}');
      zip.file('word/header2.xml', '{{currentYear}}');
      zip.file('word/header3.xml', '{{currentTime}}');

      const docxBuffer = Buffer.from(zip.generate({ type: 'nodebuffer' }));

      const result = PlaceholderExtractor.extractPlaceholders(docxBuffer);

      expect(result).toContain('proposal.title');
      expect(result).toContain('currentDate');
      expect(result).toContain('currentYear');
      expect(result).toContain('currentTime');
    });

    it('should extract placeholders from multiple footer files', () => {
      const zip = new PizZip();
      zip.file('word/document.xml', '<w:doc>{{proposal.title}}</w:doc>');
      zip.file('word/footer1.xml', '{{pageNumber}}');
      zip.file('word/footer2.xml', '{{totalPages}}');

      const docxBuffer = Buffer.from(zip.generate({ type: 'nodebuffer' }));

      const result = PlaceholderExtractor.extractPlaceholders(docxBuffer);

      expect(result).toContain('proposal.title');
      expect(result).toContain('pageNumber');
      expect(result).toContain('totalPages');
    });

    it('should return unique placeholders only', () => {
      const zip = new PizZip();
      zip.file('word/document.xml', '<w:doc>{{proposal.title}} {{proposal.title}} {{proposal.owner}}</w:doc>');

      const docxBuffer = Buffer.from(zip.generate({ type: 'nodebuffer' }));

      const result = PlaceholderExtractor.extractPlaceholders(docxBuffer);

      expect(result).toEqual(['proposal.title', 'proposal.owner']);
    });

    it('should throw error for invalid DOCX (no document.xml)', () => {
      const zip = new PizZip();
      zip.file('word/wrong.xml', '<w:doc>{{proposal.title}}</w:doc>');

      const docxBuffer = Buffer.from(zip.generate({ type: 'nodebuffer' }));

      expect(() => PlaceholderExtractor.extractPlaceholders(docxBuffer)).toThrow(BadRequestException);
    });

    it('should return empty array when no placeholders found', () => {
      const zip = new PizZip();
      zip.file('word/document.xml', '<w:document><w:body>No placeholders here</w:body></w:document>');

      const docxBuffer = Buffer.from(zip.generate({ type: 'nodebuffer' }));

      const result = PlaceholderExtractor.extractPlaceholders(docxBuffer);

      expect(result).toEqual([]);
    });

    it('should handle Vietnamese placeholder names', () => {
      const zip = new PizZip();
      zip.file('word/document.xml', '<w:doc>{{tenDeTai}} {{chuNghienCuu}}</w:doc>');

      const docxBuffer = Buffer.from(zip.generate({ type: 'nodebuffer' }));

      const result = PlaceholderExtractor.extractPlaceholders(docxBuffer);

      expect(result).toEqual(['tenDeTai', 'chuNghienCuu']);
    });

    it('should handle nested placeholders (dot notation)', () => {
      const zip = new PizZip();
      zip.file('word/document.xml', '<w:doc>{{evaluation.scientificContent.score}} {{council.name}}</w:doc>');

      const docxBuffer = Buffer.from(zip.generate({ type: 'nodebuffer' }));

      const result = PlaceholderExtractor.extractPlaceholders(docxBuffer);

      expect(result).toEqual(['evaluation.scientificContent.score', 'council.name']);
    });
  });

  describe('validatePlaceholders', () => {
    it('should validate all placeholders against known fields', () => {
      const placeholders = ['proposal.title', 'proposal.owner', 'evaluation.council'];

      const result = PlaceholderExtractor.validatePlaceholders(placeholders);

      expect(result.valid).toBe(true);
      expect(result.known).toEqual(placeholders);
      expect(result.unknown).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should identify unknown placeholders', () => {
      const placeholders = ['proposal.title', 'unknown.field', 'another.unknown'];

      const result = PlaceholderExtractor.validatePlaceholders(placeholders);

      expect(result.valid).toBe(false);
      expect(result.known).toEqual(['proposal.title']);
      expect(result.unknown).toEqual(['unknown.field', 'another.unknown']);
      expect(result.warnings).toHaveLength(2);
    });

    it('should return warnings for unknown placeholders', () => {
      const placeholders = ['unknown.field'];

      const result = PlaceholderExtractor.validatePlaceholders(placeholders);

      expect(result.warnings).toContain('Placeholder không xác định: {{unknown.field}}');
    });
  });

  describe('getPlaceholderLabel', () => {
    it('should return Vietnamese label for known placeholder', () => {
      const result = PlaceholderExtractor.getPlaceholderLabel('proposal.title');

      expect(result).toBe('Tên đề tài');
    });

    it('should return null for unknown placeholder', () => {
      const result = PlaceholderExtractor.getPlaceholderLabel('unknown.field');

      expect(result).toBeNull();
    });
  });

  describe('isKnownPlaceholder', () => {
    it('should return true for known placeholders', () => {
      expect(PlaceholderExtractor.isKnownPlaceholder('proposal.title')).toBe(true);
      expect(PlaceholderExtractor.isKnownPlaceholder('evaluation.council')).toBe(true);
    });

    it('should return false for unknown placeholders', () => {
      expect(PlaceholderExtractor.isKnownPlaceholder('unknown.field')).toBe(false);
    });
  });

  describe('getAllKnownPlaceholders', () => {
    it('should return all known placeholders map', () => {
      const result = PlaceholderExtractor.getAllKnownPlaceholders();

      expect(result).toBeInstanceOf(Object);
      expect(result['proposal.title']).toBe('Tên đề tài');
      expect(result['proposal.owner']).toBe('Chủ nhiệm đề tài');
      expect(result['evaluation.council']).toBe('Hội đồng đánh giá');
    });

    it('should include all categories', () => {
      const result = PlaceholderExtractor.getAllKnownPlaceholders();

      // Check categories exist
      expect(Object.keys(result).some(k => k.startsWith('proposal.'))).toBe(true);
      expect(Object.keys(result).some(k => k.startsWith('council.'))).toBe(true);
      expect(Object.keys(result).some(k => k.startsWith('evaluation.'))).toBe(true);
      expect(Object.keys(result).some(k => k.startsWith('acceptance.'))).toBe(true);
      expect(Object.keys(result).some(k => k.startsWith('budget.'))).toBe(true);
    });
  });

  describe('Epic 6 Retro: Wildcard Fix Verification', () => {
    it('should NOT use wildcards for header/footer extraction (critical fix)', () => {
      // This test verifies the bug fix mentioned in Epic 6 retro
      // The bug was: zip.file('word/header*.xml') which doesn't work

      const zip = new PizZip();
      zip.file('word/document.xml', '<w:doc>{{proposal.title}}</w:doc>');
      zip.file('word/header1.xml', '{{currentDate}}');
      zip.file('word/header2.xml', '{{currentYear}}');
      zip.file('word/header3.xml', '{{currentPage}}');
      zip.file('word/footer1.xml', '{{pageNumber}}');

      const docxBuffer = Buffer.from(zip.generate({ type: 'nodebuffer' }));

      const result = PlaceholderExtractor.extractPlaceholders(docxBuffer);

      // All placeholders should be found (no wildcard bug)
      expect(result).toContain('proposal.title');
      expect(result).toContain('currentDate');
      expect(result).toContain('currentYear');
      expect(result).toContain('currentPage');
      expect(result).toContain('pageNumber');
    });

    it('should handle headers with sequential naming (header1, header2, etc.)', () => {
      const zip = new PizZip();
      zip.file('word/document.xml', '<w:doc>{{proposal.title}}</w:doc>');
      zip.file('word/header1.xml', '{{header1Content}}');
      zip.file('word/header2.xml', '{{header2Content}}');
      zip.file('word/header3.xml', '{{header3Content}}');

      const docxBuffer = Buffer.from(zip.generate({ type: 'nodebuffer' }));

      const result = PlaceholderExtractor.extractPlaceholders(docxBuffer);

      expect(result).toContain('header1Content');
      expect(result).toContain('header2Content');
      expect(result).toContain('header3Content');
    });
  });
});
