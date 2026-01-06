# Story 4.2: Faculty Return Dialog (Reason Code + Sections)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Quản lý Khoa (QUAN_LY_KHOA),
I want trả về hồ sơ với reason code và section cần sửa,
So that Giảng viên biết chính xác gì cần sửa.

## Acceptance Criteria

1. **AC1: UI Button Display - "Yêu cầu sửa"**
   - Given User có role = QUAN_LY_KHOA hoặc THU_KY_KHOA
   - And User mở proposal với state = FACULTY_REVIEW
   - When UI renders
   - Then hiển thị button "Yêu cầu sửa" (secondary destructive hoặc trong "…" menu)

2. **AC2: UI Button Hidden - Wrong Role/State**
   - Given User KHÔNG có role = QUAN_LY_KHOA/THU_KY_KHOA
   - Or proposal state != FACULTY_REVIEW
   - When UI renders
   - Then button "Yêu cầu sửa" KHÔNG hiển thị

3. **AC3: Return Dialog Content**
   - Given User click button "Yêu cầu sửa"
   - When Return Dialog mở
   - Then Dialog hiển thị:
     - Reason code dropdown (required):
       - "Thiếu tài liệu"
       - "Nội dung không rõ ràng"
       - "Phương pháp không khả thi"
       - "Kinh phí không hợp lý"
       - "Khác"
     - Section checkboxes (required, ít nhất 1):
       - [ ] Thông tin chung
       - [ ] Nội dung nghiên cứu
       - [ ] Phương pháp nghiên cứu
       - [ ] Kết quả mong đợi
       - [ ] Kinh phí
       - [ ] Tài liệu đính kèm
     - Comment field (optional, textarea)

4. **AC4: Return Dialog Validation**
   - Given User chưa chọn reason code hoặc chưa tick checkbox
   - When User click "Gửi"
   - Then button "Gửi" bị disabled
   - And hiển thị validation error

5. **AC5: Backend RBAC Check**
   - Given API POST /api/workflow/:proposalId/return được gọi
   - When User không có role = QUAN_LY_KHOA hoặc THU_KY_KHOA
   - Then API return 403 Forbidden
   - And state KHÔNG đổi

6. **AC6: Idempotency Key (Anti-Double-Submit)**
   - Given User submit return action
   - When request contains idempotency key
   - Then backend MUST validate key uniqueness
   - And duplicate key returns 409 Conflict

## Tasks / Subtasks

