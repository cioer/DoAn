import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../auth/prisma.service';
import {
  ChatMessageDto,
  ChatCompletionDto,
  ChatWithProposalDto,
  ChatResponseDto,
  ZaiChatResponse,
  MessageRole,
} from './dto';

/**
 * AI Chat Service
 *
 * Integrates with Z.AI API for chat completions.
 * Supports:
 * - Basic chat completion
 * - Chat with proposal context
 * - Streaming responses (SSE)
 */
@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly model: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('ZAI_API_KEY') || '';
    this.apiUrl = this.configService.get<string>('ZAI_API_URL') || 'https://api.z.ai/api/coding/paas/v4';
    this.model = this.configService.get<string>('ZAI_MODEL') || 'glm-4.5-air';

    if (!this.apiKey) {
      this.logger.warn('ZAI_API_KEY not configured - AI Chat will not work');
    }
  }

  /**
   * Check if AI Chat is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Basic chat completion
   */
  async chatCompletion(dto: ChatCompletionDto): Promise<ChatResponseDto> {
    if (!this.isAvailable()) {
      throw new HttpException('AI Chat service not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const messages = dto.systemPrompt
      ? [{ role: MessageRole.SYSTEM, content: dto.systemPrompt }, ...dto.messages]
      : dto.messages;

    try {
      const response = await this.callZaiApi(messages);
      return this.formatResponse(response);
    } catch (error) {
      this.logger.error('Chat completion failed:', error);
      throw new HttpException(
        error.message || 'AI Chat request failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Chat with proposal context
   * Injects proposal information into the system prompt
   */
  async chatWithProposal(dto: ChatWithProposalDto): Promise<ChatResponseDto> {
    if (!this.isAvailable()) {
      throw new HttpException('AI Chat service not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // Fetch proposal data
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: dto.proposalId },
      include: {
        owner: { select: { displayName: true, email: true } },
        faculty: { select: { name: true, code: true } },
      },
    });

    if (!proposal) {
      throw new HttpException('Proposal not found', HttpStatus.NOT_FOUND);
    }

    // Build system prompt with proposal context
    const systemPrompt = this.buildProposalSystemPrompt(proposal);

    // Build messages array
    const messages: ChatMessageDto[] = [
      { role: MessageRole.SYSTEM, content: systemPrompt },
      ...(dto.history || []),
      { role: MessageRole.USER, content: dto.message },
    ];

    try {
      const response = await this.callZaiApi(messages);
      return this.formatResponse(response);
    } catch (error) {
      this.logger.error('Chat with proposal failed:', error);
      throw new HttpException(
        error.message || 'AI Chat request failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Stream chat completion (returns async generator for SSE)
   */
  async *streamChatCompletion(dto: ChatCompletionDto): AsyncGenerator<string> {
    if (!this.isAvailable()) {
      throw new HttpException('AI Chat service not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const messages = dto.systemPrompt
      ? [{ role: MessageRole.SYSTEM, content: dto.systemPrompt }, ...dto.messages]
      : dto.messages;

    try {
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          stream: true,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
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
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Stream chat completion failed:', error);
      throw error;
    }
  }

  /**
   * Call Z.AI API
   */
  private async callZaiApi(messages: ChatMessageDto[]): Promise<ZaiChatResponse> {
    const response = await fetch(`${this.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      this.logger.error('Z.AI API error:', error);
      throw new Error(error.error?.message || 'Z.AI API request failed');
    }

    return response.json();
  }

  /**
   * Format Z.AI response to ChatResponseDto
   */
  private formatResponse(response: ZaiChatResponse): ChatResponseDto {
    const choice = response.choices[0];
    return {
      content: choice.message.content,
      reasoning: choice.message.reasoning_content,
      model: response.model,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
    };
  }

  /**
   * Build system prompt with proposal context
   */
  private buildProposalSystemPrompt(proposal: any): string {
    const formData = proposal.formData || {};

    return `Bạn là trợ lý AI cho hệ thống Quản lý Nghiên cứu Khoa học (QLNCKH).
Bạn đang hỗ trợ người dùng về đề tài nghiên cứu sau:

**Thông tin đề tài:**
- Mã đề tài: ${proposal.code}
- Tên đề tài: ${proposal.title}
- Chủ nhiệm: ${proposal.owner?.displayName || 'N/A'}
- Khoa: ${proposal.faculty?.name || 'N/A'}
- Trạng thái: ${proposal.state}
- Ngày tạo: ${proposal.createdAt?.toLocaleDateString('vi-VN') || 'N/A'}

**Nội dung đề tài:**
${formData.mucTieu ? `- Mục tiêu: ${formData.mucTieu}` : ''}
${formData.noiDung ? `- Nội dung: ${formData.noiDung}` : ''}
${formData.phuongPhap ? `- Phương pháp: ${formData.phuongPhap}` : ''}
${formData.sanPham ? `- Sản phẩm dự kiến: ${formData.sanPham}` : ''}

**Hướng dẫn:**
- Trả lời bằng tiếng Việt, ngắn gọn và dễ hiểu
- Nếu được hỏi về đề tài, sử dụng thông tin ở trên để trả lời
- Nếu câu hỏi ngoài phạm vi đề tài, vẫn cố gắng hỗ trợ một cách hữu ích
- Không bịa đặt thông tin không có trong dữ liệu`;
  }
}
