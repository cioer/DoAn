# Story 11.2: Dashboard with KPI Metrics

Status: ready-for-dev

## Story

As a **PHONG_KHCN or ADMIN user**,
I want **a dashboard showing KPI metrics and proposal statistics**,
so that **I can quickly understand the current state of all proposals and identify issues**.

## Acceptance Criteria

1. **AC1: Dashboard route and access control**
   - Given User with PHONG_KHCN or ADMIN role logs in
   - When User navigates to `/dashboard`
   - Then User should see the dashboard with KPI metrics
   - And Users without permission should see 403 page

2. **AC2: KPI cards display**
   - Given User is on dashboard
   - When User views the KPI section
   - Then User should see 4 KPI cards:
     - Total proposals (Tổng số đề tài)
     - Waiting review (Đang chờ duyệt)
     - Overdue (Quá hạn SLA)
     - Completed (Hoàn thành)

3. **AC3: Data from API**
   - Given Dashboard loads
   - When KPI data is fetched
   - Then data should come from `GET /api/dashboard/metrics` API
   - And data should be real-time from database

4. **AC4: Overdue proposals list**
   - Given User views dashboard
   - When User scrolls to overdue section
   - Then User should see list of overdue proposals
   - Each item shows: code, title, overdue days, holder

5. **AC5: Responsive design**
   - Given User views dashboard on mobile
   - Then KPI cards should stack vertically
   - And table should be horizontally scrollable

## Tasks / Subtasks

- [ ] **Task 1: Create dashboard page component** (AC: 1, 5)
  - [ ] Subtask 1.1: Create `Dashboard.tsx` in `src/app/dashboard/page.tsx`
  - [ ] Subtask 1.2: Set up route `/dashboard` in `app.tsx`
  - [ ] Subtask 1.3: Add PermissionGuard for DASHBOARD_VIEW permission
  - [ ] Subtask 1.4: Create responsive layout with KPI grid

- [ ] **Task 2: Create KPI card component** (AC: 2, 5)
  - [ ] Subtask 2.1: Create `KpiCard.tsx` component
  - [ ] Subtask 2.2: Props: title, value, icon, color, trend
  - [ ] Subtask 2.3: Style with Tailwind CSS (card layout, shadows)
  - [ ] Subtask 2.4: Responsive: 1 column mobile, 2 tablet, 4 desktop

- [ ] **Task 3: Implement metrics API integration** (AC: 3)
  - [ ] Subtask 3.1: Add `getMetrics()` function to `api/dashboard.ts`
  - [ ] Subtask 3.2: Create type `DashboardMetrics` interface
  - [ ] Subtask 3.3: Fetch metrics on component mount
  - [ ] Subtask 3.4: Handle loading and error states

- [ ] **Task 4: Create overdue proposals table** (AC: 4)
  - [ ] Subtask 4.1: Create `OverdueTable.tsx` component
  - [ ] Subtask 4.2: Columns: code, title, holder, overdue days, actions
  - [ ] Subtask 4.3: Add "Remind" button for each overdue proposal
  - [ ] Subtask 4.4: Pagination for large lists

- [ ] **Task 5: Add visual polish** (AC: 2, 5)
  - [ ] Subtask 5.1: Add icons for each KPI card (use heroicons or lucide-react)
  - [ ] Subtask 5.2: Color code KPIs (green=good, yellow=warning, red=danger)
  - [ ] Subtask 5.3: Add hover effects on cards
  - [ ] Subtask 5.4: Add skeleton loaders during data fetch

- [ ] **Task 6: E2E Testing** (AC: 1, 2, 3, 4, 5)
  - [ ] Subtask 6.1: Create `e2e-dashboard.js` test file
  - [ ] Subtask 6.2: Test dashboard accessible for ADMIN/PHONG_KHCN
  - [ ] Subtask 6.3: Test 403 for other roles
  - [ ] Subtask 6.4: Test KPI cards display correct values
  - [ ] Subtask 6.5: Test responsive on mobile viewport

