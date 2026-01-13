---
title: 'Cải thiện Permissions và Role cho Quản lý Khoa'
slug: 'quan-ly-khoa-permissions'
created: '2025-01-12'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 2.1, 3, 4]  # 2.1 = Party Mode, 3 = Generate, 4 = Review complete
tech_stack: ['NestJS', 'Prisma', 'React', 'TypeScript', 'Playwright', 'Jest', 'NestJS RBAC']
files_to_modify: [
  'apps/src/modules/rbac/permissions.enum.ts',
  'apps/src/seeds/role-permissions.seed.ts',
  'apps/src/modules/workflow/workflow.controller.ts',
  'apps/src/modules/proposals/services/proposals-crud.service.ts',
  'apps/src/modules/proposals/proposals.controller.ts',
  'apps/src/modules/dashboard/dashboard.service.ts',
  'apps/src/modules/dashboard/dashboard.controller.ts',
  'apps/src/modules/dashboard/dto/faculty-dashboard.dto.ts',  # CREATE
  'apps/src/modules/users/users.service.ts',
  'apps/src/modules/users/users.controller.ts',
  'apps/src/modules/proposals/services/proposals-crud.service.spec.ts',  # Tests
  'apps/src/modules/workflow/workflow.controller.spec.ts',  # Tests
  'apps/src/modules/users/users.service.spec.ts',  # Tests
  'web-apps-e2e/src/faculty-isolation.e2e.spec.ts',  # CREATE - Tests
  'web-apps/src/shared/types/permissions.ts',  # Frontend enum
  'web-apps/src/app/app.tsx',
  'web-apps/src/components/layout/Header.tsx',
  'web-apps/src/app/dashboard/faculty/page.tsx',  # CREATE
  'web-apps/src/app/dashboard/faculty/users/page.tsx',  # CREATE
]
code_patterns: [
  '@RequireRoles() decorator',
  '@RequirePermissions() decorator',
  'Faculty-based query filtering',
  'Prisma where clause with facultyId',
  'RBAC helper functions',
  'Permission-based service access (refactor pattern)',
]
test_patterns: [
  'Manual Prisma service mocks',
  'Playwright E2E for permissions',
  'Permission validation unit tests',
  'Faculty isolation tests',
]
---

# Tech-Spec: Cải thiện Permissions và Role cho Quản lý Khoa

**Created:** 2025-01-12
**Updated:** 2025-01-12 (Fifth Adversarial Review - 68 findings reviewed, 31 valid fixes applied)

## Overview

### Problem Statement

QUAN_LY_KHOA hiện chỉ có 1 permission (`DEMO_SWITCH_PERSONA`) nhưng được truy cập nhiều workflow endpoints thông qua `@RequireRoles()` decorator. Điều này dẫn đến:

1. **Mất tính bảo mật:** Không có permission-based access control, chỉ có role-based
2. **Không có isolation theo khoa:** QUAN_LY_KHOA có thể xem/tác động trên đề tài của tất cả các khoa
3. **Thiếu UI:** Không có dashboard riêng cho Quản lý Khoa
4. **Thiếu quyền quản lý user:** QUAN_LY_KHOA không thể tạo/sửa user trong khoa mình

### Solution

1. **Thêm permissions mới** cho QUAN_LY_KHOA: `FACULTY_APPROVE`, `FACULTY_RETURN`, `PROPOSAL_VIEW_FACULTY`, `FACULTY_DASHBOARD_VIEW`, `FACULTY_USER_MANAGE`
   - Note: Removed `FACULTY_ACCEPTANCE` - no corresponding workflow action exists for QUAN_LY_KHOA (school acceptance is BAN_GIAM_HOC only)

2. **Implement faculty isolation:** Filter tất cả proposal queries theo `facultyId` của user QUAN_LY_KHOA

3. **Tạo Faculty Dashboard:** Dashboard riêng với KPI khoa, danh sách đề tài chờ duyệt

4. **Thêm Faculty User Management:** QUAN_LY_KHOA có thể tạo/edit user thuộc khoa mình

### Scope

**In Scope:**
- Thêm 5 permissions mới vào enum Permission
- Update role-permissions seed mapping cho QUAN_LY_KHOA
- Add `@RequirePermissions()` decorators vào workflow endpoints
- Filter proposals theo facultyId cho QUAN_LY_KHOA
- Tạo Faculty Dashboard component (backend + frontend)
- Tạo Faculty User Management API và UI
- Refactor dashboard service sang permission-based access (DEBT MITIGATION)
- Update tests

