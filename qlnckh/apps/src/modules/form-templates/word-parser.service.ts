import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as mammoth from 'mammoth';
import * as JSZip from 'jszip';
import { PrismaService } from '../auth/prisma.service';

/**
 * Parsed form template from Word document
 */
export interface ParsedFormTemplate {
  code: string;
  name: string;
  description?: string;
  version?: string;
  projectType: 'CAP_TRUONG' | 'CAP_KHOA';
  sections: ParsedFormSection[];
}

/**
 * Parsed form section from Word document
 */
export interface ParsedFormSection {
  sectionId: string;
  label: string;
  component: string;
  displayOrder: number;
  isRequired: boolean;
  config?: Record<string, unknown>;
}

/**
 * Form Template Import Result
 */
export interface FormTemplateImportResult {
  success: boolean;
  templates: Array<{
    code: string;
    name: string;
    sectionsCount: number;
  }>;
  errors: Array<{
    templateCode: string;
    message: string;
  }>;
  total: number;
  imported: number;
  failed: number;
}

/**
 * Word Document Parser Service
 *
 * Parses Word (.docx) documents containing form templates
 * and extracts structured data for form template creation.
 *
 * The service expects Word documents with specific structure:
 * - Each form template starts with "Mãus XXa/b/c:" pattern
 * - Section headings are marked with Roman numerals (I, II, III, etc.)
 * - Fields are indicated by square brackets [field_name] or table columns
 */