## Dev Notes

### Backend API Already Exists

**Dashboard Controller:** `qlnckh/apps/src/modules/dashboard/dashboard.controller.ts`
```typescript
// Existing endpoints:
GET /api/dashboard/metrics - Returns KPI data
GET /api/dashboard/health - System health (PHONG_KHCN, ADMIN only)
GET /api/dashboard/overdue - Overdue proposals list
```

**Dashboard Service:** `qlnckh/apps/src/modules/dashboard/dashboard.service.ts`
- `getMetrics()` - Returns KPI counts
- `getOverdueProposals()` - Returns overdue proposals list

### API Response Format

```typescript
interface DashboardMetrics {
  totalProposals: number;
  waitingReview: number;
  overdue: number;
  completed: number;
}

interface OverdueProposal {
  id: string;
  code: string;
  title: string;
  holder: { displayName: string };
  overdueDays: number;
  slaDeadline: Date;
}
```

### Project Structure Notes

**Files to create/modify:**
```
qlnckh/web-apps/src/
├── app/
│   ├── app.tsx (MODIFY - add /dashboard route)
│   └── dashboard/
│       └── page.tsx (NEW)
├── components/
│   └── dashboard/
│       ├── KpiCard.tsx (NEW)
│       └── OverdueTable.tsx (NEW)
├── lib/
│   └── api/
│       └── dashboard.ts (NEW or extend existing)
```

### UI/UX Requirements

**KPI Card Design:**
```tsx
<div className="bg-white rounded-lg shadow p-6">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-gray-500 text-sm">Tổng số đề tài</p>
      <p className="text-3xl font-bold">42</p>
    </div>
    <div className="bg-blue-100 p-3 rounded-full">
      <DocumentIcon className="h-6 w-6 text-blue-600" />
    </div>
  </div>
</div>
```

**Dashboard Layout:**
```
┌─────────────────────────────────────────────┐
│ Header (logo, user info, logout)            │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │ KPI 1│ │ KPI 2│ │ KPI 3│ │ KPI 4│      │
│  └──────┘ └──────┘ └──────┘ └──────┘      │
│                                             │
│  Overdue Proposals Table                    │
│  ┌───────────────────────────────────────┐ │
│  │ Code │ Title │ Holder │ Overdue │Act│ │
│  ├───────────────────────────────────────┤ │
│  │ ...                                    │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### RBAC Requirements

**Permission to add:**
```typescript
// In permissions enum
DASHBOARD_VIEW = 'DASHBOARD_VIEW'
```

**Roles with access:**
- `PHONG_KHCN` - Can view all metrics
- `ADMIN` - Can view all metrics

### Testing Requirements

**E2E Test Cases:**
1. ADMIN can access `/dashboard` - sees KPI cards
2. PHONG_KHCN can access `/dashboard` - sees KPI cards
3. GIANG_VIEN redirected to 403 on `/dashboard`
4. KPI values match backend data
5. Overdue list shows correct proposals

### References

- Backend Dashboard: `qlnckh/apps/src/modules/dashboard/`
- Backend Routes: `dashboard.controller.ts:20-40`
- Health Service: `qlnckh/apps/src/modules/dashboard/health.service.ts`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Completion Notes List

- Dashboard page created with KPI metrics
- E2E tests for dashboard now passing
- Overdue proposals list functional

### File List

- `qlnckh/web-apps/src/app/dashboard/page.tsx` (NEW)
- `qlnckh/web-apps/src/components/dashboard/KpiCard.tsx` (NEW)
- `qlnckh/web-apps/src/components/dashboard/OverdueTable.tsx` (NEW)
- `qlnckh/web-apps/src/lib/api/dashboard.ts` (NEW)
- `qlnckh/web-apps/src/app/app.tsx` (MODIFIED)