**Out of Scope:**
- Báo cáo thống kê cho khoa
- Thay đổi workflow logic (chỉ thêm permissions)
- Thay đổi role khác (GIANG_VIEN, PHONG_KHCN, etc.)

## Context for Development

### Codebase Patterns

**1. RBAC Pattern (Backend):**
```typescript
// Use BOTH decorators for defense in depth
@RequireRoles(UserRole.QUAN_LY_KHOA)
@RequirePermissions(Permission.FACULTY_APPROVE)
async approveFaculty(@Param('id') id: string) {
  // implementation
}
```

**2. Faculty Filter Pattern (Existing in proposals-query.service.ts):**
```typescript
// Existing pattern - LINE 18-81
async getByFaculty(facultyId: string, filters: ProposalFilterDto) {
  const where: any = { facultyId };
  // ... apply additional filters
  return this.prisma.proposal.findMany({ where, include });
}
```

**3. Permission Check Pattern (Frontend):**
```typescript
// From lib/rbac/permissions.ts
import { hasPermission, hasRole } from '@/lib/rbac/permissions';
// NOTE: hasRole() checks if user.role equals the given role

const canView = hasPermission(user, Permission.FACULTY_DASHBOARD_VIEW);
const isFacultyManager = hasRole(user, UserRole.QUAN_LY_KHOA);
```

**4. RBAC Architecture (CRITICAL - Understanding):**
```typescript
// JWT TOKEN contains: { sub, email, role, facultyId, actingAs }
// NO permissions array in JWT - permissions fetched from DATABASE via role

// PermissionsGuard (guards/permissions.guard.ts) calls:
await this.rbacService.hasAllPermissions(user.role, requiredPermissions);
// This queries DATABASE (role-permissions table), NOT JWT

// Login Response (TokenResponseUser) includes permissions array
// Frontend authStore stores permissions from LOGIN RESPONSE
// Frontend can use: hasPermission(user, Permission.XXX)

// SERVICE LAYER: Don't check permissions directly - use Guards
// EXCEPTION: When business logic requires dynamic permission checks
// (e.g., checking ownership AFTER guard passes), inject RbacService:
if (!(await this.rbacService.hasPermission(user.role, Permission.XXX))) {
  throw new ForbiddenException();
}
// EXAMPLE: Task 15 ownership validation - guard ensures USER_MANAGE permission,
// service layer validates faculty ownership
```

**5. Dashboard Service Pattern (CURRENT - NEEDS REFACTOR):**
```typescript
// CURRENT at dashboard.service.ts LINE 256-267 - ROLE-BASED (BAD PATTERN)
validateDashboardPermission(userRole: string): void {
  const allowedRoles = ['PHONG_KHCN', 'ADMIN'];
  if (!allowedRoles.includes(userRole)) {
    throw new BadRequestException(...);
  }
}

// REFACTOR TO - Use RbacService for permission check
// Inject RbacService into dashboard service constructor
private constructor(
  private prisma: PrismaService,
  private rbacService: RbacService,  // ADD THIS
) {}

async validateDashboardPermission(user: RequestUser): Promise<void> {
  const hasPermission = await this.rbacService.hasPermission(
    user.role,
    Permission.DASHBOARD_VIEW
  );
  if (!hasPermission) {
    throw new ForbiddenException('Insufficient permissions');
  }
}
```

### Files to Reference

