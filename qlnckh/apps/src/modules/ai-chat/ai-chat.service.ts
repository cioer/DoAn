import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../auth/prisma.service';
import OpenAI from 'openai';
import {
  ChatMessageDto,
  ChatCompletionDto,
  ChatWithProposalDto,
  ChatResponseDto,
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
  private readonly openai: OpenAI | null;
  private readonly model: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('ZAI_API_KEY') || '';
    const baseURL = this.configService.get<string>('ZAI_API_URL') || 'https://api.z.ai/api/coding/paas/v4';
    this.model = this.configService.get<string>('ZAI_MODEL') || 'glm-4.5-air';

    if (!apiKey) {
      this.logger.warn('ZAI_API_KEY not configured - AI Chat will not work');
      this.openai = null;
    } else {
      this.openai = new OpenAI({
        apiKey,
        baseURL,
      });
    }
  }

  /**
   * Check if AI Chat is available
   */
  isAvailable(): boolean {
    return !!this.openai;
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
    if (!this.openai) {
      throw new HttpException('AI Chat service not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const messages = dto.systemPrompt
      ? [{ role: MessageRole.SYSTEM, content: dto.systemPrompt }, ...dto.messages]
      : dto.messages;

    try {
      const stream = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages.map(m => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content
        })),
        stream: true,
        max_tokens: 2048,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      this.logger.error('Stream chat completion failed:', error);
      throw error;
    }
  }

  /**
   * Call Z.AI API using OpenAI SDK
   */
  private async callZaiApi(
    messages: ChatMessageDto[],
    options?: { maxTokens?: number; temperature?: number },
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const maxTokens = options?.maxTokens ?? 2048;
    const temperature = options?.temperature ?? 0.7;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content
      })),
      max_tokens: maxTokens,
      temperature,
    });

    return response;
  }

  /**
   * Format OpenAI SDK response to ChatResponseDto
   */
  private formatResponse(response: OpenAI.Chat.Completions.ChatCompletion): ChatResponseDto {
    const choice = response.choices[0];
    return {
      content: choice.message.content || '',
      reasoning: (choice.message as any).reasoning_content, // Z.AI specific field
      model: response.model,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  }

  /**
   * Build system prompt with proposal context
   */
  private buildProposalSystemPrompt(proposal: any): string {
    const formData = proposal.formData || {};
    const stateLabels: Record<string, string> = {
      DRAFT: 'Nháp',
      FACULTY_COUNCIL_OUTLINE_REVIEW: 'Hội đồng Khoa - Đề cương',
      SCHOOL_COUNCIL_OUTLINE_REVIEW: 'Hội đồng Trường - Đề cương',
      CHANGES_REQUESTED: 'Yêu cầu chỉnh sửa',
      APPROVED: 'Đã duyệt',
      IN_PROGRESS: 'Đang thực hiện',
      FACULTY_COUNCIL_ACCEPTANCE_REVIEW: 'Hội đồng Khoa - Nghiệm thu',
      SCHOOL_COUNCIL_ACCEPTANCE_REVIEW: 'Hội đồng Trường - Nghiệm thu',
      HANDOVER: 'Bàn giao',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
      REJECTED: 'Từ chối',
      PAUSED: 'Tạm dừng',
    };

    // Format dates
    const formatDate = (date: any) => {
      if (!date) return null;
      try {
        return new Date(date).toLocaleDateString('vi-VN');
      } catch {
        return date;
      }
    };

    // Build content sections only if data exists
    const contentSections: string[] = [];

    if (formData.tinh_cap_thiet) {
      contentSections.push(`**Tính cấp thiết:**\n${formData.tinh_cap_thiet}`);
    }
    if (formData.muc_tieu_de_tai) {
      contentSections.push(`**Mục tiêu:**\n${formData.muc_tieu_de_tai}`);
    }
    if (formData.noi_dung_chinh) {
      contentSections.push(`**Nội dung chính:**\n${formData.noi_dung_chinh}`);
    }
    if (formData.ket_qua_du_kien) {
      contentSections.push(`**Kết quả dự kiến:**\n${formData.ket_qua_du_kien}`);
    }
    if (formData.kha_nang_va_dia_chi_ung_dung) {
      contentSections.push(`**Khả năng ứng dụng:**\n${formData.kha_nang_va_dia_chi_ung_dung}`);
    }
    if (formData.du_kien_hieu_qua_tuong_lai) {
      contentSections.push(`**Hiệu quả dự kiến:**\n${formData.du_kien_hieu_qua_tuong_lai}`);
    }

    // Timeline info
    const timelineInfo: string[] = [];
    if (formData.thoi_gian_bat_dau) {
      timelineInfo.push(`Bắt đầu: ${formatDate(formData.thoi_gian_bat_dau)}`);
    }
    if (formData.thoi_gian_ket_thuc) {
      timelineInfo.push(`Kết thúc: ${formatDate(formData.thoi_gian_ket_thuc)}`);
    }
    if (formData.nhu_cau_kinh_phi_du_kien) {
      timelineInfo.push(`Kinh phí: ${formData.nhu_cau_kinh_phi_du_kien}`);
    }

    return `Trợ lý AI hệ thống QLNCKH. Hỗ trợ đề tài: "${proposal.title}" (${proposal.code}).

QUAN TRỌNG: Chào hỏi/câu đơn giản → trả lời 1-2 câu ngắn. Câu hỏi chi tiết → trả lời đầy đủ hơn.

ĐỀ TÀI: ${proposal.title}
- Mã: ${proposal.code} | Trạng thái: ${stateLabels[proposal.state] || proposal.state}
- Chủ nhiệm: ${proposal.owner?.displayName || 'N/A'} | Đơn vị: ${proposal.faculty?.name || 'N/A'}
${timelineInfo.length > 0 ? `- ${timelineInfo.join(' | ')}` : ''}

${contentSections.length > 0 ? `CHI TIẾT:\n${contentSections.join('\n')}` : ''}

Trả lời tiếng Việt. Không bịa đặt.`;
  }

  /**
   * AI Fill Form - Generate content for form fields
   */
  async fillForm(
    formType: string,
    title: string,
    fieldKey?: string,
    existingData?: Record<string, string>,
  ): Promise<{ fields: Record<string, string>; model: string }> {
    if (!this.isAvailable()) {
      throw new HttpException('AI Chat service not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const fieldDefinitions = this.getFieldDefinitions(formType);
    if (!fieldDefinitions) {
      throw new HttpException(`Unknown form type: ${formType}`, HttpStatus.BAD_REQUEST);
    }

    // Filter fields if specific field requested
    const fieldsToFill = fieldKey
      ? fieldDefinitions.filter(f => f.key === fieldKey)
      : fieldDefinitions.filter(f => f.type === 'textarea'); // Only fill text fields

    if (fieldsToFill.length === 0) {
      throw new HttpException('No fields to fill', HttpStatus.BAD_REQUEST);
    }

    const systemPrompt = this.buildFillFormPrompt(formType, title, fieldsToFill, existingData);

    const messages: ChatMessageDto[] = [
      { role: MessageRole.SYSTEM, content: systemPrompt },
      { role: MessageRole.USER, content: `Hãy điền nội dung cho các trường sau dựa trên tên đề tài "${title}". Trả về JSON với key là tên trường và value là nội dung.` },
    ];

    try {
      // Use moderate max_tokens for faster response
      const response = await this.callZaiApi(messages, { maxTokens: 2048, temperature: 0.7 });
      const content = response.choices[0].message.content || '';

      if (!content) {
        throw new Error('Empty response from AI');
      }

      this.logger.debug('AI fill form raw response length:', content.length);
      this.logger.debug('AI fill form raw response:', content.substring(0, 500));

      // Try to extract JSON from markdown code blocks first
      let jsonStr = '';
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      } else {
        // Find JSON object - match from first { to last }
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }

      if (!jsonStr) {
        this.logger.error('No JSON found in AI response');
        throw new Error('Invalid AI response format');
      }

      // Fix common JSON issues from AI
      // 1. Fix missing quotes around values that start with -
      jsonStr = jsonStr.replace(/:\s*(-\s*[^",\n\}]+)/g, (match, value) => {
        // Check if value is already quoted
        if (match.trim().startsWith(':"') || match.trim().startsWith(': "')) {
          return match;
        }
        return `: "${value.replace(/"/g, '\\"')}"`;
      });

      // 2. Clean up newlines inside string values
      jsonStr = jsonStr.replace(/:\s*"([^"]*)"/g, (match, value) => {
        const cleanedValue = value
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
        return `: "${cleanedValue}"`;
      });

      // 3. If JSON is truncated (doesn't end with }), try to close it
      if (!jsonStr.trim().endsWith('}')) {
        // Find the last complete key-value pair and close the JSON
        const lastCommaIndex = jsonStr.lastIndexOf(',');
        if (lastCommaIndex > 0) {
          jsonStr = jsonStr.substring(0, lastCommaIndex) + '}';
        } else {
          jsonStr = jsonStr + '"}';
        }
        this.logger.warn('JSON was truncated, attempted to fix');
      }

      this.logger.debug('Cleaned JSON (first 500 chars):', jsonStr.substring(0, 500));

      let fields: Record<string, string>;
      try {
        fields = JSON.parse(jsonStr);
      } catch (parseError) {
        this.logger.error('JSON parse error:', parseError);
        this.logger.error('Failed JSON string (first 1000 chars):', jsonStr.substring(0, 1000));
        throw new Error('Failed to parse AI response as JSON');
      }

      return {
        fields,
        model: response.model,
      };
    } catch (error) {
      this.logger.error('Fill form failed:', error);
      throw new HttpException(
        error.message || 'AI form fill failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get field definitions for a form type
   */
  private getFieldDefinitions(formType: string): Array<{
    key: string;
    label: string;
    type: string;
    description?: string;
  }> | null {
    const definitions: Record<string, Array<{ key: string; label: string; type: string; description?: string }>> = {
      form_1b: [
        { key: 'tinh_cap_thiet', label: 'Tính cấp thiết của đề tài', type: 'textarea', description: 'Trình bày tính cấp thiết, lý do cần thực hiện đề tài nghiên cứu' },
        { key: 'muc_tieu_de_tai', label: 'Mục tiêu đề tài', type: 'textarea', description: 'Liệt kê mục tiêu tổng quát và cụ thể' },
        { key: 'noi_dung_chinh', label: 'Nội dung chính', type: 'textarea', description: 'Mô tả các nội dung nghiên cứu chính, phương pháp thực hiện' },
        { key: 'ket_qua_du_kien', label: 'Kết quả dự kiến', type: 'textarea', description: 'Liệt kê các sản phẩm, kết quả cụ thể' },
        { key: 'kha_nang_va_dia_chi_ung_dung', label: 'Khả năng và địa chỉ ứng dụng', type: 'textarea', description: 'Mô tả nơi có thể triển khai, đối tượng hưởng lợi' },
        { key: 'du_kien_hieu_qua_tuong_lai', label: 'Dự kiến hiệu quả tương lai', type: 'textarea', description: 'Đánh giá tác động dài hạn của nghiên cứu' },
      ],
      // Add more form types here as needed
    };

    return definitions[formType] || null;
  }

  /**
   * Build prompt for form filling
   */
  private buildFillFormPrompt(
    formType: string,
    title: string,
    fields: Array<{ key: string; label: string; description?: string }>,
    existingData?: Record<string, string>,
  ): string {
    const fieldList = fields.map(f => {
      const existing = existingData?.[f.key];
      return `- ${f.key}: ${f.label}${f.description ? ` (${f.description})` : ''}${existing ? `\n  Nội dung hiện có: "${existing}"` : ''}`;
    }).join('\n');

    return `Điền nội dung ngắn gọn cho đề tài NCKH. Trả về JSON.

Đề tài: ${title}

Các trường: ${fields.map(f => f.key).join(', ')}

Yêu cầu: Mỗi trường 2-3 câu ngắn gọn. Trả về JSON thuần (không markdown).`;
  }
}
