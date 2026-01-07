# Story 6.2: Submit Faculty Acceptance Review

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Giảng viên (PROJECT_OWNER),
I want nộp hồ sơ nghiệm thu cấp Khoa,
So that Khoa có thể nghiệm thu dự án.

## Acceptance Criteria

1. **AC1: Submit Button Visibility**
   - Given Proposal state = IN_PROGRESS
   - When Owner (PROJECT_OWNER) mở proposal detail
   - Then UI hiển thị button "Nộp nghiệm thu cấp Khoa" (primary action)
   - And button disabled khi state ≠ IN_PROGRESS
   - And chỉ owner của proposal mới thấy button này

2. **AC2: Faculty Acceptance Form Display**
   - Given User click "Nộp nghiệm thu cấp Khoa"
   - Then Modal hiển thị Faculty Acceptance Form với:
     - "Kết quả thực hiện" (textarea, required)
     - "Sản phẩm đầu ra" (list với add/remove)
       - Tên sản phẩm (textbox)
       - Loại sản phẩm (dropdown: Bài báo, Sách, Phần mềm, Khác)
       - File đính kèm (file upload)
     - Submit button: "Nộp"
     - Cancel button: "Hủy"

3. **AC3: Form Validation**
   - Given User đã mở Faculty Acceptance Form
   - When User click "Nộp" với form invalid
   - Then UI hiển thị validation errors:
     - "Kết quả thực hiện" is required
     - At least one product required in "Sản phẩm đầu ra"
     - Each product requires: tên sản phẩm, loại sản phẩm
   - And form không submit

4. **AC4: State Transition (IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW)**
   - Given User đã điền form và click "Nộp"
   - When action execute (kèm idempotency key)
   - Then proposal.state chuyển từ IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW
   - And proposal.holderUnit = owner_faculty_id
   - And proposal.holderUser = null (Khoa review, chưa gán người cụ thể)
   - And formData được lưu với SectionId.SEC_FACULTY_ACCEPTANCE_RESULTS và SEC_FACULTY_ACCEPTANCE_PRODUCTS
   - And workflow_logs entry ghi action SUBMIT_FACULTY_ACCEPTANCE
   - And attachments được lưu với type="FACULTY_ACCEPTANCE"

5. **AC5: Idempotency**
   - Given User click "Nộp" nhiều lần
   - When các request có cùng idempotency key
   - Then chỉ thực hiện transition một lần
   - And các request sau đó trả về kết quả đã cached (200 OK)

6. **AC6: UI Update After Submit**
   - Given Submit faculty acceptance thành công
   - When transition hoàn tất
   - Then UI update state badge hiển thị "Nghiệm thu Khoa"
   - And "Nộp nghiệm thu cấp Khoa" button không còn hiển thị
   - And Timeline hiển thị entry mới: "Đã nộp hồ sơ nghiệm thu cấp Khoa"
   - And Form data được display trong Acceptance section

7. **AC7: Permission Check**
   - Given User không phải owner của proposal
   - When User cố gọi submit faculty acceptance API
   - Then API trả về 403 Forbidden
   - And error message: "Bạn không có quyền thực hiện hành động này"

## Tasks / Subtasks