- [ ] Task 1: Backend DTO - Return Request (AC: #3, #4, #5)
  - [ ] Create DTO: `ReturnFacultyReviewDto`
    - reasonCode: enum (THIEU_TAI_LIEU, NOI_DUNG_KHONG_RO_RANG, PHUONG_PHAP_KHONG_KHA_THI, KINH_PHI_KHONG_HOP_LE, KHAC)
    - revisionSections: string[] (array of section IDs)
    - comment: string (optional)
  - [ ] Add validation: reasonCode required, revisionSections min 1 item
  - [ ] Add DTO validation decorators

- [ ] Task 2: Backend Service - Return Logic (AC: #5, #6)
  - [ ] Create method: `WorkflowService.returnFacultyReview()`
  - [ ] Validate state: must be `FACULTY_REVIEW` before return
  - [ ] Validate RBAC: user must have QUAN_LY_KHOA or THU_KY_KHOA role
  - [ ] Update proposal state: `FACULTY_REVIEW → CHANGES_REQUESTED`
  - [ ] Update holder_unit = owner_faculty_id (về lại giảng viên)
  - [ ] Update holder_user = owner_id
  - [ ] Store return target in workflow log (for Story 4.5 resubmit)

- [ ] Task 3: Workflow Log Entry with Return Target (AC: #3)
  - [ ] Create workflow log entry with return target EXPLICIT:
    - action = "RETURN"
    - from_state = "FACULTY_REVIEW"
    - to_state = "CHANGES_REQUESTED"
    - return_target_state = "FACULTY_REVIEW" (SOURCE OF TRUTH)
    - return_target_holder_unit = Khoa đã trả về (SOURCE OF TRUTH)
    - reason_code = selected reason
    - revision_sections = array of selected section IDs
    - comment = user comment

- [ ] Task 4: Backend API Endpoint (AC: #5, #6)
  - [ ] Create endpoint: `POST /api/workflow/:proposalId/return-faculty`
  - [ ] Add RBAC guard: `@RequireRoles(UserRole.QUAN_LY_KHOA, UserRole.THU_KY_KHOA)`
  - [ ] Apply IdempotencyInterceptor (reuse from Story 3.8)
  - [ ] Handle 400 for invalid state (not FACULTY_REVIEW)
  - [ ] Handle 403 for wrong role
  - [ ] Handle 409 for duplicate idempotency key

- [ ] Task 5: Frontend - "Yêu cầu sửa" Button (AC: #1, #2)
  - [ ] Add "Yêu cầu sửa" button to ProposalActions component
  - [ ] Conditionally render: only when `state === 'FACULTY_REVIEW'` AND user has `QUAN_LY_KHOA`/`THU_KY_KHOA` role
  - [ ] Button style: secondary destructive (red/orange)
  - [ ] Or place in "…" menu for cleaner UI

- [ ] Task 6: Frontend - Return Dialog Component (AC: #3, #4)
  - [ ] Create `ReturnDialog` component with:
    - Reason code dropdown (Select)
    - Section checkboxes (Checkbox group)
    - Comment textarea (optional)
    - "Gửi" and "Hủy" buttons
  - [ ] Add validation: reasonCode required, revisionSections min 1
  - [ ] Disable "Gửi" button when validation fails
  - [ ] Show error message when validation fails

- [ ] Task 7: Frontend - API Integration (AC: #5, #6)
  - [ ] Create `workflowApi.returnFacultyReview()` in workflow.ts
  - [ ] Generate idempotency key on client (UUID v4)
  - [ ] Send X-Idempotency-Key header (Story 3.8 pattern)
  - [ ] Handle 400 error - show "Chỉ có thể trả về khi ở trạng thái FACULTY_REVIEW"
  - [ ] Handle 403 Forbidden - show "Bạn không có quyền trả về"
  - [ ] Handle 409 Conflict - show "Đã gửi yêu cầu này rồi"
  - [ ] Refresh proposal data after success

- [ ] Task 8: Unit Tests (AC: #1, #2, #3, #4, #5, #6)
  - [ ] Test returnFacultyReview success with valid role
  - [ ] Test returnFacultyReview fails with wrong role (403)
  - [ ] Test returnFacultyReview fails when state != FACULTY_REVIEW (400)
  - [ ] Test workflow log entry with return_target fields
  - [ ] Test state transition to CHANGES_REQUESTED
  - [ ] Test holder updated to owner (giảng viên)
  - [ ] Test idempotency key rejection on duplicate (409)
  - [ ] Test button visibility based on role and state

- [ ] Task 9: Component Tests
  - [ ] Test ReturnDialog renders with all fields
  - [ ] Test validation: reasonCode required
  - [ ] Test validation: revisionSections required (min 1)
  - [ ] Test "Gửi" button disabled when invalid
  - [ ] Test API call with valid data

- [ ] Task 10: E2E Tests (Playwright)
  - [ ] Test QUAN_LY_KHOA sees "Yêu cầu sửa" button on FACULTY_REVIEW proposal
  - [ ] Test other roles don't see return button
  - [ ] Test click "Yêu cầu sửa" opens dialog
  - [ ] Test select reason code + sections enables submit button
  - [ ] Test submit creates CHANGES_REQUESTED state
  - [ ] Test return appears in workflow timeline

## Dev Notes

### Architecture References

**State Machine (from Epic 3 + architecture.md):**
```
FACULTY_REVIEW → [Faculty Return] → CHANGES_REQUESTED
```

**Return Target Fields (Critical for Story 4.5 Resubmit):**
The workflow log MUST explicitly store return_target_state and return_target_holder_unit.
These fields are the SOURCE OF TRUTH for resubmit - do NOT infer from previous state.

**RBAC Roles (from architecture.md):**
- `QUAN_LY_KHOA` - Faculty Manager, can return proposals at faculty level
- `THU_KY_KHOA` - Faculty Secretary, can also return proposals
- `GIANG_VIEN` - Lecturer/PI, receives returned proposals

**Workflow Log Schema (from Story 3.4 + UX-2):**
```typescript
interface WorkflowLog {
  id: string;
  proposal_id: string;
  action: 'RETURN' | 'APPROVE' | 'SUBMIT' | 'RESUBMIT' | ...;
  from_state: string;
  to_state: string;
  return_target_state?: string;      // FACULTY_REVIEW (where to go after resubmit)
  return_target_holder_unit?: string; // Khoa đã trả về
  reason_code?: string;
  revision_sections?: string[];      // Section IDs needing revision
  comment?: string;
  actor_id: string;
  actor_name: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
```

**Reason Code Enum:**
```typescript
enum ReturnReasonCode {
  THIEU_TAI_LIEU = 'THIEU_TAI_LIEU',           // Thiếu tài liệu
  NOI_DUNG_KHONG_RO_RANG = 'NOI_DUNG_KHONG_RO_RANG', // Nội dung không rõ ràng
  PHUONG_PHAP_KHONG_KHA_THI = 'PHUONG_PHAP_KHONG_KHA_THI', // Phương pháp không khả thi
  KINH_PHI_KHONG_HOP_LE = 'KINH_PHI_KHONG_HOP_LE',     // Kinh phí không hợp lý
  KHAC = 'KHAC',                                 // Khác
}
```

**Section IDs (Canonical from Story 2.1):**
```typescript
const CANONICAL_SECTIONS = [
  'SEC_INFO_GENERAL',      // Thông tin chung
  'SEC_CONTENT_METHOD',    // Nội dung nghiên cứu
  'SEC_METHOD',            // Phương pháp nghiên cứu
  'SEC_EXPECTED_RESULTS',  // Kết quả mong đợi
  'SEC_BUDGET',            // Kinh phí
  'SEC_ATTACHMENTS',       // Tài liệu đính kèm
];
```

**Source:** [epics.md Story 4.2](../../planning-artifacts/epics.md#L1201-L1238)

### Previous Story Intelligence

**What Story 4.1 (Faculty Approve Action) Implemented:**
- POST `/api/workflow/:proposalId/approve-faculty` endpoint
- RBAC guard with @RequireRoles(UserRole.QUAN_LY_KHOA, UserRole.THU_KY_KHOA)
- State validation: only FACULTY_REVIEW proposals can be acted on
- Idempotency via IdempotencyInterceptor (X-Idempotency-Key header)
- Workflow log creation pattern
- ProposalActions component pattern
- workflowApi client pattern

**What Story 3.3 (Submit Proposal) Implemented:**
- Pattern for state transition actions
- Workflow log creation pattern
- UI button conditional rendering based on state

**What Story 3.4 (Workflow Logs) Implemented:**
- `workflow_logs` table and entity
- Timeline/thread view for logs
- Log creation service pattern
- Return target fields in schema (return_target_state, return_target_holder_unit)

**What Story 3.8 (Idempotency Keys) Implemented:**
- Idempotency key validation via IdempotencyInterceptor
- Duplicate detection with 409 Conflict response
- Client-side UUID generation pattern
- X-Idempotency-Key header requirement

**Location:** `apps/api/src/modules/workflow/`

### Implementation Considerations

1. **Backend Endpoint Pattern:**
   ```typescript
   // apps/api/src/modules/workflow/workflow.controller.ts
   @Post(':proposalId/return-faculty')
   @HttpCode(HttpStatus.OK)
   @RequireRoles(UserRole.QUAN_LY_KHOA, UserRole.THU_KY_KHOA)
   async returnFacultyReview(
     @Param('proposalId') proposalId: string,
     @Body() dto: ReturnFacultyReviewDto,
     @CurrentUser() user: User,
   ) {
     // 1. Validate state is FACULTY_REVIEW
     // 2. Validate reasonCode and revisionSections (not empty)
     // 3. Update state to CHANGES_REQUESTED
     // 4. Update holder to proposal owner (giảng viên)
     // 5. Create workflow log with return_target EXPLICIT
     // 6. Return updated proposal
   }
   ```

2. **DTO Validation:**
   ```typescript
   // apps/api/src/modules/workflow/dto/return-faculty-review.dto.ts
   export enum ReturnReasonCode {
     THIEU_TAI_LIEU = 'THIEU_TAI_LIEU',
     NOI_DUNG_KHONG_RO_RANG = 'NOI_DUNG_KHONG_RO_RANG',
     PHUONG_PHAP_KHONG_KHA_THI = 'PHUONG_PHAP_KHONG_KHA_THI',
     KINH_PHI_KHONG_HOP_LE = 'KINH_PHI_KHONG_HOP_LE',
     KHAC = 'KHAC',
   }

   export class ReturnFacultyReviewDto {
     @IsEnum(ReturnReasonCode)
     @IsNotEmpty()
     reasonCode: ReturnReasonCode;

     @IsArray()
     @IsString({ each: true })
     @MinItems(1)
     revisionSections: string[];

     @IsOptional()
     @IsString()
     comment?: string;
   }
   ```

3. **Workflow Log with Return Target (CRITICAL):**
   ```typescript
   await this.workflowLogService.create({
     proposal_id: proposal.id,
     action: 'RETURN',
     from_state: 'FACULTY_REVIEW',
     to_state: 'CHANGES_REQUESTED',
     // CRITICAL: Store return target EXPLICITLY for Story 4.5 Resubmit
     return_target_state: 'FACULTY_REVIEW',      // Where to go after resubmit
     return_target_holder_unit: proposal.faculty_id, // Which faculty reviews next
     reason_code: dto.reasonCode,
     revision_sections: dto.revisionSections,
     comment: dto.comment,
     actor_id: user.id,
     actor_name: user.full_name,
   });
   ```

4. **Frontend Return Dialog Component:**
   ```typescript
   // components/workflow/ReturnDialog.tsx
   interface ReturnDialogProps {
     open: boolean;
     proposalId: string;
     onClose: () => void;
     onSuccess: () => void;
   }

   export function ReturnDialog({ open, proposalId, onClose, onSuccess }: ReturnDialogProps) {
     const [reasonCode, setReasonCode] = useState<string>('');
     const [revisionSections, setRevisionSections] = useState<string[]>([]);
     const [comment, setComment] = useState<string>('');

     const isValid = reasonCode && revisionSections.length > 0;

     const handleSubmit = async () => {
       const idempotencyKey = generateIdempotencyKey();
       await workflowApi.returnFacultyReview(proposalId, idempotencyKey, {
         reasonCode,
         revisionSections,
         comment,
       });
       onSuccess();
     };

     return (
       <Dialog open={open} onOpenChange={onClose}>
         <DialogContent>
           <DialogTitle>Yêu cầu sửa hồ sơ</DialogTitle>
           <Select value={reasonCode} onValueChange={setReasonCode}>
             <SelectTrigger><SelectValue placeholder="Chọn lý do" /></SelectTrigger>
             <SelectContent>
               <SelectItem value="THIEU_TAI_LIEU">Thiếu tài liệu</SelectItem>
               <SelectItem value="NOI_DUNG_KHONG_RO_RANG">Nội dung không rõ ràng</SelectItem>
               <SelectItem value="PHUONG_PHAP_KHONG_KHA_THI">Phương pháp không khả thi</SelectItem>
               <SelectItem value="KINH_PHI_KHONG_HOP_LE">Kinh phí không hợp lý</SelectItem>
               <SelectItem value="KHAC">Khác</SelectItem>
             </SelectContent>
           </Select>

           <div>
             <Label>Chọn phần cần sửa:</Label>
             <CheckboxGroup value={revisionSections} onChange={setRevisionSections}>
               <CheckboxItem value="SEC_INFO_GENERAL">Thông tin chung</CheckboxItem>
               <CheckboxItem value="SEC_CONTENT_METHOD">Nội dung nghiên cứu</CheckboxItem>
               <CheckboxItem value="SEC_METHOD">Phương pháp nghiên cứu</CheckboxItem>
               <CheckboxItem value="SEC_EXPECTED_RESULTS">Kết quả mong đợi</CheckboxItem>
               <CheckboxItem value="SEC_BUDGET">Kinh phí</CheckboxItem>
               <CheckboxItem value="SEC_ATTACHMENTS">Tài liệu đính kèm</CheckboxItem>
             </CheckboxGroup>
           </div>

           <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Ghi chú thêm (tùy chọn)" />

           <DialogFooter>
             <Button variant="outline" onClick={onClose}>Hủy</Button>
             <Button onClick={handleSubmit} disabled={!isValid}>Gửi</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     );
   }
   ```

5. **Frontend API Integration:**
   ```typescript
   // lib/api/workflow.ts
   returnFacultyReview: async (
     proposalId: string,
     idempotencyKey: string,
     data: {
       reasonCode: string;
       revisionSections: string[];
       comment?: string;
     },
   ): Promise<TransitionResult> => {
     const response = await apiClient.post<ReturnFacultyReviewResponse>(
       `/workflow/${proposalId}/return-faculty`,
       data,
       {
         headers: {
           'X-Idempotency-Key': idempotencyKey,
         },
       },
     );
     return response.data.data;
   },
   ```

6. **Button Conditional Rendering:**
   ```typescript
   const canReturn =
     user.roles.includes('QUAN_LY_KHOA') ||
     user.roles.includes('THU_KY_KHOA');

   {canReturn && proposal.state === 'FACULTY_REVIEW' && (
     <Button variant="destructive" onClick={() => setReturnDialogOpen(true)}>
       Yêu cầu sửa
     </Button>
   )}
   ```

### Project Structure Notes

**Files Created:**
- `qlnckh/apps/src/modules/workflow/enums/return-reason-code.enum.ts` - Return reason code enum (backend)
- `_bmad-output/implementation-artifacts/stories/4-2-faculty-return-dialog-reason-code-plus-sections.md` - Story file

**Files Modified:**
- `qlnckh/apps/src/modules/workflow/dto/transition.dto.ts` - Added ReturnFacultyReviewDto class with enum validation
- `qlnckh/apps/src/modules/workflow/workflow.controller.ts` - Added POST /:proposalId/return-faculty endpoint
- `qlnckh/apps/src/modules/workflow/workflow.service.ts` - Added returnFacultyReview method with return target storage
- `qlnckh/apps/src/modules/workflow/workflow.controller.spec.ts` - Added 8 test cases for return-faculty endpoint
- `qlnckh/web-apps/src/lib/api/workflow.ts` - Added returnFacultyReview API method, RETURN_REASON_CODES, CANONICAL_SECTIONS
- `qlnckh/web-apps/src/components/workflow/ProposalActions.tsx` - Added "Yêu cầu sửa" button and inline ReturnDialog component
- `qlnckh/web-apps/src/components/workflow/ProposalActions.spec.tsx` - Added comprehensive component tests for return dialog

**Files to Use (No Changes):**
- `qlnckh/apps/src/common/interceptors/idempotency.interceptor.ts` - Idempotency handling (Story 3.8)
- `qlnckh/apps/src/modules/workflow/workflow-log.service.ts` - Workflow log creation (Story 3.4)
- `qlnckh/apps/src/modules/workflow/state-machine.service.ts` - State transition validation (Story 3.1)

### Data Flow

**API Request:**
```http
POST /api/workflow/{id}/return-faculty
X-Idempotency-Key: {uuid}
Authorization: Bearer {token}
Content-Type: application/json

{
  "reasonCode": "NOI_DUNG_KHONG_RO_RANG",
  "revisionSections": ["SEC_CONTENT_METHOD", "SEC_METHOD"],
  "comment": "Cần chi tiết hóa phương pháp nghiên cứu"
}

Response 200:
{
  "success": true,
  "data": {
    "id": "...",
    "state": "CHANGES_REQUESTED",
    "holder_unit": "CNTT-KHOA",
    "holder_user": "user-123",
    "return_target_state": "FACULTY_REVIEW",
    "return_target_holder_unit": "CNTT-KHOA"
  }
}
```

**Error Responses:**
```http
400 Bad Request - Invalid state (not FACULTY_REVIEW)
403 Forbidden - User not QUAN_LY_KHOA/THU_KY_KHOA
409 Conflict - Duplicate idempotency key
```

### Testing Considerations

**Unit Tests:**
1. returnFacultyReview success with QUAN_LY_KHOA role
2. returnFacultyReview success with THU_KY_KHOA role
3. returnFacultyReview fails with wrong role (403)
4. returnFacultyReview fails when state != FACULTY_REVIEW (400)
5. Idempotency key rejection on duplicate (409)
6. Workflow log entry created with return_target fields
7. State transition to CHANGES_REQUESTED
8. Holder updated to proposal owner

**Component Tests:**
1. ReturnDialog renders with all fields
2. Validation: reasonCode required
3. Validation: revisionSections min 1
4. Submit button disabled when invalid
5. Submit button enabled when valid

**E2E Tests (Playwright):**
1. QUAN_LY_KHOA sees "Yêu cầu sửa" button
2. Other roles don't see return button
3. Click "Yêu cầu sửa" opens dialog
4. Select reason code + sections
5. Submit creates CHANGES_REQUESTED state
6. Return appears in workflow timeline

### References

- [epics.md Story 4.2](../../planning-artifacts/epics.md#L1201-L1238) - Full acceptance criteria
- [architecture.md Return Target](../../planning-artifacts/architecture.md#L267-L296) - Return target fields
- [architecture.md State Machine](../../planning-artifacts/architecture.md#L106-L149) - State transitions
- [Story 3.1](./3-1-16-canonical-states-plus-transitions.md) - State machine implementation
- [Story 3.3](./3-3-submit-proposal-draft-right-arrow-faculty-review.md) - State transition action pattern
- [Story 3.4](./3-4-workflow-logs-timeline-thread-view.md) - Workflow log pattern
- [Story 3.8](./3-8-idempotency-keys-anti-double-submit-all-state-changing-actions.md) - Idempotency pattern
- [Story 4.1](./4-1-faculty-approve-action.md) - Faculty action pattern (preceding story)

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None (story creation)

### Completion Notes List

Story 4.2 created via create-story workflow. Status: ready-for-dev

### File List

**Story File Created:**
- `_bmad-output/implementation-artifacts/stories/4-2-faculty-return-dialog-reason-code-plus-sections.md`

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
- 2026-01-07: Implementation complete. Backend enum added, DTO validation fixed. Status: done

## Review Follow-ups (Code Review Findings)

- [ ] [E2E Tests] Add Playwright E2E tests for return dialog flow (Task 10)
