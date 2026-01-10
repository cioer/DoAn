import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateReminderEmailHtml, generateReminderEmailText, ReminderEmailData } from './email.template';

/**
 * Email Sending Result
 * Proper typing - NO as unknown (Epic 7 retro pattern)
 */
interface EmailSendResult {
  success: boolean;
  error?: string;
}

/**
 * Nodemailer Transporter type (avoiding direct import for optional dependency)
 * Proper typing - NO as any (Epic 7 retro pattern)
 */
interface EmailTransporter {
  sendMail(options: {
    from: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<void>;
  verify?(): Promise<void>;
}

/**
 * Email Service
 * Story 8.2: Bulk Remind (Gửi email nhắc hàng loạt)
 *
 * Handles email sending for reminder notifications.
 * Uses nodemailer for SMTP transport.
 *
 * Critical: Follows Epic 7 retro patterns:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper typing for all data
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: EmailTransporter | null;
  private readonly fromAddress: string;
  private readonly appUrl: string;
  private readonly isEnabled: boolean;

  constructor(private configService: ConfigService) {
    // Check if email is enabled
    this.isEnabled = this.configService.get('EMAIL_ENABLED') === 'true';

    if (this.isEnabled) {
      try {
        // Dynamic import for nodemailer (may not be installed)
        const nodemailer = require('nodemailer');

        this.transporter = nodemailer.createTransporter({
          host: this.configService.get('SMTP_HOST') || 'localhost',
          port: parseInt(this.configService.get('SMTP_PORT') || '587', 10),
          secure: this.configService.get('SMTP_SECURE') === 'true',
          auth: this.configService.get('SMTP_USER')
            ? {
                user: this.configService.get('SMTP_USER'),
                pass: this.configService.get('SMTP_PASS'),
              }
            : undefined,
        });

        this.fromAddress =
          this.configService.get('SMTP_FROM') || 'noreply@nckh.edu.vn';
        this.appUrl = this.configService.get('APP_URL') || 'http://localhost:3000';

        this.logger.log('Email service initialized');
      } catch (error) {
        this.logger.warn('Nodemailer not available, email sending is disabled');
        this.isEnabled = false;
      }
    } else {
      this.fromAddress = 'noreply@nckh.edu.vn';
      this.appUrl = 'http://localhost:3000';
      this.transporter = null;
    }
  }

  /**
   * Send reminder email to a recipient
   * Story 8.2: AC4 - Execute email sending
   *
   * @param to - Recipient email address
   * @param recipientName - Recipient display name
   * @param proposals - List of proposals to include in reminder
   * @returns EmailSendResult indicating success or failure
   */
  async sendReminder(
    to: string,
    recipientName: string,
    proposals: Array<{
      code: string;
      title: string;
      slaStatus: string;
      slaDeadline?: string;
      daysRemaining?: number;
      overdueDays?: number;
    }>,
  ): Promise<EmailSendResult> {
    if (!this.isEnabled) {
      this.logger.warn(
        `Email service is disabled. Would send to ${to} about ${proposals.length} proposals`,
      );
      // Return success so bulk operations don't fail
      return { success: true };
    }

    if (!this.transporter) {
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    try {
      // Create email data - Proper typing, NO as unknown
      const emailData: ReminderEmailData = {
        recipientName,
        recipientEmail: to,
        proposals: proposals.map((p) => ({
          code: p.code,
          title: p.title,
          slaStatus: p.slaStatus,
          slaDeadline: p.slaDeadline || 'N/A',
          daysRemaining: p.daysRemaining,
          overdueDays: p.overdueDays,
        })),
        appUrl: this.appUrl,
        sentDate: new Date(),
      };

      // Generate email content
      const html = generateReminderEmailHtml(emailData);
      const text = generateReminderEmailText(emailData);

      // Send email
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: 'Nhắc nhở hồ sơ nghiên cứu khoa học',
        text,
        html,
      });

      this.logger.log(`Reminder email sent to ${to} for ${proposals.length} proposals`);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email to ${to}: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Test email configuration
   *
   * @param to - Test recipient email
   * @returns Success status
   */
  async testConnection(to?: string): Promise<boolean> {
    if (!this.isEnabled || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');

      if (to) {
        await this.transporter.sendMail({
          from: this.fromAddress,
          to,
          subject: 'Test Email - NCKH System',
          text: 'This is a test email from the NCKH system.',
        });
        this.logger.log(`Test email sent to ${to}`);
      }

      return true;
    } catch (error) {
      this.logger.error('SMTP connection test failed:', error);
      return false;
    }
  }

  /**
   * Check if email service is enabled
   */
  isEmailEnabled(): boolean {
    return this.isEnabled;
  }
}
