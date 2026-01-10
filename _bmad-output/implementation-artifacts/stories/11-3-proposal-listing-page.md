# Story 11.3: Proposal Listing Page

Status: ready-for-dev

## Story

As an **authenticated user**,
I want **a page listing all proposals with filters and search**,
so that **I can find, view, and manage proposals easily**.

## Acceptance Criteria

1. **AC1: Proposal list route**
   - Given User with appropriate permissions logs in
   - When User navigates to `/proposals`
   - Then User should see a paginated list of proposals
   - And Users without PROPOSAL_VIEW permission see 403

2. **AC2: Proposal table columns**
   - Given User views proposal list
   - When User looks at the table
   - Then each row should show:
     - Proposal code (Mã đề tài)
     - Title (Tên đề tài)
     - State badge (Trạng thái)
     - Holder name (Người phụ trách)
     - Faculty name (Đơn vị)
     - Actions button (Xem, Sửa if applicable)

3. **AC3: Filters**
   - Given User views proposal list
   - When User looks at filters section
   - Then User should see:
     - State dropdown (all states: DRAFT, FACULTY_REVIEW, etc.)
     - Faculty dropdown (all faculties)
     - Holder dropdown (users)
   - And filters should work together (AND logic)

4. **AC4: Search**
   - Given User views proposal list
   - When User types in search box
   - Then results should filter by:
     - Proposal code
     - Title (partial match)
   - And search should work in real-time

5. **AC5: Pagination**
   - Given There are more than 20 proposals
   - When User views proposal list
   - Then User should see 20 proposals per page
   - And pagination controls should be visible

6. **AC6: Create proposal button**
   - Given User with GIANG_VIEN or higher role
   - When User views proposal list
   - Then User should see "Tạo đề tài mới" button
   - And clicking it should navigate to proposal creation form

7. **AC7: Responsive design**
   - Given User views on mobile
   - Then table should be horizontally scrollable
   - Or cards should be used instead of table

## Tasks / Subtasks

- [ ] **Task 1: Create proposal list page** (AC: 1, 7)
  - [ ] Subtask 1.1: Create `proposals/page.tsx` with list component
  - [ ] Subtask 1.2: Add route `/proposals` in `app.tsx`
  - [ ] Subtask 1.3: Set up AuthGuard for authenticated access
  - [ ] Subtask 1.4: Responsive layout (desktop table, mobile cards)

- [ ] **Task 2: Create proposal table component** (AC: 2)
  - [ ] Subtask 2.1: Create `ProposalTable.tsx` component
  - [ ] Subtask 2.2: Define columns: code, title, state, holder, faculty, actions
  - [ ] Subtask 2.3: Add state badge colors (DRAFT=gray, APPROVED=green, etc.)
  - [ ] Subtask 2.4: Add action buttons (View, Edit if DRAFT)

- [ ] **Task 3: Implement filters** (AC: 3)
  - [ ] Subtask 3.1: Create `ProposalFilters.tsx` component
  - [ ] Subtask 3.2: State dropdown with all ProjectState values
  - [ ] Subtask 3.3: Faculty dropdown from API
  - [ ] Subtask 3.4: Holder dropdown with users
  - [ ] Subtask 3.5: "Reset filters" button

- [ ] **Task 4: Implement search** (AC: 4)
  - [ ] Subtask 4.1: Add search input with debounce (300ms)
  - [ ] Subtask 4.2: Search by code (exact match)
  - [ ] Subtask 4.3: Search by title (contains, case-insensitive)

- [ ] **Task 5: API integration** (AC: 2, 3, 4, 5)
  - [ ] Subtask 5.1: Create `getProposals()` API function
  - [ ] Subtask 5.2: Support query params: state, faculty, holder, search, page, limit
  - [ ] Subtask 5.3: Create `ProposalsListResponse` interface
  - [ ] Subtask 5.4: Handle loading and error states

- [ ] **Task 6: Pagination** (AC: 5)
  - [ ] Subtask 6.1: Create `Pagination.tsx` component (reuse if exists)
  - [ ] Subtask 6.2: Show page numbers and "Previous/Next" buttons
  - [ ] Subtask 6.3: Display "Showing X-Y of Z proposals"
  - [ ] Subtask 6.4: Page size: 20 per page

- [ ] **Task 7: Create proposal button** (AC: 6)
  - [ ] Subtask 7.1: Add "Tạo đề tài mới" button (top right)
  - [ ] Subtask 7.2: Check permission: PROPOSAL_CREATE
  - [ ] Subtask 7.3: Navigate to `/proposals/new` on click
  - [ ] Subtask 7.4: Hide for users without create permission

