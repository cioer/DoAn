/**
 * useFormEngine Hook
 *
 * Custom hook for FormEngine document generation.
 * Provides state management and API integration.
 */

import { useState, useCallback, useEffect } from 'react';
import { formEngineApi, downloadFile } from '../lib/api/form-engine';
import type {
  GenerateFormRequest,
  FormGenerationResult,
  FormEngineTemplate,
  FormEngineHealth,
  FormGenerationStatus,
} from '../shared/types/form-engine';

interface UseFormEngineState {
  // Templates
  templates: FormEngineTemplate[];
  templatesLoading: boolean;
  templatesError: string | null;

  // Health
  health: FormEngineHealth | null;
  healthLoading: boolean;

  // Generation
  generationStatus: FormGenerationStatus;
  generationResult: FormGenerationResult | null;
  generationError: string | null;

  // History
  generatedDocuments: FormGenerationResult[];
}

interface UseFormEngineActions {
  // Templates
  loadTemplates: () => Promise<void>;

  // Health
  checkHealth: () => Promise<void>;

  // Generation
  generateForm: (
    proposalId: string,
    request: GenerateFormRequest
  ) => Promise<FormGenerationResult | null>;
  resetGeneration: () => void;

  // Download
  downloadDocx: (documentId: string, fileName: string) => Promise<void>;
  downloadPdf: (documentId: string, fileName: string) => Promise<void>;
}

type UseFormEngineReturn = UseFormEngineState & UseFormEngineActions;

/**
 * Hook for FormEngine integration
 */
export function useFormEngine(): UseFormEngineReturn {
  // Templates state
  const [templates, setTemplates] = useState<FormEngineTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // Health state
  const [health, setHealth] = useState<FormEngineHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Generation state
  const [generationStatus, setGenerationStatus] =
    useState<FormGenerationStatus>('idle');
  const [generationResult, setGenerationResult] =
    useState<FormGenerationResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // History
  const [generatedDocuments, setGeneratedDocuments] = useState<
    FormGenerationResult[]
  >([]);

  /**
   * Load available templates
   */
  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const data = await formEngineApi.getTemplates();
      setTemplates(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Không thể tải danh sách mẫu';
      setTemplatesError(message);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  /**
   * Check FormEngine health
   */
  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const data = await formEngineApi.getHealth();
      setHealth(data);
    } catch {
      setHealth({ available: false });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  /**
   * Generate form document
   */
  const generateForm = useCallback(
    async (
      proposalId: string,
      request: GenerateFormRequest
    ): Promise<FormGenerationResult | null> => {
      setGenerationStatus('generating');
      setGenerationError(null);
      setGenerationResult(null);

      try {
        const result = await formEngineApi.generateForm(proposalId, request);
        setGenerationResult(result);
        setGenerationStatus('success');

        // Add to history
        setGeneratedDocuments((prev) => [result, ...prev]);

        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Không thể tạo tài liệu';
        setGenerationError(message);
        setGenerationStatus('error');
        return null;
      }
    },
    []
  );

  /**
   * Reset generation state
   */
  const resetGeneration = useCallback(() => {
    setGenerationStatus('idle');
    setGenerationResult(null);
    setGenerationError(null);
  }, []);

  /**
   * Download DOCX file
   */
  const downloadDocx = useCallback(
    async (documentId: string, fileName: string) => {
      try {
        const blob = await formEngineApi.downloadDocx(documentId);
        downloadFile(blob, fileName.endsWith('.docx') ? fileName : `${fileName}.docx`);
      } catch (error) {
        console.error('Download DOCX failed:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Download PDF file
   */
  const downloadPdf = useCallback(
    async (documentId: string, fileName: string) => {
      try {
        const blob = await formEngineApi.downloadPdf(documentId);
        downloadFile(blob, fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
      } catch (error) {
        console.error('Download PDF failed:', error);
        throw error;
      }
    },
    []
  );

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    // State
    templates,
    templatesLoading,
    templatesError,
    health,
    healthLoading,
    generationStatus,
    generationResult,
    generationError,
    generatedDocuments,

    // Actions
    loadTemplates,
    checkHealth,
    generateForm,
    resetGeneration,
    downloadDocx,
    downloadPdf,
  };
}

export default useFormEngine;
