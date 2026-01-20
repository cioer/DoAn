/**
 * AI Chat API Client
 *
 * Integrates with backend AI Chat service (Z.AI API)
 */

import { apiClient } from '../auth/auth';

/**
 * Message role types
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Chat message
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * Chat completion request
 */
export interface ChatCompletionRequest {
  messages: ChatMessage[];
  proposalId?: string;
  systemPrompt?: string;
}

/**
 * Chat with proposal request
 */
export interface ChatWithProposalRequest {
  message: string;
  proposalId: string;
  history?: ChatMessage[];
}

/**
 * Chat response
 */
export interface ChatResponse {
  content: string;
  reasoning?: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * AI Fill Form request
 */
export interface AiFillFormRequest {
  formType: string;
  title: string;
  fieldKey?: string;
  existingData?: Record<string, string>;
}

/**
 * AI Fill Form response
 */
export interface AiFillFormResponse {
  fields: Record<string, string>;
  model: string;
}

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * AI Chat API
 */
export const aiChatApi = {
  /**
   * Check AI Chat service health
   */
  checkHealth: async (): Promise<{ available: boolean; service: string }> => {
    const response = await apiClient.get<ApiResponse<{ available: boolean; service: string }>>(
      '/ai-chat/health'
    );
    return response.data.data;
  },

  /**
   * Send chat completion request
   */
  chatCompletion: async (request: ChatCompletionRequest): Promise<ChatResponse> => {
    const response = await apiClient.post<ApiResponse<ChatResponse>>(
      '/ai-chat/completions',
      request
    );
    return response.data.data;
  },

  /**
   * Chat with proposal context
   */
  chatWithProposal: async (request: ChatWithProposalRequest): Promise<ChatResponse> => {
    const response = await apiClient.post<ApiResponse<ChatResponse>>(
      '/ai-chat/with-proposal',
      request
    );
    return response.data.data;
  },

  /**
   * AI Fill Form - Generate content for form fields
   */
  fillForm: async (request: AiFillFormRequest): Promise<AiFillFormResponse> => {
    const response = await apiClient.post<ApiResponse<AiFillFormResponse>>(
      '/ai-chat/fill-form',
      request
    );
    return response.data.data;
  },

  /**
   * Stream chat completion (returns EventSource-like response)
   * Note: For SSE streaming, we need to handle this differently
   */
  streamChat: async function* (
    request: ChatCompletionRequest,
    onChunk: (content: string) => void
  ): AsyncGenerator<string> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch('/api/ai-chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Stream request failed');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              onChunk(parsed.content);
              yield parsed.content;
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  },
};

export type { ChatMessage, ChatResponse };
