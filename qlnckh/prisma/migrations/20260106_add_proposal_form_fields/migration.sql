-- AddProposalFormFields
-- Migration: add_proposal_form_fields
-- Created: 2026-01-06
-- Story: 2.2 Create Proposal Draft (prepares schema)

-- Add template_id column to proposals table
ALTER TABLE "proposals" ADD COLUMN "template_id" TEXT;

-- Add template_version column to proposals table
ALTER TABLE "proposals" ADD COLUMN "template_version" TEXT;

-- Add form_data column to proposals table (JSONB for flexible form data)
ALTER TABLE "proposals" ADD COLUMN "form_data" jsonb;

-- Create index on template_id for query performance
CREATE INDEX "proposals_template_id_idx" ON "proposals"("template_id");

-- Add foreign key constraint from proposals to form_templates
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "form_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
