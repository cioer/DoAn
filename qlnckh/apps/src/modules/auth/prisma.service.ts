import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Alias getters for backward compatibility with camelCase singular model names
  get proposal() {
    return this.proposals;
  }

  get user() {
    return this.users;
  }

  get faculty() {
    return this.faculties;
  }

  get council() {
    return this.councils;
  }

  get councilMember() {
    return this.council_members;
  }

  get workflowLog() {
    return this.workflow_logs;
  }

  get evaluation() {
    return this.evaluations;
  }

  get attachment() {
    return this.attachments;
  }

  get document() {
    return this.documents;
  }

  get documentTemplate() {
    return this.document_templates;
  }

  get documentManifest() {
    return this.document_manifests;
  }

  get formTemplate() {
    return this.form_templates;
  }

  get formSection() {
    return this.form_sections;
  }

  get proposalDocument() {
    return this.proposal_documents;
  }

  get refreshToken() {
    return this.refresh_tokens;
  }

  get rolePermission() {
    return this.role_permissions;
  }

  get auditEvent() {
    return this.audit_events;
  }

  get businessCalendar() {
    return this.business_calendar;
  }
}
