import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { PrismaService } from '../auth/prisma.service';

/**
 * AI Chat Module
 *
 * Integrates Z.AI API for intelligent chat functionality:
 * - Basic chat completion
 * - Chat with proposal context
 * - Streaming responses
 *
 * Requires ZAI_API_KEY environment variable to be set.
 */
@Module({
  imports: [ConfigModule],
  controllers: [AiChatController],
  providers: [AiChatService, PrismaService],
  exports: [AiChatService],
})
export class AiChatModule {}
