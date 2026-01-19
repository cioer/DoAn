import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  StreamableFile,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

/**
 * Form Engine Controller
 *
 * Provides endpoints for accessing Form Engine generated files.
 * Admin-only access to prevent unauthorized file access.
 * Proxies requests to the Form Engine service.
 */
@Controller('form-engine')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FormEngineController {
  private readonly formEngineUrl: string;

  constructor() {
    this.formEngineUrl = process.env.FORM_ENGINE_URL || 'http://localhost:8080';
  }

  /**
   * Proxy file downloads from Form Engine service
   * Only ADMIN can access test-generated files
   */
  @Get('files/:path')
  @RequireRoles(UserRole.ADMIN)
  async serveFile(
    @Param('path') filePath: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // Decode the URL-encoded path
    const decodedPath = decodeURIComponent(filePath);

    // Security: Validate path to prevent directory traversal
    if (decodedPath.includes('..') || decodedPath.startsWith('/')) {
      throw new BadRequestException('Invalid file path');
    }

    // Only allow specific file extensions
    const allowedExtensions = ['.docx', '.pdf'];
    const hasValidExtension = allowedExtensions.some((ext) =>
      decodedPath.toLowerCase().endsWith(ext),
    );
    if (!hasValidExtension) {
      throw new BadRequestException('Invalid file type');
    }

    try {
      // Proxy request to Form Engine service
      const fileUrl = `${this.formEngineUrl}/files/${decodedPath}`;
      const response = await axios.get(fileUrl, {
        responseType: 'stream',
        timeout: 30000,
      });

      // Determine content type
      const isPdf = decodedPath.toLowerCase().endsWith('.pdf');
      const contentType = isPdf
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      // Extract filename for Content-Disposition
      const fileName = decodedPath.split('/').pop() || 'document';

      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      });

      return new StreamableFile(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new NotFoundException(`File not found: ${decodedPath}`);
      }
      throw new InternalServerErrorException('Failed to download file from Form Engine');
    }
  }
}