| File | Purpose | Key Points |
| ---- | ------- | ----------|
| `prisma/schema.prisma` | User model verification | `facultyId String?` at line 54 - nullable, with index at line 71. **VERIFY:** Line numbers may change with schema updates.
| `apps/src/modules/rbac/permissions.enum.ts` | **MODIFY** - Add new permissions | Add 5 new permissions (FACULTY_APPROVE, FACULTY_RETURN, PROPOSAL_VIEW_FACULTY, FACULTY_DASHBOARD_VIEW, FACULTY_USER_MANAGE) |
| `apps/src/seeds/role-permissions.seed.ts` | **MODIFY** - Update mapping | Update QUAN_LY_KHOA permissions array |
| `apps/src/modules/workflow/workflow.controller.ts` | **MODIFY** - Add @RequirePermissions | Lines 452, 608 for approve-faculty, return-faculty |
| `apps/src/modules/proposals/services/proposals-crud.service.ts` | **MODIFY** - Add role-based filtering | `findAll()` accepts `facultyId` param but needs auto-filter for QUAN_LY_KHOA |
| `apps/src/modules/proposals/proposals.controller.ts` | **MODIFY** - Add faculty filtering | Inject @CurrentUser() at line 184, pass to service |
| `apps/src/modules/dashboard/dashboard.service.ts` | **REFACTOR** - Permission-based access | `validateDashboardPermission()` at lines 256-267 uses role array |
| `apps/src/modules/dashboard/dashboard.controller.ts` | **MODIFY** - Add faculty endpoint | Add GET /api/dashboard/faculty route |
| `apps/src/modules/dashboard/dto/faculty-dashboard.dto.ts` | **CREATE** - Faculty DTOs | See Task 9 for field specifications |
| `apps/src/modules/users/users.service.ts` | **MODIFY** - Add faculty user mgmt | Create new ownership validation method |
| `apps/src/modules/users/users.controller.ts` | **MODIFY** - Add role-based filtering | Filter by faculty in existing POST/PATCH routes |
| `apps/src/modules/rbac/rbac.service.ts` | **REFERENCE** - Permission checking | `hasPermission(role, permission)` - database lookup |
| `apps/src/modules/rbac/guards/permissions.guard.ts` | **REFERENCE** - Guard pattern | Calls `rbacService.hasAllPermissions(user.role, permissions)` |
| `apps/src/modules/auth/interfaces/jwt-payload.interface.ts` | **REFERENCE** - JWT structure | JwtPayload has NO permissions (line 4-12). TokenResponseUser has permissions (line 14-21) |
| `apps/src/common/decorators/permissions.decorator.ts` | **REFERENCE** - Decorator pattern | `@RequirePermissions()` already used in other controllers |
| `web-apps/src/shared/types/permissions.ts` | **MODIFY** - Frontend enum | MUST mirror backend permissions.enum.ts exactly |
| `web-apps/src/app/dashboard/page.tsx` | **REFERENCE** - Dashboard pattern | Use existing components |
| `web-apps/src/app/dashboard/faculty/page.tsx` | **CREATE** - New faculty dashboard | KPI cards + proposal list |
| `web-apps/src/lib/rbac/permissions.ts` | **REFERENCE** - Permission helpers | `hasPermission()`, `hasRole()` |
| `web-apps-e2e/src/giang-vien-permissions.e2e.spec.ts` | **REFERENCE** - E2E pattern | Playwright permission tests |

### Technical Decisions

1. **Permission + Role Defense:** Sử dụng cả `@RequireRoles()` VÀ `@RequirePermissions()` cho defense in depth

2. **FacultyId from User:** User model có `facultyId` field (nullable) - cần handle null case

3. **RequestUser Interface Note:** Multiple RequestUser interfaces exist across codebase (proposals.controller.ts line 54-59, auth module interfaces). Use the proposals.controller.ts version as reference - includes `id, email, displayName?, role, facultyId: string | null`. When creating new interfaces, mirror this structure.

4. **Dashboard Route:** `/dashboard/faculty` - chỉ accessible bởi QUAN_LY_KHOA với `FACULTY_DASHBOARD_VIEW` permission

5. **User Management Scope:** QUAN_LY_KHOA chỉ tạo/edit user với:
   - `role` ∈ {GIANG_VIEN, QUAN_LY_KHOA, THU_KY_KHOA}
   - `facultyId` = chính facultyId của user đang login
   - KHÔNG được thay đổi `facultyId` khi edit

6. **Faculty Isolation Enforcement:**
   - Backend: Tất cả proposal queries filter theo facultyId
   - Frontend: Ẩn/hiện UI dựa trên permission

7. **Nullable FacultyId Handling:**
   - Nếu QUAN_LY_KHOA không có facultyId → return error
   - Dashboard kiểm tra facultyId trước khi query

8. **DEBT MITIGATION (Party Mode Added):**
   - Refactor dashboard service from role-based to permission-based
   - Create scoped query methods instead of universal `getDashboardData()`
   - Add ownership validation in user management

## Implementation Plan

### Tasks

**Phase 1: Permissions & RBAC (Backend + Frontend)**

