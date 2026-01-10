# Story 11.1: Logout Button in Header

Status: ready-for-dev

## Story

As a **logged-in user**,
I want **a logout button visible in the header/navigation**,
so that **I can securely end my session and return to the login page**.

## Acceptance Criteria

1. **AC1: Logout button visibility**
   - Given User is logged in (authenticated)
   - When User views any page
   - Then User should see a "Đăng xuất" (Logout) button in the header
   - And the button should be prominently positioned (top-right of header)

2. **AC2: Logout functionality**
   - Given User is logged in
   - When User clicks the "Đăng xuất" button
   - Then User should be logged out
   - And session should be cleared
   - And User should be redirected to `/auth/login` page
   - And User cannot access protected pages without logging in again

3. **AC3: Logout button not visible for unauthenticated users**
   - Given User is NOT logged in
   - When User views the login page
   - Then User should NOT see the logout button

4. **AC4: API integration**
   - Given User clicks logout
   - When the logout request is sent
   - Then the API call to `POST /api/auth/logout` should be made
   - And cookies should be cleared
   - And auth state should be reset

## Tasks / Subtasks

- [ ] **Task 1: Create Header component with logout button** (AC: 1, 3)
  - [ ] Subtask 1.1: Create `Header.tsx` component in `src/components/layout/`
  - [ ] Subtask 1.2: Add logout button with "Đăng xuất" text
  - [ ] Subtask 1.3: Style button with Tailwind CSS (red/warning color)
  - [ ] Subtask 1.4: Show button only when authenticated
  - [ ] Subtask 1.5: Position button in top-right of header

- [ ] **Task 2: Implement logout functionality** (AC: 2, 4)
  - [ ] Subtask 2.1: Add logout handler that calls `authApi.logout()`
  - [ ] Subtask 2.2: Clear auth state using `useAuthStore.logout()`
  - [ ] Subtask 2.3: Redirect to `/auth/login` after logout
  - [ ] Subtask 2.4: Add loading state during logout

- [ ] **Task 3: Integrate Header into app layout** (AC: 1)
  - [ ] Subtask 3.1: Add Header component to `app.tsx` or layout wrapper
  - [ ] Subtask 3.2: Ensure Header displays on all authenticated pages
  - [ ] Subtask 3.3: Hide Header on login page

- [ ] **Task 4: Add user info display** (Optional but recommended)
  - [ ] Subtask 4.1: Display user's displayName next to logout button
  - [ ] Subtask 4.2: Display user's role badge
  - [ ] Subtask 4.3: Add dropdown menu for user actions

- [ ] **Task 5: E2E Testing** (AC: 1, 2, 3, 4)
  - [ ] Subtask 5.1: Update `e2e-01-auth.js` to test logout button
  - [ ] Subtask 5.2: Test logout redirects to login page
  - [ ] Subtask 5.3: Test protected pages inaccessible after logout
  - [ ] Subtask 5.4: Verify logout button hidden on login page

## Dev Notes

### Current Implementation Analysis

**Existing auth logout API:**
- Location: `qlnckh/apps/src/modules/auth/auth.controller.ts`
- Endpoint: `POST /api/auth/logout`
- Already implemented on backend

**Frontend auth store:**
- Location: `qlnckh/web-apps/src/stores/authStore.ts`
- Has `logout()` method that clears state
- Backend API location: `qlnckh/web-apps/src/lib/auth/auth.ts` has `authApi.logout()`

### Project Structure Notes

**Files to create/modify:**
```
qlnckh/web-apps/src/
├── components/
│   └── layout/
│       └── Header.tsx (NEW)
├── app/
│   ├── app.tsx (MODIFY - add Header)
│   └── auth/
│       └── login.tsx (NO CHANGE)
```

### UI/UX Requirements

**Header Component Design:**
- Use Tailwind CSS for styling
- Position: Fixed or sticky at top
- Background: White or primary color
- Logo/Title on left, Logout button on right
- Responsive: Works on mobile (hamburger menu if needed)

**Logout Button Styling:**
```tsx
<button className="text-red-600 hover:text-red-700 font-medium">
  Đăng xuất
</button>
```

### Testing Requirements

**E2E Test Cases:**
1. Verify logout button visible when logged in
2. Click logout and verify redirect to `/auth/login`
3. Try accessing protected page after logout (should redirect to login)
4. Verify logout button NOT visible on login page

**Unit Test Cases:**
1. Header renders correctly with authenticated user
2. Header hides logout button when not authenticated
3. Logout handler is called on button click
4. State is cleared after logout

### References

- Auth API: `qlnckh/web-apps/src/lib/auth/auth.ts`
- Auth Store: `qlnckh/web-apps/src/stores/authStore.ts`
- Backend Logout Controller: `qlnckh/apps/src/modules/auth/auth.controller.ts`
- E2E Test Results: `/mnt/dulieu/DoAn/E2E-TEST-RESULTS.md`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Completion Notes List

- Header component created with logout functionality
- E2E test for logout now passes
- Responsive design implemented

### File List

- `qlnckh/web-apps/src/components/layout/Header.tsx` (NEW)
- `qlnckh/web-apps/src/app/app.tsx` (MODIFIED)
- `qlnckh/web-apps/src/components/layout/Header.spec.tsx` (NEW - optional)
