import { SectionId } from '@prisma/client';
import {
  ProposalFormData,
  SectionIdType,
  SectionDataType,
} from '../dto';

/**
 * Form Data Helper Functions
 * Story 2.6: Helper functions for working with proposal form_data JSON
 *
 * These helpers provide type-safe access to form data stored as JSON
 * in the proposals table, following the canonical section ID pattern.
 */

/**
 * Get section data from form_data
 *
 * @param formData - The form_data JSON object from proposal
 * @param sectionId - The canonical section ID (e.g., SectionId.SEC_INFO_GENERAL)
 * @returns The section data, or null if section doesn't exist
 *
 * @example
 * const infoGeneral = getSectionData(proposal.formData, SectionId.SEC_INFO_GENERAL);
 * if (infoGeneral) {
 *   console.log(infoGeneral.projectName);
 * }
 */
export function getSectionData<T extends SectionId>(
  formData: Record<string, unknown> | null | undefined,
  sectionId: T,
): SectionDataType<T> | null {
  if (!formData || typeof formData !== 'object') {
    return null;
  }

  const sectionKey = sectionId as string;
  const sectionData = formData[sectionKey];

  // Return null if section doesn't exist
  if (sectionData === null || sectionData === undefined) {
    return null;
  }

  // Validate that section data is an object
  if (typeof sectionData !== 'object' || Array.isArray(sectionData)) {
    return null;
  }

  return sectionData as SectionDataType<T>;
}

/**
 * Get multiple sections from form_data
 *
 * @param formData - The form_data JSON object from proposal
 * @param sectionIds - Array of canonical section IDs to retrieve
 * @returns Object mapping section IDs to their data
 *
 * @example
 * const sections = getSections(proposal.formData, [
 *   SectionId.SEC_INFO_GENERAL,
 *   SectionId.SEC_BUDGET
 * ]);
 */
export function getSections(
  formData: Record<string, unknown> | null | undefined,
  sectionIds: SectionId[],
): Partial<Record<SectionId, unknown>> {
  const result: Partial<Record<SectionId, unknown>> = {};

  if (!formData || typeof formData !== 'object') {
    return result;
  }

  for (const sectionId of sectionIds) {
    const sectionKey = sectionId as string;
    const sectionData = formData[sectionKey];

    if (sectionData !== null && sectionData !== undefined) {
      result[sectionId] = sectionData;
    }
  }

  return result;
}

/**
 * Set section data in form_data (creates new object, immutable)
 *
 * @param formData - The existing form_data JSON object
 * @param sectionId - The canonical section ID
 * @param sectionData - The section data to set
 * @returns New form_data object with the section updated
 *
 * @example
 * const updatedFormData = setSectionData(
 *   proposal.formData,
 *   SectionId.SEC_INFO_GENERAL,
 *   { projectName: 'New Project', ... }
 * );
 */
export function setSectionData<T extends SectionId>(
  formData: Record<string, unknown> | null | undefined,
  sectionId: T,
  sectionData: SectionDataType<T>,
): Record<string, unknown> {
  const base = formData && typeof formData === 'object' ? { ...formData } : {};
  const sectionKey = sectionId as string;

  return {
    ...base,
    [sectionKey]: sectionData,
  };
}

/**
 * Merge partial section data into form_data (immutable)
 * Useful for partial updates like auto-save
 *
 * @param formData - The existing form_data JSON object
 * @param sectionId - The canonical section ID
 * @param partialData - Partial section data to merge
 * @returns New form_data object with merged section data
 *
 * @example
 * const updatedFormData = mergeSectionData(
 *   proposal.formData,
 *   SectionId.SEC_INFO_GENERAL,
 *   { projectName: 'Updated Name' }  // Only updates projectName
 * );
 */
export function mergeSectionData<T extends SectionId>(
  formData: Record<string, unknown> | null | undefined,
  sectionId: T,
  partialData: Partial<SectionDataType<T>>,
): Record<string, unknown> {
  const base = formData && typeof formData === 'object' ? { ...formData } : {};
  const sectionKey = sectionId as string;

  const existingSection = getSectionData(formData, sectionId);
  const mergedSection = existingSection
    ? { ...existingSection, ...partialData }
    : partialData;

  return {
    ...base,
    [sectionKey]: mergedSection,
  };
}

/**
 * Remove section from form_data (immutable)
 *
 * @param formData - The existing form_data JSON object
 * @param sectionId - The canonical section ID to remove
 * @returns New form_data object without the section
 */