1. **Add new permissions to backend enum**
   - File: `apps/src/modules/rbac/permissions.enum.ts`
   - Add: `FACULTY_APPROVE`, `FACULTY_RETURN`, `PROPOSAL_VIEW_FACULTY`, `FACULTY_DASHBOARD_VIEW`, `FACULTY_USER_MANAGE` (5 permissions)
   - **PERMISSION USAGE:**
     - `FACULTY_APPROVE`: approve-faculty workflow endpoint
     - `FACULTY_RETURN`: return-faculty workflow endpoint
     - `PROPOSAL_VIEW_FACULTY`: Used in PROPOSAL LIST filtering - allows QUAN_LY_KHOA to view proposals from their faculty (enforced in Task 6)
     - `FACULTY_DASHBOARD_VIEW`: Faculty dashboard access
     - `FACULTY_USER_MANAGE`: User creation/editing for faculty members

2. **Add new permissions to frontend enum**
   - File: `web-apps/src/shared/types/permissions.ts`
   - Add SAME 5 permissions - MUST mirror backend exactly
   - **CRITICAL:** Frontend will break if enums don't match

3. **Update role-permissions seed**
   - File: `apps/src/seeds/role-permissions.seed.ts`
   - Update QUAN_LY_KHOA array with 5 new permissions

4. **Add @RequirePermissions to workflow endpoints**
   - File: `apps/src/modules/workflow/workflow.controller.ts`
   - Add `@RequirePermissions(Permission.FACULTY_APPROVE)` to `approve-faculty()` (line 452)
   - Add `@RequirePermissions(Permission.FACULTY_RETURN)` to `return-faculty()` (line 608, `@RequireRoles` decorator)
   - **Note:** `@Post(':proposalId/return-faculty')` is at line 606, `@RequireRoles` at line 608

5. **Run seed script**
   - Execute: `npm run seed:role-permissions` OR `npx jiti apps/src/seeds/role-permissions.seed.ts`
   - **DEPLOYMENT NOTE:** Existing QUAN_LY_KHOA users must LOG OUT and LOG IN to receive new permissions in authStore

**Phase 2: Faculty Isolation (Backend)**

6. **Add role-based filtering to proposals-crud service**
   - File: `apps/src/modules/proposals/services/proposals-crud.service.ts`
   - Modify: `findAll()` at line 131 to accept optional `user?: RequestUser` parameter
   - When user?.role === QUAN_LY_KHOA and user?.facultyId exists: auto-filter by facultyId
   - **BREAKING CHANGE WARNING:** Existing API consumers will see different results
   - **BEHAVIOR:** Explicit facultyId query param OR user's faculty (for QUAN_LY_KHOA). If mismatch, throw error.
   - **ERROR RESPONSE:** When QUAN_LY_KHOA passes facultyId != user.facultyId, return `403 Forbidden` with `{ "message": "Cannot access proposals outside your faculty", "statusCode": 403 }`
   - **BUG FIX:** Current `findAll()` accepts `facultyId` param but doesn't auto-filter based on user role
   - **VALIDATION LOCATION:** Validation occurs in SERVICE layer (proposals-crud.service.ts), NOT guard - guards handle role/permission, service handles business logic
   - **AFFECTED CALLERS TO UPDATE:** proposals.controller.ts (findAll endpoint), workflow.controller.ts (if it uses proposalsService.findAll), dashboard.service.ts (getDashboardData), any tests using findAll

7. **Update proposals controller to pass user context**
   - File: `apps/src/modules/proposals/proposals.controller.ts`
   - **CURRENT STATE:** `findAll()` method at line ~184 with `@Query()` decorators only
   - **MODIFY:** Add `@CurrentUser() user: RequestUser` as FIRST parameter (before @Query decorators)
   - **IMPORTANT:** @CurrentUser decorator is at `apps/src/common/decorators/current-user.decorator.ts` - returns full user object with facultyId
   - **FINAL SIGNATURE:** `async findAll(@CurrentUser() user: RequestUser, @Query() filters: ProposalFilterDto)`
   - Pass `user` to `proposalsService.findAll({ ...filters, user })`

**Phase 2A: Debt Mitigation (Dashboard Refactor)**