- [ ] Task 1: Backend - Faculty Acceptance Data Model (AC: #2, #4)
  - [ ] Add SectionId.SEC_FACULTY_ACCEPTANCE_RESULTS to schema
  - [ ] Add SectionId.SEC_FACULTY_ACCEPTANCE_PRODUCTS to schema
  - [ ] Define FacultyAcceptanceProduct type
  - [ ] Update Prisma client generation

- [ ] Task 2: Backend - Submit Faculty Acceptance Service (AC: #3, #4, #5, #7)
  - [ ] Add submitFacultyAcceptance() method to ProposalsService
  - [ ] Validate proposal.state = IN_PROGRESS
  - [ ] Validate user.id = proposal.ownerId (PROJECT_OWNER check)
  - [ ] Validate form data (results not empty, at least one product)
  - [ ] Use @UseInterceptors(IdempotencyInterceptor) on controller
  - [ ] Wrap transition in Prisma transaction
  - [ ] Update proposal.formData với faculty acceptance data
  - [ ] Save attachments với type="FACULTY_ACCEPTANCE"
  - [ ] Update proposal: IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW
  - [ ] Set holderUnit = facultyId, holderUser = null
  - [ ] Create workflow_logs entry with SUBMIT_FACULTY_ACCEPTANCE action
  - [ ] Return updated proposal

- [ ] Task 3: Backend - Submit Endpoint (AC: #1, #4, #7)
  - [ ] Create POST /proposals/:id/faculty-acceptance endpoint
  - [ ] Add @UseGuards(JwtAuthGuard) for authentication
  - [ ] Add @UseGuards(ProjectOwnerGuard) for authorization
  - [ ] Apply IdempotencyInterceptor at controller level
  - [ ] Handle idempotency key from X-Idempotency-Key header
  - [ ] Create SubmitFacultyAcceptanceDto
  - [ ] Return 403 if user is not owner
  - [ ] Return 400 if state ≠ IN_PROGRESS
  - [ ] Return 400 if validation fails
  - [ ] Return 200 with updated proposal on success

- [ ] Task 4: Backend - File Upload for Products (AC: #2)
  - [ ] Extend file upload endpoint to accept FACULTY_ACCEPTANCE type
  - [ ] Validate file size (max 5MB per file)
  - [ ] Validate file types (PDF, images, documents)
  - [ ] Return file URL for client reference
  - [ ] Store attachment metadata in database

- [ ] Task 5: Frontend - Faculty Acceptance Form Modal (AC: #2, #3)
  - [ ] Create FacultyAcceptanceModal component
  - [ ] Add "Kết quả thực hiện" textarea with validation
  - [ ] Add "Sản phẩm đầu ra" list with add/remove
  - [ ] Add product fields: tên sản phẩm, loại sản phẩm, file upload
  - [ ] Implement form validation with Zod
  - [ ] Show loading state during API call
  - [ ] Handle errors gracefully
  - [ ] Close modal on success or cancel

- [ ] Task 6: Frontend - Submit Button Integration (AC: #1, #6)
  - [ ] Add SubmitFacultyAcceptanceButton to ProposalDetail
  - [ ] Show "Nộp nghiệm thu cấp Khoa" text with primary style
  - [ ] Disable when proposal.state ≠ IN_PROGRESS
  - [ ] Disable when current user is not owner
  - [ ] Open FacultyAcceptanceModal on click
  - [ ] Invalidate queries after success to refresh UI

- [ ] Task 7: Frontend - Timeline Update (AC: #6)
  - [ ] Timeline component refetches proposal data after action
  - [ ] Add SUBMIT_FACULTY_ACCEPTANCE timeline entry display
  - [ ] Show: "Đã nộp hồ sơ nghiệm thu cấp Khoa" + timestamp + actor name
  - [ ] Use Upload icon for submission action

- [ ] Task 8: Unit Tests (AC: #1, #2, #3, #4, #5, #6, #7)
  - [ ] Test submitFacultyAcceptance() service method
  - [ ] Test state transition only from IN_PROGRESS
  - [ ] Test permission check (only owner)
  - [ ] Test form validation (results required, at least one product)
  - [ ] Test idempotency (duplicate requests)
  - [ ] Test workflow_log entry creation
  - [ ] Test holder rules (holderUnit = facultyId, holderUser = null)
  - [ ] Test formData update with faculty acceptance data
  - [ ] Test attachment creation with FACULTY_ACCEPTANCE type

## Dev Notes

### Epic 6 Context

**Epic 6: Acceptance & Handover + Dossier Pack**
- FRs covered: FR28, FR29, FR30, FR31, FR32, FR33, FR41, FR42
- Story 6.1: Start Project (done)
- **Story 6.2: Submit Faculty Acceptance Review (THIS STORY)** - Owner submits acceptance results
- Story 6.3: Faculty Acceptance (Vote)
- Story 6.4: School Acceptance (Vote)
- Story 6.5: Handover + Dossier Pack Checklist
- Story 6.6: ZIP Dossier Pack Export

### Dependencies

**Depends on:**
- Story 6.1 (Start Project) - Must have IN_PROGRESS state
- Story 3.8 (Idempotency Keys) - Reuse IdempotencyInterceptor pattern
- Story 2.4 (Upload Attachments) - Reuse file upload infrastructure

**Enables:**
- Story 6.3 (Faculty Acceptance Vote) - Requires FACULTY_ACCEPTANCE_REVIEW state

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  proposals/
    proposals.controller.ts   # Add POST /:id/faculty-acceptance endpoint
    proposals.service.ts      # Add submitFacultyAcceptance() method
    dto/
      submit-faculty-acceptance.dto.ts  # New: DTO with form data
  attachments/
    attachments.controller.ts  # Extend for FACULTY_ACCEPTANCE type
    attachments.service.ts     # Add type validation
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  components/
    proposal/
      FacultyAcceptanceModal.tsx   # New: Acceptance form modal
      SubmitFacultyAcceptanceButton.tsx  # New: Submit button
      ProposalDetail.tsx            # Add SubmitFacultyAcceptanceButton
  lib/api/
    proposals.ts                    # Add submitFacultyAcceptance() API method
```

### Epic 5 Retro Learnings to Apply

From `epic-5-retro-2026-01-07.md`:

1. **IdempotencyInterceptor Pattern (Story 5.4 fix):**
   ```typescript
   @UseInterceptors(IdempotencyInterceptor) // Reused from Epic 3
   @Controller('proposals')
   export class ProposalsController {
     @Post(':id/faculty-acceptance')
     async submitFacultyAcceptance(@Param('id') id: string) { ... }
   }
   ```
   - Critical: Must apply interceptor at controller level or endpoint level
   - Client must send X-Idempotency-Key header with UUID v4

2. **Atomic Transaction Pattern (Story 5.4):**
   ```typescript
   return this.prisma.$transaction(async (tx) => {
     // 1. Update proposal state
     const proposal = await tx.proposal.update({...});

     // 2. Update formData with faculty acceptance data
     const updatedProposal = await tx.proposal.update({...});

     // 3. Save attachments (if any)
     if (dto.products?.length) {
       await tx.attachment.createMany({...});
     }

     // 4. Create workflow log entry
     await tx.workflowLog.create({
       action: 'SUBMIT_FACULTY_ACCEPTANCE',
       fromState: 'IN_PROGRESS',
       toState: 'FACULTY_ACCEPTANCE_REVIEW',
       // ...
     });

     return updatedProposal;
   });
   ```

3. **RBAC Pattern from Story 5.6:**
   ```typescript
   @UseGuards(JwtAuthGuard)
   @UseGuards(ProjectOwnerGuard) // Ensures user.id === proposal.ownerId
   @Post(':id/faculty-acceptance')
   async submitFacultyAcceptance(@Param('id') id: string, @CurrentUser() user: User) {
     // Guard handles authorization, service handles business logic
   }
   ```

### Architecture Compliance

**State Machine Rules (from architecture.md):**
- IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW is valid transition (Phase B → Phase C)
- holderUnit = facultyId (returns to owner's faculty)
- holderUser = null (faculty-level review, not assigned to specific user)
- SLA tracking starts based on faculty acceptance SLA rules

**WorkflowAction Enum:**
- SUBMIT_FACULTY_ACCEPTANCE action added in Epic 6
- Must be logged to workflow_logs for audit trail

**API Response Format:**
```typescript
// Success
{ success: true, data: { proposal: {...} }, meta: {...} }

// Error
{ success: false, error: { code: "FORBIDDEN", message: "Bạn không có quyền thực hiện hành động này" } }
```

### Data Model

**Prisma Schema Addition:**
```prisma
enum SectionId {
  // ... existing sections ...

  // Phase C: Faculty Acceptance (MAU_08B - MAU_11B)
  SEC_FACULTY_ACCEPTANCE_RESULTS   // Kết quả thực hiện
  SEC_FACULTY_ACCEPTANCE_PRODUCTS  // Sản phẩm nghiên cứu
}

model Attachment {
  id          String    @id @default(uuid())
  proposalId  String    @map("proposal_id")
  fileName    String    @map("file_name")
  fileUrl     String    @map("file_url")
  fileSize    Int       @map("file_size")
  mimeType    String    @map("mime_type")
  type        String?   @default("GENERAL") // GENERAL, FACULTY_ACCEPTANCE, SCHOOL_ACCEPTANCE, HANDOVER
  uploadedBy  String    @map("uploaded_by")
  uploadedAt  DateTime  @default(now()) @map("uploaded_at")
  deletedAt   DateTime? @map("deleted_at")

  proposal    Proposal  @relation(fields: [proposalId], references: [id], onDelete: Cascade)

  @@map("attachments")
  @@index([proposalId])
  @@index([uploadedBy])
  @@index([deletedAt])
  @@index([type])
}
```

**Service Method Signature:**
```typescript
/**
 * Submit faculty acceptance review
 * @param proposalId - Proposal UUID
 * @param userId - User ID (owner)
 * @param dto - Faculty acceptance form data
 * @returns Updated proposal
 */
async submitFacultyAcceptance(
  proposalId: string,
  userId: string,
  dto: SubmitFacultyAcceptanceDto
): Promise<Proposal>
```

**DTO Structure:**
```typescript
export class SubmitFacultyAcceptanceDto {
  @IsString()
  @IsNotEmpty()
  results: string; // Kết quả thực hiện

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacultyAcceptanceProductDto)
  products: FacultyAcceptanceProductDto[]; // Sản phẩm đầu ra

  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[]; // Uploaded file IDs
}

export class FacultyAcceptanceProductDto {
  @IsString()
  @IsNotEmpty()
  name: string; // Tên sản phẩm

  @IsEnum(ProductType)
  type: ProductType; // Loại sản phẩm

  @IsString()
  @IsOptional()
  attachmentId?: string; // File đính kèm (optional)
}

enum ProductType {
  BAI_BAO = 'BAI_BAO',           // Bài báo khoa học
  SACH = 'SACH',                 // Sách/chương sách
  PHAN_MEM = 'PHAN_MEM',         // Phần mềm
  SAN_PHAM = 'SAN_PHAM',         // Sản phẩm
  KHAC = 'KHAC',                 // Khác
}
```

**Workflow Log Entry:**
```typescript
await tx.workflowLog.create({
  proposalId,
  action: 'SUBMIT_FACULTY_ACCEPTANCE',
  fromState: 'IN_PROGRESS',
  toState: 'FACULTY_ACCEPTANCE_REVIEW',
  actorId: userId,
  actorName: user.displayName,
  timestamp: new Date(),
});
```

**FormData Structure:**
```typescript
// proposal.formData after submit
{
  // ... existing sections ...

  [SectionId.SEC_FACULTY_ACCEPTANCE_RESULTS]: {
    results: "Kết quả thực hiện đề tài...",
    submittedAt: "2026-01-07T10:00:00Z"
  },

  [SectionId.SEC_FACULTY_ACCEPTANCE_PRODUCTS]: {
    products: [
      {
        id: "uuid-1",
        name: "Nghiên cứu AI trong y học",
        type: "BAI_BAO",
        attachmentId: "file-uuid-1",
        attachmentUrl: "/uploads/..."
      },
      {
        id: "uuid-2",
        name: "Hệ thống quản lý NCKH",
        type: "PHAN_MEM",
        attachmentId: "file-uuid-2",
        attachmentUrl: "/uploads/..."
      }
    ]
  }
}
```

### RBAC Authorization

**Permission Check:**
```typescript
// PROJECT_OWNER is contextual: user.id === proposal.ownerId
// Only the owner of the proposal can submit faculty acceptance

// ProjectOwnerGuard implementation:
@Injectable()
export class ProjectOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const proposalId = request.params.id;
    const userId = request.user?.id;

    if (!userId) return false;

    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { ownerId: true },
    });

    if (!proposal) return false;

    return proposal.ownerId === userId;
  }
}
```

### Testing Standards

**Backend Tests:**
- Use Vitest + NestJS testing utilities
- Mock Prisma transaction
- Test idempotency with duplicate requests
- Test permission check (non-owner cannot submit)
- Test state validation (only IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW)
- Test form validation (results required, at least one product)
- Test workflow log creation
- Test holder rules (holderUnit = facultyId, holderUser = null)

**Frontend Tests:**
- Test modal visibility and open/close
- Test form validation (required fields)
- Test product list add/remove functionality
- Test loading state during API call
- Test UI refresh after success
- Test error handling (403, 400)

### Vietnamese Localization

All UI text must be in Vietnamese:
- "Nộp nghiệm thu cấp Khoa" (Submit button)
- "Nghiệm thu Khoa" (FACULTY_ACCEPTANCE_REVIEW state display)
- "Đã nộp hồ sơ nghiệm thu cấp Khoa" (Timeline entry)
- "Bạn không có quyền thực hiện hành động này" (403 error)
- "Đề tài chưa ở trạng thái đang thực hiện" (400 error when not IN_PROGRESS)
- "Kết quả thực hiện" (Results label)
- "Sản phẩm đầu ra" (Products label)
- "Tên sản phẩm" (Product name label)
- "Loại sản phẩm" (Product type label)
- "Bài báo", "Sách", "Phần mềm", "Khác" (Product types)
- "Kết quả thực hiện không được để trống" (Validation error)
- "Phải có ít nhất một sản phẩm" (Validation error)

### Code Patterns to Follow

**From Story 3.8 (Idempotency):**
```typescript
// Client-side: Generate idempotency key
const idempotencyKey = crypto.randomUUID();

// API call with header
await proposalsApi.submitFacultyAcceptance(proposalId, data, {
  headers: { 'X-Idempotency-Key': idempotencyKey }
});
```

**From Story 5.4 (Atomic Transaction):**
- State change happens atomically with workflow log
- Use Prisma transaction for consistency
- Return complete updated proposal to client

**From Story 2.4 (File Upload):**
- Reuse file upload infrastructure
- Store attachment metadata in database
- Return file URL for client reference

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 6-2 created via create-story workflow. Status: ready-for-dev
- Epic 5 retrospective learnings applied
- IdempotencyInterceptor pattern included
- Atomic transaction pattern specified
- RBAC with ProjectOwnerGuard defined
- Faculty acceptance form structure defined
- Product list with attachment support
- Database schema changes documented (SectionId enum, Attachment.type)

### File List

**To Create:**
- `qlnckh/apps/src/modules/proposals/dto/submit-faculty-acceptance.dto.ts` - DTO for faculty acceptance
- `qlnckh/apps/src/modules/proposals/dto/faculty-acceptance-product.dto.ts` - Product DTO
- `qlnckh/web-apps/src/components/proposal/FacultyAcceptanceModal.tsx` - Acceptance form modal
- `qlnckh/web-apps/src/components/proposal/SubmitFacultyAcceptanceButton.tsx` - Submit button component

**To Modify:**
- `qlnckh/apps/src/modules/proposals/proposals.controller.ts` - Add POST /:id/faculty-acceptance endpoint
- `qlnckh/apps/src/modules/proposals/proposals.service.ts` - Add submitFacultyAcceptance() method
- `qlnckh/apps/src/modules/attachments/attachments.service.ts` - Extend for FACULTY_ACCEPTANCE type
- `qlnckh/prisma/schema.prisma` - Add new SectionId values, extend Attachment.type
- `qlnckh/web-apps/src/components/proposal/ProposalDetail.tsx` - Add SubmitFacultyAcceptanceButton
- `qlnckh/web-apps/src/lib/api/proposals.ts` - Add submitFacultyAcceptance() API method
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 6 context analyzed from epics.md
  - Epic 5 retrospective learnings incorporated
  - IdempotencyInterceptor pattern from Story 3.8/5.4 applied
  - Atomic transaction pattern from Story 5.4 specified
  - RBAC pattern with ProjectOwnerGuard defined
  - Faculty acceptance form structure with product list designed
  - Comprehensive developer guide created
  - Ready for dev-story workflow execution

## References

- [epics.md Story 6.2](../../planning-artifacts/epics.md#L1758-L1782) - Full requirements
- [epic-5-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-5-retro-2026-01-07.md) - Lessons learned
- [architecture.md](../../planning-artifacts/architecture.md) - State machine & patterns
- [project-context.md](../../project-context.md) - Implementation rules
- [Story 3.8](../5-6-evaluation-pdf-export.md#L38) - Idempotency pattern reference
- [Story 5.4](../5-4-preview-pdf-confirm.md) - Atomic transaction pattern reference
- [Story 6.1](./6-1-start-project-approved-right-arrow-in-progress.md) - Previous story with IN_PROGRESS state
