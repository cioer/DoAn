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
      const response = await this.callZaiApi(messages);
      const content = response.choices[0].message.content;

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

    return `Bạn là trợ lý AI chuyên viết nội dung cho đề tài nghiên cứu khoa học.

**Tên đề tài:** ${title}

**Các trường cần điền:**
${fieldList}

**Yêu cầu:**
1. Viết nội dung phù hợp với tên đề tài
2. Mỗi trường cần đủ chi tiết, có ý nghĩa
3. Sử dụng ngôn ngữ học thuật, chuyên nghiệp
4. Trả về JSON object với key là tên trường (tiếng Việt không dấu, snake_case) và value là nội dung
5. Nếu có nội dung hiện có, hãy cải thiện hoặc bổ sung thêm
6. Với trường muc_tieu_de_tai và noi_dung_chinh, dùng format liệt kê (dấu -)
7. Tối thiểu 50 ký tự cho mỗi trường

**Ví dụ output:**
{
  "tinh_cap_thiet": "Nội dung...",
  "muc_tieu_de_tai": "- Mục tiêu tổng quát:...\\n- Mục tiêu cụ thể 1:..."
}`;
  }
}