8. **Refactor dashboard service to permission-based**
   - File: `apps/src/modules/dashboard/dashboard.service.ts`
   - **ADD IMPORT:** `import { RbacService } from '../rbac/rbac.service';` at top of file
   - **ADD:** Inject `RbacService` into constructor
   - **MODIFY:** `validateDashboardPermission()` at lines 256-267 to be async and use `rbacService.hasPermission()`
   - **SPLIT:** Declare `getFacultyDashboardData(facultyId: string)` method signature here (implementation in Task 10 after DTOs are created)

9. **Create faculty dashboard DTOs**
   - File: `apps/src/modules/dashboard/dto/faculty-dashboard.dto.ts` (NEW)
   - Create `FacultyDashboardKpiDto`:
     ```typescript
     { totalProposals: number, pendingReview: number, approved: number,
       returned: number, inProgress: number, completed: number }
     ```
   - Create `FacultyDashboardDataDto`:
     ```typescript
     { kpi: FacultyDashboardKpiDto, recentProposals: Proposal[] }
     ```
   - **DTO RELATIONSHIP:** These are NEW DTOs, separate from existing `DashboardKpiDto` and `DashboardDataDto` in `apps/src/modules/dashboard/dto/dashboard.dto.ts`. Existing DTOs are for PHONG_KHCN/ADMIN global view, new DTOs are for QUAN_LY_KHOA faculty-scoped view.
   - **State Mapping:**
     - `pendingReview` = ProjectState.FACULTY_REVIEW
     - `approved` = ProjectState.SCHOOL_SELECTION_REVIEW, SCHOOL_REVIEW, FACULTY_ACCEPTANCE_REVIEW, SCHOOL_ACCEPTANCE_REVIEW
     - `returned` = ProjectState.CHANGES_REQUESTED
     - `inProgress` = ProjectState.DRAFT, SUBMITTED
     - `completed` = ProjectState.HANDOVER, APPROVED

**Phase 3: Faculty Dashboard (Backend - After Refactor)**

10. **Add faculty dashboard service method**
    - File: `apps/src/modules/dashboard/dashboard.service.ts`
    - **IMPLEMENT:** The `getFacultyDashboardData(facultyId: string)` method declared in Task 8 (after DTOs from Task 9 are available)
    - **Query Pattern:**
      ```typescript
      const kpi = await this.prisma.proposal.groupBy({
        by: ['state'],
        where: { facultyId },
        _count: { id: true }
      });
      ```

11. **Add faculty dashboard endpoint**
    - File: `apps/src/modules/dashboard/dashboard.controller.ts`
    - Add: `GET /api/dashboard/faculty` with BOTH `@RequireRoles(UserRole.QUAN_LY_KHOA)` AND `@RequirePermissions(Permission.FACULTY_DASHBOARD_VIEW)`
    - **ALSO UPDATE:** Existing `GET /api/dashboard` endpoint needs `@RequirePermissions(Permission.DASHBOARD_VIEW)` added
    - Inject `@CurrentUser() user: RequestUser` to get facultyId
    - Call `dashboardService.getFacultyDashboardData(user.facultyId)`

**Phase 4: Faculty Dashboard (Frontend)**

12. **Create faculty dashboard page**
    - File: `web-apps/src/app/dashboard/faculty/page.tsx`
    - Components: KPI cards, proposal list table, stats
    - Fetch data from `/api/dashboard/faculty`

13. **Add faculty dashboard route**
    - File: `web-apps/src/app/app.tsx`
    - Add route: `/dashboard/faculty` with nested guards
    - **STEP 1 - Add lazy import:** In the lazy imports section (around line 29-41, after `CreateProposalPage`), add:
      ```tsx
      const FacultyDashboardPage = lazy(() => import('./dashboard/faculty/page'));
      ```
    - **STEP 2 - Add route:** In the Routes section (after ResearcherDashboardPage route, which ends around line 226-227), add:
      ```tsx
      <Route
        path="/dashboard/faculty"
        element={
          <AuthGuard>
            <RoleGuard allowedRoles={[UserRole.QUAN_LY_KHOA]}>
              <PermissionGuard permission={Permission.FACULTY_DASHBOARD_VIEW}>
                <LazyRoute>
                  <FacultyDashboardPage />
                </LazyRoute>
              </PermissionGuard>
            </RoleGuard>
          </AuthGuard>
        }
      />
      ```

