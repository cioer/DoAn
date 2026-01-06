# Story 4.4: Revision Panel (Checkbox "Đã sửa" MVP)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Giảng viên,
I want see panel hiển thị các sections cần sửa,
So that tôi biết phải sửa gì.

## Acceptance Criteria

1. **AC1: Revision Panel Displays at Top of Form**
   - Given Proposal state = CHANGES_REQUESTED
   - When Giảng viên opens proposal form
   - Then UI displays Revision Panel at top of form
   - And Panel shows "Cần sửa các phần:" header
   - And Panel lists sections needing revision with checkboxes

2. **AC2: Section Items with "Đã sửa" Checkboxes**
   - Given Revision Panel is displayed
   - When showing each section needing revision
   - Then Each section item shows:
     - Checkbox (☐ unticked / ☑ ticked)
     - Section label (e.g., "Phương pháp nghiên cứu")
     - "[Đã sửa]" button/link next to checkbox
     - Return reason comment for that section (if any)

3. **AC3: Click Section Label Scrolls and Highlights**
   - Given Revision Panel displays sections
   - When Giảng viên clicks section label
   - Then UI scrolls to that section in form (anchor link)
   - And Section is visually highlighted (border/glow effect)

4. **AC4: Checkbox State Persisted**
   - Given Giảng viên clicks checkbox "Đã sửa"
   - When checkbox is ticked
   - Then state is saved (to validate resubmit)
   - And Checkbox remains ticked on page reload

5. **AC5: "Nộp lại" Button Enabled/Disabled**
   - Given Revision Panel displays
   - When NO checkbox is ticked
   - Then "Nộp lại" button is disabled
   - When ≥ 1 checkbox is ticked
   - Then "Nộp lại" button is enabled

6. **AC6: Warning Message About History Preservation**
   - Given Revision Panel is displayed
   - When Panel renders
   - Then Show warning: "⚠️ Nộp lại sẽ giữ nguyên lịch sử; không quay về DRAFT."

## Tasks / Subtasks