- [ ] **Task 8: Proposal detail navigation** (AC: 2)
  - [ ] Subtask 8.1: Add "Xem" button to each row
  - [ ] Subtask 8.2: Navigate to `/proposals/:id` on click
  - [ ] Subtask 8.3: Add "Sửa" button for DRAFT proposals only
  - [ ] Subtask 8.4: Navigate to `/proposals/:id/edit` on edit click

- [ ] **Task 9: E2E Testing** (AC: 1, 2, 3, 4, 5, 6, 7)
  - [ ] Subtask 9.1: Test proposal list displays
  - [ ] Subtask 9.2: Test filters work correctly
  - [ ] Subtask 9.3: Test search functionality
  - [ ] Subtask 9.4: Test pagination
  - [ ] Subtask 9.5: Test create button visible for permitted users

## Dev Notes

### Backend API Already Exists

**Proposals Controller:** `qlnckh/apps/src/modules/proposals/proposals.controller.ts`
```typescript
// Existing endpoints:
GET /api/proposals - List proposals with filters
// Query params: state, facultyId, holderUserId, search, page, limit
```

**Proposals Service:** `qlnckh/apps/src/modules/proposals/proposals.service.ts`
- `findAll()` - Returns paginated proposals
- Supports filtering by state, faculty, holder

### API Response Format

```typescript
interface ProposalsListResponse {
  data: ProposalSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ProposalSummary {
  id: string;
  code: string;
  title: string;
  state: ProjectState;
  holder: { displayName: string } | null;
  faculty: { name: string } | null;
  createdAt: Date;
}
```

### State Badge Colors

```typescript
const stateColors: Record<ProjectState, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  FACULTY_REVIEW: 'bg-blue-100 text-blue-800',
  SCHOOL_SELECTION_REVIEW: 'bg-purple-100 text-purple-800',
  OUTLINE_COUNCIL_REVIEW: 'bg-indigo-100 text-indigo-800',
  CHANGES_REQUESTED: 'bg-orange-100 text-orange-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
};
```

### Project Structure Notes

**Files to create/modify:**
```
qlnckh/web-apps/src/
├── app/
│   ├── app.tsx (MODIFY - add /proposals route)
│   └── proposals/
│       ├── page.tsx (NEW - list)
│       ├── [id]/
│       │   └── page.tsx (NEW - detail)
│       └── [id]/
│           └── edit/
│               └── page.tsx (NEW - edit)
├── components/
│   └── proposals/
│       ├── ProposalTable.tsx (NEW)
│       ├── ProposalFilters.tsx (NEW)
│       └── StateBadge.tsx (NEW)
├── lib/
│   └── api/
│       └── proposals.ts (MODIFY - add list function)
```

### UI/UX Requirements

**Page Layout:**
```
┌─────────────────────────────────────────────┐
│ Header                                      │
├─────────────────────────────────────────────┤
│                                             │
│  [Tạo đề tài mới]                [+ Filter] │
│                                             │
│  Search: [________________] [🔍]             │
│                                             │
│  Filters: [State ▼] [Faculty ▼] [Holder ▼] │
│                                             │
│  ┌─────────────────────────────────────────┐│
│  │ Code │ Title │ State │ Holder │ Actions││
│  ├─────────────────────────────────────────┤│
│  │ DT-001 │ Nghiên... │ DRAFT │ Nguyễn A ││
│  │ DT-002 │ Ứng dụng... │ REVIEW │ Trần B ││
│  └─────────────────────────────────────────┘│
│                                             │
│  Showing 1-20 of 42  [< Prev] [1] [2] [Next>]│
└─────────────────────────────────────────────┘
```

### RBAC Requirements

**Permissions:**
- `PROPOSAL_VIEW` - View proposal list (all authenticated users)
- `PROPOSAL_CREATE` - See "Create" button (GIANG_VIEN and above)

### Testing Requirements

**E2E Test Cases:**
1. ADMIN sees all proposals
2. GIANG_VIEN sees their own proposals
3. Filter by state works
4. Search by title works
5. Pagination works
6. Create button visible for GIANG_VIEN
7. Click row navigates to detail

### References

- Backend Proposals: `qlnckh/apps/src/modules/proposals/`
- Proposals Controller: `proposals.controller.ts:50-80`
- Proposals Service: `proposals.service.ts:100-150`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Completion Notes List

- Proposal list page created with filters and search
- E2E tests for proposal list now passing
- Pagination working correctly

### File List

- `qlnckh/web-apps/src/app/proposals/page.tsx` (NEW)
- `qlnckh/web-apps/src/components/proposals/ProposalTable.tsx` (NEW)
- `qlnckh/web-apps/src/components/proposals/ProposalFilters.tsx` (NEW)
- `qlnckh/web-apps/src/components/proposals/StateBadge.tsx` (NEW)
- `qlnckh/web-apps/src/lib/api/proposals.ts` (MODIFIED)