14. **Update navigation**
    - File: `web-apps/src/components/layout/Header.tsx`
    - Add permission check after line 34 (with other permission checks):
      ```tsx
      const canViewFacultyDashboard = hasPermission(Permission.FACULTY_DASHBOARD_VIEW) && hasRole(user, UserRole.QUAN_LY_KHOA);
      ```
    - Add navigation link BEFORE line 135 (closing `</nav>` tag), after existing Quản trị link:
      ```tsx
      {canViewFacultyDashboard && (
        <button
          onClick={() => navigate('/dashboard/faculty')}
          className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
        >
          Dashboard Khoa
        </button>
      )}
      ```

**Phase 5: Faculty User Management**

15. **Add faculty ownership validation to users service**
    - File: `apps/src/modules/users/users.service.ts`
    - Create new method: `validateFacultyOwnership(actorUser: RequestUser, targetFacultyId: string)`
    - Throws ForbiddenException if `actorUser.facultyId !== targetFacultyId`
    - **TYPE NOTE:** Use `RequestUser` interface (matches @CurrentUser return type), NOT `CurrentUserData` - RequestUser has facultyId, CurrentUserData is for auth context only
    - **BREAKING CHANGE:** Modify existing `create()` method to accept optional `actorUserId?: string` parameter
    - **CRITICAL:** Must fetch actor user from database to get facultyId:
      ```typescript
      // MODIFIED create() method signature
      async create(createUserDto: CreateUserDto, actorUserId?: string) {
        // New ownership validation for QUAN_LY_KHOA
        if (actorUserId) {
          const actor = await this.prisma.user.findUnique({
            where: { id: actorUserId },
            select: { id: true, role: true, facultyId: true }
          });
          if (actor?.role === UserRole.QUAN_LY_KHOA) {
            this.validateFacultyOwnership(actor, createUserDto.facultyId);
            // Also validate role constraints
            const allowedRoles = [UserRole.GIANG_VIEN, UserRole.QUAN_LY_KHOA, UserRole.THU_KY_KHOA];
            if (!allowedRoles.includes(createUserDto.role)) {
              throw new ForbiddenException('QUAN_LY_KHOA can only create limited roles');
            }
          }
        }
        // ... rest of create logic
      }
      ```
    - **CALLER UPDATE:** users controller POST endpoint must pass `@CurrentUser() user?.id` to `create()` method

16. **Add faculty-scoped filtering to users controller**
    - File: `apps/src/modules/users/users.controller.ts`
    - Modify existing POST `/users` (line 60): Add role validation check in handler
    - Modify existing PATCH `/users/:id`: Add ownership check in handler
    - DO NOT create new routes - reuse existing with role-based filtering

17. **Create faculty user management UI**
    - File: `web-apps/src/app/dashboard/faculty/users/page.tsx`
    - User list with faculty filter, create/edit forms
    - **Field Permission Matrix:**
      | Field | Editable by QUAN_LY_KHOA? | Notes |
      |-------|-------------------------|-------|
      | displayName | YES | Full name |
      | email | NO | Cannot change email |
      | role | YES | Limited to {GIANG_VIEN, QUAN_LY_KHOA, THU_KY_KHOA} |
      | facultyId | NO | Auto-set to own facultyId, cannot change |

**Phase 6: Tests**

18. **Write unit tests for faculty filter**
    - File: `apps/src/modules/proposals/services/proposals-crud.service.spec.ts`
    - Test: `findAll()` with QUAN_LY_KHOA user returns only faculty's proposals
    - Test: `findAll()` with null facultyId throws error
    - Test: `findAll()` with PHONG_KHCN user returns all proposals
    - Test: `findAll()` with explicit facultyId overrides auto-filter

19. **Write integration tests for permissions**
    - File: `apps/src/modules/workflow/workflow.controller.spec.ts`
    - Test: QUAN_LY_KHOA with FACULTY_APPROVE permission can approve
    - Test: QUAN_LY_KHOA without FACULTY_APPROVE permission gets 403

20. **Write E2E tests for faculty dashboard**
    - File: `web-apps-e2e/src/faculty-isolation.e2e.spec.ts` (NEW)
    - **Test Account Setup:** Use demo QUAN_LY_KHOA account (email: `quanly.khoa@example.com`, password: `demo123`, facultyId: `K1`)
    - **IMPORTANT:** Verify test account exists in database before running tests. If not, create via demo seed script: `npm run seed:demo`
    - Test: Faculty dashboard shows only faculty's proposals
    - Test: GIANG_VIEN cannot access faculty dashboard
    - Test: KPI counts match faculty's actual proposals