export function removeSectionData(
  formData: Record<string, unknown> | null | undefined,
  sectionId: SectionId,
): Record<string, unknown> {
  if (!formData || typeof formData !== 'object') {
    return {};
  }

  const result = { ...formData };
  const sectionKey = sectionId as string;
  delete result[sectionKey];

  return result;
}

/**
 * Check if section exists in form_data
 *
 * @param formData - The form_data JSON object
 * @param sectionId - The canonical section ID to check
 * @returns True if section exists and has data
 */
export function hasSectionData(
  formData: Record<string, unknown> | null | undefined,
  sectionId: SectionId,
): boolean {
  if (!formData || typeof formData !== 'object') {
    return false;
  }

  const sectionKey = sectionId as string;
  const sectionData = formData[sectionKey];

  return (
    sectionData !== null &&
    sectionData !== undefined &&
    typeof sectionData === 'object' &&
    !Array.isArray(sectionData) &&
    Object.keys(sectionData as object).length > 0
  );
}

/**
 * Get all section IDs that exist in form_data
 *
 * @param formData - The form_data JSON object
 * @returns Array of section IDs (as strings) that have data
 */
export function getPopulatedSections(
  formData: Record<string, unknown> | null | undefined,
): string[] {
  if (!formData || typeof formData !== 'object') {
    return [];
  }

  const populatedSections: string[] = [];

  for (const [key, value] of Object.entries(formData)) {
    if (
      value !== null &&
      value !== undefined &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0
    ) {
      populatedSections.push(key);
    }
  }

  return populatedSections;
}

/**
 * Validate form data against required sections
 *
 * @param formData - The form_data JSON object
 * @param requiredSections - Array of section IDs that must be present
 * @returns Object with validation result and missing sections
 */
export function validateFormData(
  formData: Record<string, unknown> | null | undefined,
  requiredSections: SectionId[],
): {
  isValid: boolean;
  missingSections: SectionId[];
  errors: string[];
} {
  const missingSections: SectionId[] = [];
  const errors: string[] = [];

  for (const sectionId of requiredSections) {
    if (!hasSectionData(formData, sectionId)) {
      missingSections.push(sectionId);
      errors.push(`Section ${sectionId} is required but missing or empty`);
    }
  }

  return {
    isValid: missingSections.length === 0,
    missingSections,
    errors,
  };
}

/**
 * Filter form_data to only include specified sections
 *
 * @param formData - The form_data JSON object
 * @param sectionIds - Array of section IDs to keep
 * @returns New form_data object with only specified sections
 */
export function filterFormData(
  formData: Record<string, unknown> | null | undefined,
  sectionIds: SectionId[],
): Record<string, unknown> {
  if (!formData || typeof formData !== 'object') {
    return {};
  }

  const result: Record<string, unknown> = {};
  const sectionIdSet = new Set(sectionIds);

  for (const [key, value] of Object.entries(formData)) {
    if (sectionIdSet.has(key as SectionId)) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Deep merge two form_data objects
 * Arrays are replaced (not merged), objects are recursively merged
 * Used by auto-save to merge partial updates
 *
 * @param target - The base form_data
 * @param source - The partial form_data to merge in
 * @returns Merged form_data object
 *
 * @example
 * const merged = deepMergeFormData(baseData, partialData);
 */
export function deepMergeFormData(
  target: Record<string, unknown> | null | undefined,
  source: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...(target || {}) };

  if (!source || typeof source !== 'object') {
    return result;
  }

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      // Both are objects - deep merge
      result[key] = deepMergeFormData(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      );
    } else {
      // Primitive, array, or null - overwrite
      result[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Extract form data for a specific template version
 * Handles backward compatibility when template versions change
 *
 * @param formData - The form_data JSON object
 * @param templateVersion - The template version (e.g., "v1.0")
 * @returns Form data compatible with the specified template version
 */
export function extractFormDataForVersion(
  formData: Record<string, unknown> | null | undefined,
  templateVersion: string,
): Record<string, unknown> {
  // For backward compatibility, return all data by default
  // Future versions can filter/migrate data based on template version
  return formData || {};
}

/**
 * Type guard to check if a value is valid ProposalFormData
 *
 * @param value - Value to check
 * @returns True if value is a valid ProposalFormData object
 */
export function isProposalFormData(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}