- [ ] Task 1: Revision Panel Component Structure (AC: #1)
  - [ ] Create `RevisionPanel` component
  - [ ] Position at top of proposal form
  - [ ] Conditionally render when proposal.state = CHANGES_REQUESTED
  - [ ] Header: "Cần sửa các phần:"

- [ ] Task 2: Section Items with Checkboxes (AC: #2)
  - [ ] Fetch latest RETURN log from workflowApi.getLatestReturn()
  - [ ] Parse revisionSections from log comment JSON
  - [ ] Map section IDs to labels (CANONICAL_SECTIONS)
  - [ ] Render checkbox + label + "[Đã sửa]" button for each section

- [ ] Task 3: Click to Scroll and Highlight (AC: #3)
  - [ ] Add click handler to section labels
  - [ ] Implement smooth scroll to section (element.scrollIntoView)
  - [ ] Add temporary highlight class (border/glow) to section
  - [ ] Remove highlight after 2 seconds

- [ ] Task 4: Checkbox State Persistence (AC: #4)
  - [ ] Add useState for checked section IDs
  - [ ] Save to localStorage when checkbox changes
  - [ ] Load from localStorage on mount
  - [ ] Clear localStorage when proposal state != CHANGES_REQUESTED

- [ ] Task 5: Resubmit Button Integration (AC: #5)
  - [ ] Pass checkedSections state to parent (or callback)
  - [ ] Disable "Nộp lại" button when checkedSections.length === 0
  - [ ] Enable when checkedSections.length >= 1
  - [ ] Note: Actual resubmit action is Story 4.5

- [ ] Task 6: Warning Message (AC: #6)
  - [ ] Display warning at bottom of panel
  - [ ] Icon: ⚠️ (AlertTriangle or Warning)
  - [ ] Text: "Nộp lại sẽ giữ nguyên lịch sử; không quay về DRAFT."

- [ ] Task 7: Unit Tests (AC: #1, #2, #3, #4, #5, #6)
  - [ ] Test panel renders when state = CHANGES_REQUESTED
  - [ ] Test panel hidden for other states
  - [ ] Test sections displayed from return log
  - [ ] Test checkbox state persisted to localStorage
  - [ ] Test resubmit button disabled/enabled based on checkboxes

- [ ] Task 8: Component Tests
  - [ ] Test RevisionPanel renders with all sections
  - [ ] Test click section label scrolls to element
  - [ ] Test checkbox toggle updates state
  - [ ] Test localStorage integration

## Dev Notes

### Architecture References

**State Machine (Epic 4):**
```
FACULTY_REVIEW → [Faculty Return] → CHANGES_REQUESTED
                                      ↓ [Resubmit with checkboxes]
                                    FACULTY_REVIEW (return_target_state)
```

**Component Hierarchy:**
```
ProposalForm (or ProposalDetail)
└── RevisionPanel (when state = CHANGES_REQUESTED)
    ├── SectionItem[] (from revisionSections)
    │   ├── Checkbox
    │   ├── Section Label (clickable)
    │   └── "[Đã sửa]" Button
    └── Warning Message
```

**Data Flow:**
1. Fetch latest RETURN log: `workflowApi.getLatestReturn(proposalId)`
2. Parse revisionSections from comment JSON
3. Map to CANONICAL_SECTIONS for labels
4. Store checkbox state in localStorage (key: `revision-${proposalId}`)
5. Pass checkedSections to parent for resubmit validation

### Previous Story Intelligence

**Story 4.2 (Faculty Return Dialog)** already created:
- `CANONICAL_SECTIONS` array with section IDs and labels
- `RETURN_REASON_LABELS` for reason display
- revisionSections stored in workflow log comment as JSON

**Story 4.3 (Changes Requested Banner)** already created:
- `workflowApi.getLatestReturn()` method
- `WorkflowLog` interface

**Story 4.4 builds on these** - uses same data structures and API.

### Project Structure Notes

**Files to Create:**
- `qlnckh/web-apps/src/components/workflow/RevisionPanel.tsx` - Revision panel component
- `qlnckh/web-apps/src/components/workflow/RevisionPanel.spec.tsx` - Component tests

**Files to Modify:**
- `qlnckh/web-apps/src/components/workflow/ChangesRequestedBanner.tsx` - May integrate with banner
- `qlnckh/web-apps/src/components/proposals/proposal-form.tsx` - Add RevisionPanel to form (or equivalent)

**Files to Use (No Changes):**
- `qlnckh/web-apps/src/lib/api/workflow.ts` - getLatestReturn() method (Story 4.3)
- `qlnckh/web-apps/src/lib/api/workflow.ts` - CANONICAL_SECTIONS constant (Story 4.2)

### Data Structures

**Workflow Log Comment Format (Story 4.2):**
```typescript
{
  "reason": "Thiếu tài liệu",
  "revisionSections": ["SEC_METHOD", "SEC_BUDGET"]
}
```

**localStorage Key Format:**
```
revision-${proposalId}: ["SEC_METHOD", "SEC_BUDGET"]
```

**Section Item Props:**
```typescript
interface SectionItemProps {
  sectionId: string;
  sectionLabel: string;
  isChecked: boolean;
  onToggle: (sectionId: string) => void;
  onScrollToSection: (sectionId: string) => void;
}
```

### UI Specification

**Revision Panel Layout:**
```
┌─────────────────────────────────────────────────┐
│ Cần sửa các phần:                                │
│                                                 │
│ ☐ Phương pháp nghiên cứu    [Đã sửa]          │
│    "Cần chi tiết hóa phương pháp..."              │
│                                                 │
│ ☐ Kinh phí                   [Đã sửa]          │
│    "Chưa giải ngân giai đoạn 1"                   │
│                                                 │
│ ⚠️ Nộp lại sẽ giữ nguyên lịch sử;                 │
│    không quay về DRAFT.                          │
└─────────────────────────────────────────────────┘
```

**Styling:**
- Container: White background, border, rounded corners
- Header: Bold, larger font
- Section items: Flex row, clickable label
- Checkboxes: Standard checkbox styling
- Warning: Yellow/amber background, warning icon

### Testing Considerations

**Unit Tests:**
1. Panel renders when state = CHANGES_REQUESTED
2. Panel hidden for other states
3. Sections displayed from return log
4. Empty sections handled gracefully
5. Checkbox toggle updates state
6. localStorage saves/loads correctly
7. localStorage cleared when state changes

**Component Tests:**
1. All sections render with correct labels
2. Click section label calls scroll handler
3. Checkbox state updates correctly
4. Warning message displays

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None (story creation)

### Completion Notes List

Story 4.4 created via create-story workflow. Status: ready-for-dev

### File List

**Story File Created:**
- `_bmad-output/implementation-artifacts/stories/4-4-revision-panel-checkbox-da-sua-mvp.md`

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev

## References

- [epics.md Story 4.4](../../planning-artifacts/epics.md#L1274-L1316) - Full acceptance criteria
- [Story 4.2](./4-2-faculty-return-dialog-reason-code-plus-sections.md) - Faculty return implementation
- [Story 4.3](./4-3-execute-return-changes-requested-plus-return-target.md) - Changes requested banner