21. **Write tests for faculty user management**
    - File: `apps/src/modules/users/users.service.spec.ts`
    - Test: QUAN_LY_KHOA can create user in same faculty
    - Test: QUAN_LY_KHOA cannot create user in different faculty
    - Test: QUAN_LY_KHOA cannot create user with ADMIN role
    - Test: QUAN_LY_KHOA can edit user in same faculty

### Acceptance Criteria

**AC1: Permissions Added**
- Given: System đã được seed
- When: Query role-permissions cho QUAN_LY_KHOA
- Then: Có 5 permissions mới trong database (FACULTY_APPROVE, FACULTY_RETURN, PROPOSAL_VIEW_FACULTY, FACULTY_DASHBOARD_VIEW, FACULTY_USER_MANAGE)

**AC2: Faculty Isolation**
- Given: User có role QUAN_LY_KHOA và facultyId="K1"
- When: Gọi GET /proposals
- Then: Chỉ trả về proposals có facultyId="K1"

**AC2.1: Faculty Isolation - Null Handling**
- Given: User có role QUAN_LY_KHOA và facultyId=null
- When: Gọi GET /proposals
- Then: Return 400 Bad Request với message "Faculty context required"

**AC3: Faculty Dashboard Access**
- Given: User có role QUAN_LY_KHOA và permission FACULTY_DASHBOARD_VIEW
- When: Truy cập /dashboard/faculty
- Then: Hiển thị dashboard với KPI của khoa

**AC4: Faculty Dashboard Denied**
- Given: User có role GIANG_VIEN
- When: Truy cập /dashboard/faculty
- Then: Redirect về 403

**AC5: Faculty User Management**
- Given: User có role QUAN_LY_KHOA, facultyId="K1", permission FACULTY_USER_MANAGE
- When: Tạo user mới với facultyId="K2"
- Then: Return 403 Forbidden

**AC6: Faculty User Management Success**
- Given: User có role QUAN_LY_KHOA, facultyId="K1", permission FACULTY_USER_MANAGE
- When: Tạo user mới với facultyId="K1", role=GIANG_VIEN
- Then: User được tạo thành công

**AC7: Dashboard Refactored (DEBT MITIGATION)**
- Given: Dashboard service after refactor
- When: PHONG_KHCN calls GET /dashboard
- Then: Uses permission check, NOT role check
- And: Data filtered appropriately

## Additional Context

### Dependencies

- User model có `facultyId` field (nullable) - see schema.prisma line 54
- Existing dashboard service with KPI queries
- Existing proposals-query service with faculty filter pattern
- Existing RBAC helpers in frontend

### Known Issues & Conflicts (Amelia's Analysis + Adversarial Review Fixes)

**🔴 HIGH PRIORITY:**

1. **Dashboard Service Role Coupling (LINE 256-267)**
   - **Current:** `validateDashboardPermission()` uses `const allowedRoles = ['PHONG_KHCN', 'ADMIN']`
   - **Problem:** Can't add QUAN_LY_KHOA without creating debt
   - **Solution:** Refactor to permission-based in Phase 2A (Task 8)

2. **Proposals Service - No Auto-Filter for QUAN_LY_KHOA**
   - **Current:** `findAll()` in proposals-crud.service.ts accepts `facultyId` param but doesn't auto-filter based on user role
   - **Problem:** QUAN_LY_KHOA sees ALL proposals when no explicit facultyId filter is passed
   - **Solution:** Add role-based auto-filtering in Phase 2 (Task 5)

3. **User Management - Missing Ownership Check**
   - **Current:** `validateFacultyId()` only checks faculty existence (line 99-110)
   - **Problem:** No ownership validation - QUAN_LY_KHOA could manage users from other faculties
   - **Solution:** Add `validateFacultyOwnership()` method in Phase 5 (Task 14)

**🟡 MEDIUM PRIORITY:**

4. **FacultyId Nullable**
   - User.facultyId can be null (line 54 of schema.prisma)
   - **Mitigation:** Validation layer before queries (AC2.1 added)

5. **No Faculty Isolation E2E Tests**
   - Only `giang-vien-permissions.e2e.spec.ts` exists
   - **Mitigation:** Add `faculty-isolation.e2e.spec.ts` in Phase 6 (Task 19)

### Technical Debt Mitigation (Party Mode + Adversarial Review)

