-- CreateFormTemplates
-- Migration: add_form_templates
-- Created: 2026-01-05

-- Create SectionId enum
CREATE TYPE "SectionId" AS ENUM (
  'SEC_INFO_GENERAL',
  'SEC_CONTENT_METHOD',
  'SEC_RESEARCH_METHOD',
  'SEC_EXPECTED_RESULTS',
  'SEC_BUDGET',
  'SEC_ATTACHMENTS',
  'SEC_RESEARCHERS',
  'SEC_FACILITIES',
  'SEC_TIMELINE',
  'SEC_REFERENCES',
  'SEC_FACULTY_ACCEPTANCE_RESULTS',
  'SEC_FACULTY_ACCEPTANCE_PRODUCTS',
  'SEC_SCHOOL_ACCEPTANCE_RESULTS',
  'SEC_SCHOOL_ACCEPTANCE_PRODUCTS',
  'SEC_HANDOVER_CHECKLIST',
  'SEC_EXTENSION_REASON',
  'SEC_EXTENSION_DURATION'
);

-- Create form_templates table
CREATE TABLE "form_templates" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" TEXT NOT NULL DEFAULT 'v1.0',
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "project_type" TEXT NOT NULL DEFAULT 'CAP_TRUONG',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- Create index on form_templates.code
CREATE UNIQUE INDEX "form_templates_code_key" ON "form_templates"("code");
CREATE INDEX "form_templates_code_idx" ON "form_templates"("code");
CREATE INDEX "form_templates_is_active_idx" ON "form_templates"("is_active");

-- Create form_sections table
CREATE TABLE "form_sections" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "section_id" "SectionId" NOT NULL,
  "label" TEXT NOT NULL,
  "component" TEXT NOT NULL,
  "display_order" INTEGER NOT NULL,
  "is_required" BOOLEAN NOT NULL DEFAULT false,
  "config" jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "form_sections_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraint
ALTER TABLE "form_sections" ADD CONSTRAINT "form_sections_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create unique constraint on template_id + section_id
CREATE UNIQUE INDEX "form_sections_template_id_section_id_key" ON "form_sections"("template_id", "section_id");

-- Create index on template_id
CREATE INDEX "form_sections_template_id_idx" ON "form_sections"("template_id");