@Injectable()
export class WordParserService {
  private readonly logger = new Logger(WordParserService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parse Word document and extract form templates
   */
  async parseFormTemplates(buffer: Buffer): Promise<ParsedFormTemplate[]> {
    try {
      // Convert to HTML first, then extract text content
      const result = await mammoth.convertToHtml({ buffer });
      const html = result.value;

      // Strip HTML tags to get plain text
      const text = html
        .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
        .replace(/&nbsp;/g, ' ')    // Replace &nbsp;
        .replace(/&amp;/g, '&')     // Replace &amp;
        .replace(/&lt;/g, '<')      // Replace &lt;
        .replace(/&gt;/g, '>')      // Replace &gt;
        .replace(/\s+/g, ' ')       // Normalize whitespace
        .trim();

      // Parse form templates from text
      const templates = this.extractTemplatesFromText(text);

      this.logger.log(`Parsed ${templates.length} form templates from Word document`);

      return templates;
    } catch (error) {
      this.logger.error('Error parsing Word document:', error);
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_DOCX',
          message: 'File Word không hợp lệ. Vui lòng kiểm tra định dạng.',
        },
      });
    }
  }

  /**
   * Extract form templates from document text
   */
  private extractTemplatesFromText(text: string): ParsedFormTemplate[] {
    const templates: ParsedFormTemplate[] = [];
    const lines = text.split('\n').map((line) => line.trim()).filter((line) => line);

    let currentTemplate: ParsedFormTemplate | null = null;
    let currentSection: ParsedFormSection | null = null;
    let sectionOrder = 0;

    // Regex patterns
    const templatePattern = /^(Mẫu\s+)([0-9]+[a-c])(:\s*)(.+)$/i;
    const sectionPattern = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|[0-9]+)\.\s*(.+)$/;
    const fieldPattern = /\[([^\]]+)\]/;

    for (const line of lines) {
      // Check for template header
      const templateMatch = line.match(templatePattern);
      if (templateMatch) {
        // Save previous template
        if (currentTemplate && currentTemplate.sections.length > 0) {
          templates.push(currentTemplate);
        }

        // Start new template
        const code = `MAU_${templateMatch[2].toUpperCase()}`;
        const name = templateMatch[4].trim();
        const suffix = templateMatch[2].toLowerCase();

        currentTemplate = {
          code,
          name,
          description: `Biểu mẫu ${name}`,
          version: 'v1.0',
          projectType: suffix.includes('c') ? 'CAP_TRUONG' : 'CAP_KHOA',
          sections: [],
        };
        sectionOrder = 0;
        continue;
      }

      // Check for section header
      const sectionMatch = line.match(sectionPattern);
      if (sectionMatch && currentTemplate) {
        const sectionLabel = sectionMatch[2].trim();

        // Skip very short section headers
        if (sectionLabel.length < 3) continue;

        currentSection = {
          sectionId: this.slugify(sectionLabel),
          label: sectionLabel,
          component: this.inferComponent(sectionLabel),
          displayOrder: sectionOrder++,
          isRequired: this.inferRequired(sectionLabel),
          config: this.inferConfig(sectionLabel),
        };

        if (currentSection) {
          currentTemplate.sections.push(currentSection);
        }
        continue;
      }

      // Check for fields within current section
      if (currentSection) {
        const fieldMatch = line.match(fieldPattern);
        if (fieldMatch) {
          const fieldName = fieldMatch[1].trim();

          // Add field to section config
          if (!currentSection.config) {
            currentSection.config = {};
          }

          const fields = currentSection.config.fields as Array<{
            name: string;
            label: string;
            type: string;
            required: boolean;
          }>;

          if (Array.isArray(fields)) {
            fields.push({
              name: this.slugify(fieldName),
              label: fieldName,
              type: this.inferFieldType(fieldName),
              required: currentSection.isRequired,
            });
          } else {
            currentSection.config.fields = [
              {
                name: this.slugify(fieldName),
                label: fieldName,
                type: this.inferFieldType(fieldName),
                required: currentSection.isRequired,
              },
            ];
          }
        }
      }
    }

    // Save last template
    if (currentTemplate && currentTemplate.sections.length > 0) {
      templates.push(currentTemplate);
    }

    return templates;
  }

  /**
   * Infer React component name from section label
   */
  private inferComponent(label: string): string {
    const lowerLabel = label.toLowerCase();

    if (lowerLabel.includes('thông tin chung')) {
      return 'BasicInfoSection';
    }
    if (lowerLabel.includes('mục tiêu')) {
      return 'ObjectivesSection';
    }
    if (lowerLabel.includes('phương pháp')) {
      return 'MethodologySection';
    }
    if (lowerLabel.includes('kết quả') || lowerLabel.includes('sản phẩm')) {
      return 'ResultsSection';
    }
    if (lowerLabel.includes('kinh phí')) {
      return 'BudgetSection';
    }
    if (lowerLabel.includes('thời gian')) {
      return 'TimelineSection';
    }
    if (lowerLabel.includes('thành viên')) {
      return 'MembersSection';
    }
    if (lowerLabel.includes('đính kèm')) {
      return 'AttachmentsSection';
    }

    return 'TextFieldSection';
  }

  /**
   * Infer if section is required
   */
  private inferRequired(label: string): boolean {
    const requiredKeywords = [
      'thông tin chung',
      'mục tiêu',
      'phương pháp',
      'thành viên',
      'kết quả',
    ];

    return requiredKeywords.some((keyword) =>
      label.toLowerCase().includes(keyword)
    );
  }

  /**
   * Infer field type from field name
   */
  private inferFieldType(fieldName: string): string {
    const lowerField = fieldName.toLowerCase();

    if (lowerField.includes('email')) return 'email';
    if (lowerField.includes('số điện thoại') || lowerField.includes('điện thoại')) return 'tel';
    if (lowerField.includes('ngày') || lowerField.includes('tháng') || lowerField.includes('năm')) {
      return 'date';
    }
    if (lowerField.includes('vnd') || lowerField.includes('đ') || lowerField.includes('tiền')) {
      return 'number';
    }

    return 'text';
  }

  /**
   * Infer section configuration from label
   */
  private inferConfig(label: string): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    if (label.toLowerCase().includes('bảng')) {
      config.showTable = true;
    }

    return config;
  }

  /**
   * Slugify Vietnamese text
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscore
      .replace(/_+/g, '_') // Remove duplicate underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  }

  /**
   * Parse Word document using JSZip for more advanced parsing
   * Extracts tables and structured content
   */
  async parseFormTemplatesAdvanced(buffer: Buffer): Promise<ParsedFormTemplate[]> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const documentXml = await zip.file('word/document.xml')?.async('string');

      if (!documentXml) {
        throw new Error('Invalid Word document');
      }

      // Parse tables from document
      const tables = this.extractTablesFromXML(documentXml);

      // Combine text-based and table-based parsing
      const textResult = await mammoth.extractRawText({ buffer });
      const templates = this.extractTemplatesFromText(textResult.value);

      // Enhance templates with table data
      return this.enrichTemplatesWithTableData(templates, tables);
    } catch (error) {
      this.logger.error('Error in advanced parsing:', error);
      // Fallback to simple text parsing
      return this.parseFormTemplates(buffer);
    }
  }

  /**
   * Extract tables from Word XML
   */
  private extractTablesFromXML(xml: string): Array<{
    rows: Array<string[]>;
  }> {
    const tables: Array<{ rows: string[][] }> = [];

    // Simple table extraction
    const tableRegex = /<w:tr>(.*?)<\/w:tr>/g;
    const rowMatches = xml.match(tableRegex);

    if (rowMatches) {
      const currentTable: string[][] = [];
      let inTable = false;

      for (const rowMatch of rowMatches) {
        if (!inTable) {
          inTable = true;
        }

        // Extract cells from row
        const cellRegex = /<w:t>(.*?)<\/w:t>/g;
        const cells: string[] = [];
        let cellMatch;

        while ((cellMatch = cellRegex.exec(rowMatch)) !== null) {
          if (cellMatch[1]) {
            cells.push(cellMatch[1].trim());
          }
        }

        if (cells.length > 0) {
          currentTable.push(cells);
        }
      }

      if (currentTable.length > 0) {
        tables.push({ rows: currentTable });
      }
    }

    return tables;
  }

  /**
   * Enrich templates with table data
   */
  private enrichTemplatesWithTableData(
    templates: ParsedFormTemplate[],
    tables: Array<{ rows: string[][] }>,
  ): ParsedFormTemplate[] {
    // For now, return templates as-is
    // Future enhancement: map table data to section fields
    return templates;
  }

  /**
   * Validate parsed form template
   */
  validateTemplate(template: ParsedFormTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.code || template.code.length === 0) {
      errors.push('Mã biểu mẫu không được để trống');
    }

    if (!template.name || template.name.length === 0) {
      errors.push('Tên biểu mẫu không được để trống');
    }

    if (!template.projectType) {
      errors.push('Loại đề tài không được để trống');
    }

    if (template.sections.length === 0) {
      errors.push('Biểu mẫu phải có ít nhất một phần');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
