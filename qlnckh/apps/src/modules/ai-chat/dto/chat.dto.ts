import { IsString, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Message role types
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

/**
 * Chat message DTO
 */
export class ChatMessageDto {
  @IsEnum(MessageRole)
  role: MessageRole;

  @IsString()
  content: string;
}

/**
 * Chat completion request DTO
 */
export class ChatCompletionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @IsOptional()
  @IsString()
  proposalId?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;
}

/**
 * Chat with proposal context request DTO
 */
export class ChatWithProposalDto {
  @IsString()
  message: string;

  @IsString()
  proposalId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];
}

/**
 * Z.AI API response structure
 */
export interface ZaiChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      reasoning_content?: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Chat response DTO
 */
export class ChatResponseDto {
  content: string;
  reasoning?: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