**Debt #1: Dashboard Service Role Coupling**
- **Current:** `validateDashboardPermission()` uses role array
- **Mitigation:** Refactor to permission-based with scoped query methods
- **Task:** Phase 2A (Task 8)
- **Pattern:** Use `rbacService.hasPermission(user.role, Permission.DASHBOARD_VIEW)` instead of role array

**Debt #2: FacultyId Nullable**
- **Risk:** QUAN_LY_KHOA without facultyId = broken functionality
- **Mitigation:**
  - Add validation: `if (!user.facultyId) throw new BadRequestException('Faculty context required')`
  - Consider: NOT NULL constraint in future migration
  - **MIGRATION STRATEGY:** For existing QUAN_LY_KHOA users with null facultyId:
    1. Run a one-time query to identify affected users: `SELECT * FROM "User" WHERE role = 'QUAN_LY_KHOA' AND faculty_id IS NULL`
    2. Manually assign facultyId via admin interface or direct database update
    3. After deployment, verify all QUAN_LY_KHOA users have facultyId set before they log in

**Debt #3: Missing Faculty Isolation Tests**
- **Risk:** Regression in future changes
- **Mitigation:** Add E2E tests in Phase 6
- **Coverage:** `faculty-isolation.e2e.spec.ts` (Task 19)

### Testing Strategy

**Unit Tests:**
- Faculty filter logic in proposals-crud.service.ts (Task 18)
- Permission validation in workflow.controller.ts (Task 19)
- Faculty user ownership validation in users.service.ts (Task 21)
- Dashboard service refactor (Phase 2A)
- Faculty dashboard service method (Task 10)

**Integration Tests:**
- Faculty dashboard endpoint with various user roles
- Faculty isolation across proposal queries
- User management ownership checks

**E2E Tests (Playwright):**
- Faculty dashboard UI rendering (Task 20)
- Permission-based UI access control (Task 20)
- User creation flow for QUAN_LY_KHOA (Task 20)
- Faculty isolation end-to-end (Task 20)

**Reference Test File:**
- `web-apps-e2e/src/giang-vien-permissions.e2e.spec.ts`

### Notes

- Tất cả proposal endpoints cần filter theo facultyId cho QUAN_LY_KHOA
- Dashboard queries sử dụng index trên `facultyId` (schema.prisma line 71: `@@index([faculty_id])`) cho performance
- Audit logging nên bao gồm facultyId context cho QUAN_LY_KHOA actions
- Frontend nên ẩn các UI elements không có permissions
- **RBAC ARCHITECTURE (CRITICAL):**
  - JWT TOKEN contains: `{ sub, email, role, facultyId, actingAs }` - NO permissions array
  - PermissionsGuard queries DATABASE via `rbacService.hasAllPermissions(user.role, permissions)`
  - Login RESPONSE (TokenResponseUser) includes permissions array - frontend authStore stores this
  - Frontend uses `hasPermission(user, Permission.XXX)` where user.permissions comes from login response
  - Service layer: inject RbacService and use `rbacService.hasPermission(role, permission)` for checks
- `@RequirePermissions()` decorator already exists and is used in other controllers
- proposals-crud.service.ts and proposals-query.service.ts return different data structures - use proposals-crud for main queries
- **DEPLOYMENT:** After seed script runs, existing QUAN_LY_KHOA users must LOG OUT and LOG IN to receive new permissions
- **Party Mode Note:** Amelia added debt mitigation tasks to prevent accumulation
- **First Adversarial Review:** 15 findings addressed (line numbers, service files, DTO specs)
- **Second Adversarial Review:** 19 findings addressed (JWT architecture, frontend enum sync, role validation, guard patterns, test specs)
- **Third Adversarial Review:** 17 findings, 14 valid fixes applied (RBAC API signature, imports, RequestUser interface, validation location, DTO relationship, guard pattern, Header insertion, migration strategy, test account verification)
- **Fourth Adversarial Review:** 10 findings, all valid fixes applied (permissions count, duplicate numbering, task references, code snippet completion, permission usage documentation, error response spec, task boundaries, import locations, staleness warning, guard vs service usage clarification)
- **Fifth Adversarial Review:** 7 findings, all valid fixes applied (guard file path consistency, self-referential line numbers, task reference corrections, stale verification claims, hasRole import clarification, create() breaking change documentation, testing strategy completeness)
