import { SectionId } from '@prisma/client';
import {
  getSectionData,
  getSections,
  setSectionData,
  mergeSectionData,
  removeSectionData,
  hasSectionData,
  getPopulatedSections,
  validateFormData,
  filterFormData,
  deepMergeFormData,
  isProposalFormData,
} from './form-data.helper';
import type { InfoGeneralSection, BudgetSection } from '../dto';

describe('FormDataHelper', () => {
  describe('getSectionData', () => {
    it('should return null when formData is null', () => {
      const result = getSectionData(null, SectionId.SEC_INFO_GENERAL);
      expect(result).toBeNull();
    });

    it('should return null when formData is undefined', () => {
      const result = getSectionData(undefined, SectionId.SEC_INFO_GENERAL);
      expect(result).toBeNull();
    });

    it('should return null when section does not exist', () => {
      const formData = { [SectionId.SEC_BUDGET]: {} };
      const result = getSectionData(formData, SectionId.SEC_INFO_GENERAL);
      expect(result).toBeNull();
    });

    it('should return section data when it exists', () => {
      const sectionData: InfoGeneralSection = {
        projectName: 'Test Project',
        researchField: 'AI',
        executionTime: '12 months',
      };
      const formData = { [SectionId.SEC_INFO_GENERAL]: sectionData };
      const result = getSectionData(formData, SectionId.SEC_INFO_GENERAL);
      expect(result).toEqual(sectionData);
    });

    it('should return null when section data is not an object', () => {
      const formData = { [SectionId.SEC_INFO_GENERAL]: 'invalid' };
      const result = getSectionData(formData, SectionId.SEC_INFO_GENERAL);
      expect(result).toBeNull();
    });

    it('should return null when section data is an array', () => {
      const formData = { [SectionId.SEC_INFO_GENERAL]: ['item1', 'item2'] };
      const result = getSectionData(formData, SectionId.SEC_INFO_GENERAL);
      expect(result).toBeNull();
    });
  });

  describe('getSections', () => {
    it('should return empty object when formData is null', () => {
      const result = getSections(null, [SectionId.SEC_INFO_GENERAL, SectionId.SEC_BUDGET]);
      expect(result).toEqual({});
    });

    it('should return only sections that exist in formData', () => {
      const infoSection: InfoGeneralSection = {
        projectName: 'Test',
        researchField: 'AI',
        executionTime: '12 months',
      };
      const formData = {
        [SectionId.SEC_INFO_GENERAL]: infoSection,
        [SectionId.SEC_ATTACHMENTS]: {},
      };
      const result = getSections(formData, [
        SectionId.SEC_INFO_GENERAL,
        SectionId.SEC_BUDGET,
      ]);
      expect(result).toHaveProperty(SectionId.SEC_INFO_GENERAL, infoSection);
      expect(result).not.toHaveProperty(SectionId.SEC_BUDGET);
    });

    it('should return all requested sections when they exist', () => {
      const infoSection: InfoGeneralSection = {
        projectName: 'Test',
        researchField: 'AI',
        executionTime: '12 months',
      };
      const budgetSection: BudgetSection = {
        totalBudget: 100000,
        budgetBreakdown: [{ category: 'Equipment', amount: 50000, description: 'Laptops' }],
      };
      const formData = {
        [SectionId.SEC_INFO_GENERAL]: infoSection,
        [SectionId.SEC_BUDGET]: budgetSection,
      };
      const result = getSections(formData, [
        SectionId.SEC_INFO_GENERAL,
        SectionId.SEC_BUDGET,
      ]);
      expect(result).toHaveProperty(SectionId.SEC_INFO_GENERAL, infoSection);
      expect(result).toHaveProperty(SectionId.SEC_BUDGET, budgetSection);
    });
  });

  describe('setSectionData', () => {
    it('should create new formData when null', () => {
      const sectionData: InfoGeneralSection = {
        projectName: 'Test',
        researchField: 'AI',
        executionTime: '12 months',
      };
      const result = setSectionData(null, SectionId.SEC_INFO_GENERAL, sectionData);
      expect(result).toEqual({ [SectionId.SEC_INFO_GENERAL]: sectionData });
    });

    it('should add section to existing formData', () => {
      const sectionData: InfoGeneralSection = {
        projectName: 'Test',
        researchField: 'AI',
        executionTime: '12 months',
      };
      const existingFormData = { [SectionId.SEC_BUDGET]: {} };
      const result = setSectionData(existingFormData, SectionId.SEC_INFO_GENERAL, sectionData);
      expect(result).toHaveProperty(SectionId.SEC_INFO_GENERAL, sectionData);
      expect(result).toHaveProperty(SectionId.SEC_BUDGET, {});
    });

    it('should replace existing section data', () => {
      const existingSection: InfoGeneralSection = {
        projectName: 'Old Project',
        researchField: 'Old Field',
        executionTime: '6 months',
      };
      const newSection: InfoGeneralSection = {
        projectName: 'New Project',
        researchField: 'AI',
        executionTime: '12 months',
      };
      const existingFormData = { [SectionId.SEC_INFO_GENERAL]: existingSection };
      const result = setSectionData(existingFormData, SectionId.SEC_INFO_GENERAL, newSection);
      expect(result).toHaveProperty(SectionId.SEC_INFO_GENERAL, newSection);
    });

    it('should not mutate original formData', () => {
      const sectionData: InfoGeneralSection = {
        projectName: 'Test',
        researchField: 'AI',
        executionTime: '12 months',
      };
      const originalFormData = { [SectionId.SEC_BUDGET]: {} };
      const result = setSectionData(originalFormData, SectionId.SEC_INFO_GENERAL, sectionData);
      expect(originalFormData).not.toHaveProperty(SectionId.SEC_INFO_GENERAL);
      expect(result).toHaveProperty(SectionId.SEC_INFO_GENERAL);
    });
  });

  describe('mergeSectionData', () => {
    it('should create new section when none exists', () => {
      const partialData: Partial<InfoGeneralSection> = {
        projectName: 'Test',
      };
      const result = mergeSectionData(null, SectionId.SEC_INFO_GENERAL, partialData);
      expect(result).toEqual({ [SectionId.SEC_INFO_GENERAL]: partialData });
    });

    it('should merge partial data with existing section', () => {
      const existingSection: InfoGeneralSection = {
        projectName: 'Test Project',
        researchField: 'AI',
        executionTime: '12 months',
      };
      const partialData: Partial<InfoGeneralSection> = {
        projectName: 'Updated Project',
      };
      const formData = { [SectionId.SEC_INFO_GENERAL]: existingSection };
      const result = mergeSectionData(formData, SectionId.SEC_INFO_GENERAL, partialData);
      const expected = {
        ...existingSection,
        ...partialData,
      };
      expect(result).toHaveProperty(SectionId.SEC_INFO_GENERAL, expected);
    });

    it('should not mutate original formData', () => {
      const existingSection: InfoGeneralSection = {
        projectName: 'Test Project',
        researchField: 'AI',
        executionTime: '12 months',
      };
      const partialData: Partial<InfoGeneralSection> = {
        projectName: 'Updated',
      };
      const originalFormData = { [SectionId.SEC_INFO_GENERAL]: existingSection };
      const result = mergeSectionData(originalFormData, SectionId.SEC_INFO_GENERAL, partialData);
      expect(originalFormData[SectionId.SEC_INFO_GENERAL]).toEqual(existingSection);
      expect(result[SectionId.SEC_INFO_GENERAL]).not.toEqual(existingSection);
    });
  });

  describe('removeSectionData', () => {
    it('should return empty object when formData is null', () => {
      const result = removeSectionData(null, SectionId.SEC_INFO_GENERAL);
      expect(result).toEqual({});
    });

    it('should remove section from formData', () => {
      const formData = {
        [SectionId.SEC_INFO_GENERAL]: { projectName: 'Test' },
        [SectionId.SEC_BUDGET]: { totalBudget: 100000 },
      };
      const result = removeSectionData(formData, SectionId.SEC_INFO_GENERAL);
      expect(result).not.toHaveProperty(SectionId.SEC_INFO_GENERAL);
      expect(result).toHaveProperty(SectionId.SEC_BUDGET);
    });

    it('should not mutate original formData', () => {
      const formData = {
        [SectionId.SEC_INFO_GENERAL]: { projectName: 'Test' },
      };
      const result = removeSectionData(formData, SectionId.SEC_INFO_GENERAL);
      expect(formData).toHaveProperty(SectionId.SEC_INFO_GENERAL);
      expect(result).not.toHaveProperty(SectionId.SEC_INFO_GENERAL);
    });
  });

  describe('hasSectionData', () => {
    it('should return false when formData is null', () => {
      const result = hasSectionData(null, SectionId.SEC_INFO_GENERAL);
      expect(result).toBe(false);
    });

    it('should return false when section does not exist', () => {
      const formData = { [SectionId.SEC_BUDGET]: {} };
      const result = hasSectionData(formData, SectionId.SEC_INFO_GENERAL);
      expect(result).toBe(false);
    });

    it('should return false when section is null', () => {
      const formData = { [SectionId.SEC_INFO_GENERAL]: null };
      const result = hasSectionData(formData, SectionId.SEC_INFO_GENERAL);
      expect(result).toBe(false);
    });

    it('should return false when section is undefined', () => {
      const formData = { [SectionId.SEC_INFO_GENERAL]: undefined };
      const result = hasSectionData(formData, SectionId.SEC_INFO_GENERAL);
      expect(result).toBe(false);
    });

    it('should return false when section is an empty object', () => {
      const formData = { [SectionId.SEC_INFO_GENERAL]: {} };
      const result = hasSectionData(formData, SectionId.SEC_INFO_GENERAL);
      expect(result).toBe(false);
    });

    it('should return false when section is an array', () => {
      const formData = { [SectionId.SEC_INFO_GENERAL]: ['item'] };
      const result = hasSectionData(formData, SectionId.SEC_INFO_GENERAL);
      expect(result).toBe(false);
    });

    it('should return true when section has data', () => {
      const formData = { [SectionId.SEC_INFO_GENERAL]: { projectName: 'Test' } };
      const result = hasSectionData(formData, SectionId.SEC_INFO_GENERAL);
      expect(result).toBe(true);
    });
  });

  describe('getPopulatedSections', () => {
    it('should return empty array when formData is null', () => {
      const result = getPopulatedSections(null);
      expect(result).toEqual([]);
    });

    it('should return empty array when formData is empty', () => {
      const result = getPopulatedSections({});
      expect(result).toEqual([]);
    });

    it('should return section IDs with non-empty data', () => {
      const formData = {
        [SectionId.SEC_INFO_GENERAL]: { projectName: 'Test' },
        [SectionId.SEC_BUDGET]: {},
        [SectionId.SEC_ATTACHMENTS]: { documents: ['doc1'] },
      };
      const result = getPopulatedSections(formData);
      expect(result).toContain(SectionId.SEC_INFO_GENERAL);
      expect(result).not.toContain(SectionId.SEC_BUDGET);
      expect(result).toContain(SectionId.SEC_ATTACHMENTS);
    });

    it('should not include null values', () => {
      const formData = {
        [SectionId.SEC_INFO_GENERAL]: null,
        [SectionId.SEC_BUDGET]: { totalBudget: 100000 },
      };
      const result = getPopulatedSections(formData);
      expect(result).not.toContain(SectionId.SEC_INFO_GENERAL);
      expect(result).toContain(SectionId.SEC_BUDGET);
    });
  });

  describe('validateFormData', () => {
    it('should return valid when all required sections exist', () => {
      const formData = {
        [SectionId.SEC_INFO_GENERAL]: { projectName: 'Test' },
        [SectionId.SEC_BUDGET]: { totalBudget: 100000 },
      };
      const result = validateFormData(formData, [
        SectionId.SEC_INFO_GENERAL,
        SectionId.SEC_BUDGET,
      ]);
      expect(result.isValid).toBe(true);
      expect(result.missingSections).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid when required sections are missing', () => {
      const formData = {
        [SectionId.SEC_INFO_GENERAL]: { projectName: 'Test' },
      };
      const result = validateFormData(formData, [
        SectionId.SEC_INFO_GENERAL,
        SectionId.SEC_BUDGET,
      ]);
      expect(result.isValid).toBe(false);
      expect(result.missingSections).toContain(SectionId.SEC_BUDGET);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return invalid when required sections are empty', () => {
      const formData = {
        [SectionId.SEC_INFO_GENERAL]: { projectName: 'Test' },
        [SectionId.SEC_BUDGET]: {},
      };
      const result = validateFormData(formData, [
        SectionId.SEC_INFO_GENERAL,
        SectionId.SEC_BUDGET,
      ]);
      expect(result.isValid).toBe(false);
      expect(result.missingSections).toContain(SectionId.SEC_BUDGET);
    });
  });

  describe('filterFormData', () => {
    it('should return empty object when formData is null', () => {
      const result = filterFormData(null, [SectionId.SEC_INFO_GENERAL]);
      expect(result).toEqual({});
    });

    it('should return only specified sections', () => {
      const formData = {
        [SectionId.SEC_INFO_GENERAL]: { projectName: 'Test' },
        [SectionId.SEC_BUDGET]: { totalBudget: 100000 },
        [SectionId.SEC_ATTACHMENTS]: {},
      };
      const result = filterFormData(formData, [
        SectionId.SEC_INFO_GENERAL,
        SectionId.SEC_BUDGET,
      ]);
      expect(result).toHaveProperty(SectionId.SEC_INFO_GENERAL);
      expect(result).toHaveProperty(SectionId.SEC_BUDGET);
      expect(result).not.toHaveProperty(SectionId.SEC_ATTACHMENTS);
    });
  });

  describe('deepMergeFormData', () => {
    it('should return target when source is null', () => {
      const target = { a: 1, b: 2 };
      const result = deepMergeFormData(target, null);
      expect(result).toEqual(target);
    });

    it('should return source when target is null', () => {
      const source = { a: 1, b: 2 };
      const result = deepMergeFormData(null, source);
      expect(result).toEqual(source);
    });

    it('should deeply merge objects', () => {
      const target = {
        section1: { a: 1, b: 2, c: { x: 10, y: 20 } },
      };
      const source = {
        section1: { b: 3, c: { y: 30, z: 40 } },
        section2: { d: 4 },
      };
      const result = deepMergeFormData(target, source);
      expect(result).toEqual({
        section1: { a: 1, b: 3, c: { x: 10, y: 30, z: 40 } },
        section2: { d: 4 },
      });
    });

    it('should replace arrays', () => {
      const target = {
        section1: { items: ['a', 'b'] },
      };
      const source = {
        section1: { items: ['c', 'd'] },
      };
      const result = deepMergeFormData(target, source);
      expect(result.section1.items).toEqual(['c', 'd']);
    });

    it('should overwrite primitives', () => {
      const target = {
        section1: { value: 'old' },
      };
      const source = {
        section1: { value: 'new' },
      };
      const result = deepMergeFormData(target, source);
      expect(result.section1.value).toBe('new');
    });

    it('should not mutate original objects', () => {
      const target = { a: { b: 1 } };
      const source = { a: { c: 2 } };
      const originalTarget = JSON.parse(JSON.stringify(target));
      const originalSource = JSON.parse(JSON.stringify(source));
      deepMergeFormData(target, source);
      expect(target).toEqual(originalTarget);
      expect(source).toEqual(originalSource);
    });
  });

  describe('isProposalFormData', () => {
    it('should return false for null', () => {
      expect(isProposalFormData(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isProposalFormData(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isProposalFormData('string')).toBe(false);
      expect(isProposalFormData(123)).toBe(false);
      expect(isProposalFormData(true)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isProposalFormData([1, 2, 3])).toBe(false);
    });

    it('should return true for objects', () => {
      expect(isProposalFormData({})).toBe(true);
      expect(isProposalFormData({ key: 'value' })).toBe(true);
    });
  });
});
