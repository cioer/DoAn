# Story 2.6: Proposal Master Record Structure

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Hệ thống,
I want lưu trữ proposal data trong master record với structure chuẩn,
So that tất cả các workflows sau này có thể reference proposal data.

## Acceptance Criteria

**Given** database có bảng proposals
**When** inspect structure
**Then** proposals table có các field:
  - id, title, code (mã đề tài tự sinh)
  - state (DRAFT, FACULTY_REVIEW, etc.)
  - holder_unit, holder_user
  - owner_id (PROJECT_OWNER)
  - faculty_id (khoa của chủ nhiệm)
  - template_id, template_version
  - form_data (JSON, chứa data theo section)
  - sla_deadline, sla_start_date
  - created_at, updated_at, deleted_at

**Given** proposal có form_data JSON
**When** query theo section_id
**Then** có thể retrieve data cho section đó (ví dụ: SEC_INFO_GENERAL)

**Given** proposal được tạo
**When** form_data được populate
**Then** form_data structure follows canonical section IDs
**And** có thể extend khi template version update (backward compatible)

## Tasks / Subtasks

- [x] Task 1: Define Prisma schema for proposals table (AC: #1)
  - [x] Subtask 1.1: Add all required fields with correct types
  - [x] Subtask 1.2: Add indexes for frequently queried fields
  - [x] Subtask 1.3: Add foreign key constraints
- [x] Task 2: Implement form_data JSON structure helpers (AC: #2, #3)
  - [x] Subtask 2.1: Create TypeScript types for canonical section IDs
  - [x] Subtask 2.2: Implement getSectionData helper function
  - [x] Subtask 2.3: Implement setSectionData helper function
- [x] Task 3: Create ProposalService with master record operations (AC: #2)
  - [x] Subtask 3.1: Implement create method with form_data initialization
  - [x] Subtask 3.2: Implement update method with form_data merge
  - [x] Subtask 3.3: Implement query methods with section filtering
- [x] Task 4: Add migration and seed (AC: #1)
  - [x] Subtask 4.1: Generate and run Prisma migration
  - [x] Subtask 4.2: Update seed data with proper form_data structure
- [x] Task 5: Write tests (AC: #1, #2, #3)
  - [x] Subtask 5.1: Unit test form_data helpers
  - [x] Subtask 5.2: Integration test CRUD operations
  - [x] Subtask 5.3: Test backward compatibility for template version updates

## Dev Notes

### Story Foundation

**Epic 2 Context:**
- Đây là story cuối cùng của Epic 2 (Proposal Draft + Attachments + Form Registry)
- Story này định nghĩa master record structure cho proposals
- Các story trước (2.1-2.5) đã implement: Form Registry, Create Proposal, Auto-save, Upload Attachments, Attachment CRUD

**Master Record Structure:**
```typescript
// Prisma schema cho proposals
model Proposal {
  id                String   @id @default(uuid())
  code              String   @unique // Mã đề tài tự sinh: DT-YYYY-XXX
  title             String

  // State & Workflow
  state             ProjectState @default(DRAFT)
  holder_unit       String?  // Unit đang nắm giữ (Khoa, PKHCN, Council...)
  holder_user       String?  // User cụ thể đang nắm giữ (nếu có)

  // Ownership
  owner_id          String   // PROJECT_OWNER - giảng viên chủ nhiệm
  owner             User     @relation(fields: [owner_id], references: [id])
  faculty_id        String   // Khoa của chủ nhiệm
  faculty           Faculty  @relation(fields: [faculty_id], references: [id])

  // Form Template
  template_id       String   // MAU_01B, MAU_02B, etc.
  template_version  String   @default("v1.0")

  // Form Data (JSON)
  form_data         Json     // Data theo canonical section IDs

  // SLA Tracking
  sla_start_date    DateTime?
  sla_deadline      DateTime?
  sla_paused_at     DateTime?

  // Timestamps
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  deleted_at        DateTime?

  // Relations
  attachments       Attachment[]
  workflow_logs     WorkflowLog[]

  @@index([owner_id])
  @@index([faculty_id])
  @@index([state])
  @@index([holder_unit])
  @@index([holder_user])
  @@index([sla_deadline])
  @@map("proposals")
}

enum ProjectState {
  // Phase A: Proposal
  DRAFT
  FACULTY_REVIEW
  SCHOOL_SELECTION_REVIEW
  OUTLINE_COUNCIL_REVIEW

  // Phase B: Changes & Approval
  CHANGES_REQUESTED
  APPROVED
  IN_PROGRESS

  // Phase C: Acceptance & Handover
  FACULTY_ACCEPTANCE_REVIEW
  SCHOOL_ACCEPTANCE_REVIEW
  HANDOVER
  COMPLETED

  // Exception states
  PAUSED
  CANCELLED
  REJECTED
  WITHDRAWN
}
```

**form_data JSON Structure:**
```typescript
interface ProposalFormData {
  // Canonical Section IDs from form_templates
  SEC_INFO_GENERAL?: {
    project_name: string;
    research_field: string;
    execution_time: string;
    // ...
  };
  SEC_CONTENT_METHOD?: {
    scientific_content: string;
    research_method: string;
    // ...
  };
  SEC_EXPECTED_RESULTS?: {
    expected_products: string[];
    // ...
  };
  SEC_BUDGET?: {
    total_budget: number;
    budget_breakdown: BudgetItem[];
    // ...
  };
  // ... thêm sections theo template
}
```

### Project Structure Notes

**Files to Create:**
- `src/proposals/entities/proposal.entity.ts` (hoặc Prisma schema update)
- `src/proposals/dto/proposal-form-data.dto.ts` (TypeScript types)
- `src/proposals/helpers/form-data.helper.ts` (getSectionData, setSectionData)
- `src/proposals/proposal.service.ts` (master record operations)

**Files to Modify:**
- `prisma/schema.prisma` - Thêm proposals table definition
- `src/proposals/proposal.module.ts` - Import new services

**Alignment with Previous Stories:**
- Story 2.1 đã tạo form_templates với canonical section IDs
- Story 2.2 đã implement Create Proposal với DRAFT state
- Story này hoàn thiện master record structure để support toàn bộ Epic 2 và các Epic sau

### Architecture Compliance

**From Architecture.md:**
- Database: PostgreSQL 16 with Prisma 5.x
- Backend: NestJS 10.x with TypeScript 5.x
- JSON storage: Postgres JSONB type cho form_data field
- Indexing strategy: Index on frequently queried fields (state, holder_unit, owner_id)

**Naming Conventions:**
- Table names: plural_snake_case (`proposals`)
- Foreign keys: `{relation}_id`
- JSON keys: SCREAMING_SNAKE_CASE cho section IDs (`SEC_INFO_GENERAL`)

### Testing Requirements

**Unit Tests:**
- `getSectionData(sectionId)` - trả về đúng data từ form_data
- `setSectionData(sectionId, data)` - merge data vào form_data
- Form data validation theo template schema

**Integration Tests:**
- Create proposal với form_data đầy đủ
- Update proposal với partial form_data (merge, không overwrite)
- Query proposals filter theo section data
- Backward compatibility khi template version update

**E2E Tests:**
- Create proposal → form_data được lưu đúng structure
- Auto-save → form_data được update đúng (Story 2.3)
- Attach upload → form_data không bị ảnh hưởng (Story 2.4)

### Previous Story Intelligence

**Story 2.5 (Attachment CRUD - Replace, Delete):**
- Status: done
- Learnings:
  - Sử dụng `Express.Multer.File` cho file handling
  - File naming: `UUID + original extension`
  - Soft delete pattern với `deletedAt` timestamp
  - State validation: chỉ cho phép edit khi `state === ProjectState.DRAFT`
- Apply to this story:
  - Sử dụng cùng pattern cho soft delete (`deleted_at`)
  - Sử dụng `ProjectState` enum từ story 2.2
  - Form data update cũng cần validate state

**Story 2.2 (Create Proposal DRAFT):**
- Status: done
- Learnings:
  - Proposal service đã có basic CRUD
  - State transition DRAFT → FACULTY_REVIEW đã implement
  - Audit logging pattern đã established
- Apply to this story:
  - Extend ProposalService với form_data helpers
  - Ensure backward compatibility với existing proposals

**Git History Patterns:**
- Commit style: `feat(story-2.6): {description}`
- Feature branch: `feature/story-2-6-proposal-master-record`
- Prisma migration: `npx prisma migrate dev --name story-2-6-proposal-master-record`

### Technical Requirements

**Dependencies:**
- `@prisma/client` - Database ORM
- `class-validator` - DTO validation
- `class-transformer` - DTO transformation

**Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- Không cần thêm env var mới cho story này

**API Contracts:**
```
GET /api/proposals/:id
Response: {
  id, code, title, state, holder_unit, holder_user,
  owner_id, faculty_id, template_id, template_version,
  form_data: { SEC_INFO_GENERAL: {...}, ... },
  sla_deadline, sla_start_date,
  created_at, updated_at
}

PATCH /api/proposals/:id
Body: { form_data: { SEC_BUDGET: {...} } }
Response: Merged form_data
```

### References

- [Source: planning-artifacts/epics.md#Epic-2-Stories-Story-2.6](../planning-artifacts/epics.md#L714-L746)
- [Source: planning-artifacts/architecture.md#Database-Schema](../planning-artifacts/architecture.md)
- [Source: implementation-artifacts/stories/2-2-create-proposal-draft.md](./2-2-create-proposal-draft.md)
- [Source: implementation-artifacts/stories/2-5-attachment-crud-replace-delete.md](./2-5-attachment-crud-replace-delete.md)

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None (implementation successful)

### Completion Notes List

- Story created from Epic 2, Story 6 requirements
- Master record structure defined with all required fields
- form_data JSON structure follows canonical section IDs from Story 2.1
- Backward compatibility designed for template version updates

**Implementation Summary:**
- ✅ Added `deletedAt` field to Proposal model for soft delete pattern
- ✅ Added indexes: `holder_user`, `sla_deadline`, `deleted_at`
- ✅ Created TypeScript types for all form_data sections (proposal-form-data.dto.ts)
- ✅ Created form_data helper functions (getSectionData, setSectionData, mergeSectionData, etc.)
- ✅ Extended ProposalService with master record operations:
  - `findOneWithSections()` - Query proposals filtered by section data
  - `findAllWithFilters()` - Advanced filtering with holderUnit, holderUser, includeDeleted
  - `findByHolder()` - Get proposals by holder_unit or holder_user
  - `softRemove()` - Soft delete proposal (sets deletedAt)
  - `restore()` - Restore soft-deleted proposal
- ✅ Added new controller endpoints:
  - `GET /api/proposals/:id/sections?sections=SEC_INFO_GENERAL,SEC_BUDGET`
  - `GET /api/proposals/filter` (with advanced filters)
  - `GET /api/proposals/holder/my-queue`
  - `PATCH /api/proposals/:id/restore`
  - `DELETE /api/proposals/:id/hard` (soft delete)
- ✅ Created migration: `20260106_story_2_6_proposal_master_record/migration.sql`
- ✅ All 115 tests passing (46 form_data helper tests + 54 service tests + 15 validation tests)

**Code Review Fixes Applied (2026-01-06):**
- ✅ Fixed `mapToDtoWithTemplate` to include `deletedAt` field consistently
- ✅ Added audit logging to `restore()` function with PROPOSAL_RESTORE action
- ✅ Fixed route conflict: moved `@Get('filter')` before `@Get(':id')` to avoid path matching issues
- ✅ Updated controller `restore` endpoint to pass RequestContext for audit logging
- ✅ Marked all tasks as complete [x] in story file

### File List

**Created:**
- `apps/src/modules/proposals/dto/proposal-form-data.dto.ts` - TypeScript types for all form_data sections
- `apps/src/modules/proposals/helpers/form-data.helper.ts` - Helper functions for form_data operations
- `apps/src/modules/proposals/helpers/form-data.helper.spec.ts` - Unit tests for form_data helpers (46 tests)
- `prisma/migrations/20260106_story_2_6_proposal_master_record/migration.sql` - Database migration

**Modified:**
- `prisma/schema.prisma` - Added `deletedAt` field and indexes
- `apps/src/modules/proposals/proposals.service.ts` - Added master record operations
- `apps/src/modules/proposals/proposals.controller.ts` - Added new endpoints
- `apps/src/modules/proposals/dto/proposal.dto.ts` - Added `deletedAt` field to DTO
- `apps/src/modules/proposals/dto/index.ts` - Exported new types
- `apps/src/modules/proposals/proposals.service.spec.ts` - Added tests for new operations (54 tests total)

**Test Results:**
- 115/115 tests passed
- Test coverage: Unit tests for form_data helpers, integration tests for service operations
- No breaking changes to existing functionality
