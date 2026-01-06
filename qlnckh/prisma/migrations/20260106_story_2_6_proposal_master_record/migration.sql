-- Story 2.6: Proposal Master Record Structure
-- Migration: story_2_6_proposal_master_record
-- Created: 2026-01-06
--
-- This migration completes the proposal master record structure by:
-- 1. Adding deleted_at column for soft delete pattern
-- 2. Creating indexes for holder_user, sla_deadline, and deleted_at
-- 3. These indexes support workflow queue queries and SLA tracking

-- Add deleted_at column for soft delete pattern (Story 2.6)
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- Create index on holder_user for "My Queue" queries (Story 2.6)
CREATE INDEX IF NOT EXISTS "proposals_holder_user_idx" ON "proposals"("holder_user");

-- Create index on sla_deadline for SLA tracking queries (Story 2.6)
CREATE INDEX IF NOT EXISTS "proposals_sla_deadline_idx" ON "proposals"("sla_deadline");

-- Create index on deleted_at for soft delete filtering (Story 2.6)
CREATE INDEX IF NOT EXISTS "proposals_deleted_at_idx" ON "proposals"("deleted_at");
