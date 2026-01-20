import {
  Controller,
  Post,
  Body,
  Get,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiChatService } from './ai-chat.service';
import { ChatCompletionDto, ChatWithProposalDto } from './dto';

/**
 * AI Chat Controller
 *
 * Provides endpoints for AI chat functionality:
 * - POST /ai-chat/completions - Basic chat completion
 * - POST /ai-chat/with-proposal - Chat with proposal context
 * - POST /ai-chat/stream - Streaming chat completion (SSE)
 * - GET /ai-chat/health - Check service availability
 */
@Controller('ai-chat')
@UseGuards(JwtAuthGuard)
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  /**
   * Check AI Chat service health
   */
  @Get('health')
  async health() {
    return {
      success: true,
      data: {
        available: this.aiChatService.isAvailable(),
        service: 'Z.AI',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Basic chat completion
   */
  @Post('completions')
  async chatCompletion(
    @Body() dto: ChatCompletionDto,
    @CurrentUser() user: any,
  ) {
    const response = await this.aiChatService.chatCompletion(dto);
    return {
      success: true,
      data: response,
    };
  }

  /**
   * Chat with proposal context
   */
  @Post('with-proposal')
  async chatWithProposal(
    @Body() dto: ChatWithProposalDto,
    @CurrentUser() user: any,
  ) {
    const response = await this.aiChatService.chatWithProposal(dto);
    return {
      success: true,
      data: response,
    };
  }

  /**
   * Streaming chat completion (Server-Sent Events)
   */
  @Post('stream')
  async streamChat(
    @Body() dto: ChatCompletionDto,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      const stream = this.aiChatService.streamChatCompletion(dto);

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
}
