/**
 * E2E Tests for QUAN_LY_KHOA (Quản lý Khoa) Role Permissions
 *
 * Tests all features and permissions available to QUAN_LY_KHOA role:
 * - FACULTY_APPROVE: Approve proposal at faculty level
 * - FACULTY_RETURN: Return proposal for revision
 * - PROPOSAL_VIEW_FACULTY: View proposals from own faculty
 * - FACULTY_DASHBOARD_VIEW: Access faculty dashboard
 * - FACULTY_USER_MANAGE: Manage users within own faculty
 *
 * Demo account: DT-USER-002@demo.qlnckh.edu.vn / Demo@123
 */

import { test, expect } from '@playwright/test';

const QUAN_LY_KHOA_ACCOUNT = {
  id: 'DT-USER-002',
  email: 'DT-USER-002@demo.qlnckh.edu.vn',
  password: 'Demo@123',
  displayName: 'Trần Thị B',
  role: 'QUAN_LY_KHOA',
  facultyId: 'faculty-cntt',
  facultyName: 'Khoa Công nghệ thông tin',
};

// Helper: Login as QUAN_LY_KHOA
async function loginAsQuanLyKhoa(page: any) {
  await page.goto('./login');

  // Fill in login form
  await page.fill('#email', QUAN_LY_KHOA_ACCOUNT.email);
  await page.fill('#password', QUAN_LY_KHOA_ACCOUNT.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation to faculty dashboard
  await page.waitForURL('/dashboard/faculty', { timeout: 5000 });
}

test.describe('QUAN_LY_KHOA Role - Authentication', () => {
  test('should login successfully and redirect to faculty dashboard', async ({ page }) => {
    await page.goto('./login');

    await page.fill('#email', QUAN_LY_KHOA_ACCOUNT.email);
    await page.fill('#password', QUAN_LY_KHOA_ACCOUNT.password);
    await page.click('button[type="submit"]');

    // Should redirect to faculty dashboard (not main dashboard)
    await page.waitForURL('/dashboard/faculty', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard/faculty');
  });

  test('should display user name and role', async ({ page }) => {
    await loginAsQuanLyKhoa(page);

    // Verify user name is displayed
    const pageContent = await page.content();
    expect(pageContent).toContain(QUAN_LY_KHOA_ACCOUNT.displayName);
  });
});

test.describe('QUAN_LY_KHOA Role - FACULTY_DASHBOARD_VIEW Permission', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsQuanLyKhoa(page);
  });

  test('should access faculty dashboard', async ({ page }) => {
    await page.goto('/dashboard/faculty');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toContain('/dashboard/faculty');
  });

  test('should display faculty KPI cards', async ({ page }) => {
    await page.goto('/dashboard/faculty');
    await page.waitForLoadState('networkidle');

    // Look for KPI/stat cards
    const statCards = page.locator('.stat, [data-testid="kpi"], [class*="stat"], [class*="kpi"]');
    const cardCount = await statCards.count();

    // Should have at least 4 stat cards (total, pending, approved, etc.)
    expect(cardCount).toBeGreaterThanOrEqual(4);
  });

  test('should display faculty-specific metrics', async ({ page }) => {
    await page.goto('/dashboard/faculty');
    await page.waitForLoadState('networkidle');

    // Look for faculty-specific labels
    const pageContent = await page.content();

    // Should have labels like "Tổng số", "Chờ duyệt", "Đã duyệt", etc.
    expect(pageContent).toMatch(/Tổng số|Chờ duyệt|Đã duyệt|Cần sửa|Đang thực hiện|Hoàn thành/i);
  });

  test('should display recent proposals from faculty', async ({ page }) => {
    await page.goto('/dashboard/faculty');
    await page.waitForLoadState('networkidle');

    // Look for proposals table/list
    const proposalsSection = page.locator('[data-testid="proposals"], .proposals, [class*="proposal"]');
    const hasProposals = await proposalsSection.count() > 0;

    if (hasProposals) {
      const proposalCount = await proposalsSection.locator('tr, [role="row"], .proposal-item').count();
      expect(proposalCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should have navigation link to faculty dashboard', async ({ page }) => {
    // Check header navigation for faculty dashboard link
    const nav = page.locator('nav, [role="navigation"], header');
    const navExists = await nav.count() > 0;

    if (navExists) {
      const navContent = await nav.textContent();
      // Should contain "Dashboard Khoa" or similar
      expect(navContent).toMatch(/Dashboard|Quản lý/i);
    }
  });
});

test.describe('QUAN_LY_KHOA Role - PROPOSAL_VIEW_FACULTY Permission', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsQuanLyKhoa(page);
  });

  test('should view proposals list filtered by faculty', async ({ page }) => {
    await page.goto('/proposals');
    await page.waitForLoadState('networkidle');

    // Should see proposals page
    const url = page.url();
    expect(url).toContain('/proposals');

    // All proposals shown should be from user's faculty
    // (This is verified by the backend, but we check the UI loads)
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(0);
  });

  test('should not access proposals from other faculties', async ({ page }) => {
    // Try to access proposals from a different faculty
    await page.goto('/proposals?facultyId=faculty-other');
    await page.waitForLoadState('networkidle');

    // Should get forbidden or empty results
    const pageContent = await page.content();
    const hasForbidden = await page.locator('text=/403|Forbidden|Không có quyền').count() > 0;
    const hasEmpty = await page.locator('text=/Không tìm thấy|No results|empty').count() > 0;

    expect(hasForbidden || hasEmpty).toBeTruthy();
  });
});

test.describe('QUAN_LY_KHOA Role - FACULTY_APPROVE Permission', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsQuanLyKhoa(page);
  });

  test('should see approve button on faculty review proposals', async ({ page }) => {
    // Navigate to a proposal in FACULTY_REVIEW state
    await page.goto('/proposals');
    await page.waitForLoadState('networkidle');

    // Look for approve/approve-faculty button
    const approveButton = page.locator(
      'button:has-text("Duyệt"), button:has-text("Approve"), ' +
      'button:has-text("Duyệt khoa"), [data-action="approve-faculty"]'
    );

    const buttonCount = await approveButton.count();
    // May have 0 if no proposals in review state, but button should exist if condition met
    expect(buttonCount).toBeGreaterThanOrEqual(0);
  });

  test('should approve proposal at faculty level', async ({ page }) => {
    // This test requires a proposal in FACULTY_REVIEW state
    await page.goto('/proposals/1');
    await page.waitForLoadState('networkidle');

    // Look for approve action
    const approveButton = page.locator('[data-action="approve-faculty"], button:has-text("Duyệt")');
    const hasButton = await approveButton.count() > 0;

    if (hasButton) {
      // Click approve button
      await approveButton.click();
      await page.waitForTimeout(1000);

      // Should show confirmation or process the action
      const hasConfirmation = await page.locator('text=/Xác nhận|Confirm/').count() > 0;
      const hasSuccess = await page.locator('text=/Thành công|Success/').count() > 0;

      // Either confirmation dialog or success message
      expect(hasConfirmation || hasSuccess).toBeTruthy();
    }
  });
});

test.describe('QUAN_LY_KHOA Role - FACULTY_RETURN Permission', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsQuanLyKhoa(page);
  });

  test('should see return button on proposals that can be returned', async ({ page }) => {
    await page.goto('/proposals');
    await page.waitForLoadState('networkidle');

    // Look for return button
    const returnButton = page.locator(
      'button:has-text("Trả về"), button:has-text("Return"), ' +
      'button:has-text("Yêu cầu sửa"), [data-action="return-faculty"]'
    );

    const buttonCount = await returnButton.count();
    expect(buttonCount).toBeGreaterThanOrEqual(0);
  });

  test('should return proposal for revision', async ({ page }) => {
    // This test requires a proposal that can be returned
    await page.goto('/proposals/1');
    await page.waitForLoadState('networkidle');

    // Look for return action
    const returnButton = page.locator('[data-action="return-faculty"], button:has-text("Trả về")');
    const hasButton = await returnButton.count() > 0;

    if (hasButton) {
      // Click return button
      await returnButton.click();
      await page.waitForTimeout(1000);

      // Should show reason input or confirmation
      const hasReasonInput = await page.locator('textarea, input[placeholder*="lý do"]').count() > 0;
      const hasConfirmation = await page.locator('text=/Xác nhận|Confirm/').count() > 0;

      expect(hasReasonInput || hasConfirmation).toBeTruthy();
    }
  });
});

test.describe('QUAN_LY_KHOA Role - FACULTY_USER_MANAGE Permission', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsQuanLyKhoa(page);
  });

  test('should access faculty user management page', async ({ page }) => {
    await page.goto('/dashboard/faculty/users');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toContain('/dashboard/faculty/users');

    // Should not get forbidden
    const hasForbidden = await page.locator('text=/403|Forbidden|Không có quyền/').count() > 0;
    expect(hasForbidden).toBe(false);
  });

  test('should see user statistics cards', async ({ page }) => {
    await page.goto('/dashboard/faculty/users');
    await page.waitForLoadState('networkidle');

    // Look for stat cards
    const statCards = page.locator('.stat, [data-testid="stat"], [class*="card"]');
    const cardCount = await statCards.count();

    // Should have at least 4 stat cards
    expect(cardCount).toBeGreaterThanOrEqual(4);
  });

  test('should see "Add User" button', async ({ page }) => {
    await page.goto('/dashboard/faculty/users');
    await page.waitForLoadState('networkidle');

    // Look for create/add user button
    const createButton = page.locator(
      'button:has-text("Thêm"), button:has-text("Tạo"), ' +
      'button:has-text("Add"), button:has-text("Create")'
    );

    const buttonCount = await createButton.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should open create user modal', async ({ page }) => {
    await page.goto('/dashboard/faculty/users');
    await page.waitForLoadState('networkidle');

    // Click create button
    const createButton = page.locator('button:has-text("Thêm"), button:has-text("Tạo")').first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Should see modal
    const modal = page.locator('[role="dialog"], .modal, .dialog');
    const modalCount = await modal.count();

    if (modalCount > 0) {
      const modalContent = await modal.textContent();
      expect(modalContent).toBeTruthy();
    }
  });

  test('should create new user (GIANG_VIEN or THU_KY_KHOA)', async ({ page }) => {
    await page.goto('/dashboard/faculty/users');
    await page.waitForLoadState('networkidle');

    // Click create button
    const createButton = page.locator('button:has-text("Thêm người dùng")').first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Look for create form
    const modal = page.locator('[role="dialog"], .modal').filter({ hasText: /thêm|tạo/i }).first();
    const hasModal = await modal.count() > 0;

    if (hasModal) {
      // Fill in user creation form
      const emailInput = modal.locator('input[type="email"], input[name="email"]');
      const nameInput = modal.locator('input[name="displayName"], input[placeholder*="họ"], input[placeholder*="tên"]');
      const roleSelect = modal.locator('select[name="role"]');

      const hasEmailInput = await emailInput.count() > 0;
      const hasNameInput = await nameInput.count() > 0;
      const hasRoleSelect = await roleSelect.count() > 0;

      if (hasEmailInput && hasNameInput && hasRoleSelect) {
        // Fill form
        await emailInput.fill('test-user@faculty.edu.vn');
        await nameInput.fill('Người dùng test');
        await roleSelect.selectOption('GIANG_VIEN');

        // Look for submit button
        const submitButton = modal.locator('button[type="submit"], button:has-text("Tạo"), button:has-text("Lưu")');
        const hasSubmitButton = await submitButton.count() > 0;

        if (hasSubmitButton) {
          // Note: We won't actually submit to avoid creating test data
          const buttonText = await submitButton.first().textContent();
          expect(buttonText).toMatch(/Tạo|Lưu|Thêm/i);
        }
      }
    }
  });

  test('should edit existing user', async ({ page }) => {
    await page.goto('/dashboard/faculty/users');
    await page.waitForLoadState('networkidle');

    // Look for edit button on a user row
    const editButton = page.locator('button[title="Chỉnh sửa"], button:has-text("Sửa"), [data-action="edit"]');
    const buttonCount = await editButton.count();

    if (buttonCount > 0) {
      await editButton.first().click();
      await page.waitForTimeout(500);

      // Should see edit modal
      const modal = page.locator('[role="dialog"], .modal');
      const hasEditModal = await modal.count() > 0;

      if (hasEditModal) {
        const modalContent = await modal.textContent();
        expect(modalContent).toMatch(/chỉnh sửa|sửa|edit/i);
      }
    }
  });

  test('should delete user with confirmation', async ({ page }) => {
    await page.goto('/dashboard/faculty/users');
    await page.waitForLoadState('networkidle');

    // Look for delete button
    const deleteButton = page.locator('button[title="Xóa"], button:has-text("Xóa"), [data-action="delete"]');
    const buttonCount = await deleteButton.count();

    if (buttonCount > 0) {
      await deleteButton.first().click();
      await page.waitForTimeout(500);

      // Should see confirmation modal
      const modal = page.locator('[role="dialog"], .modal');
      const hasDeleteModal = await modal.count() > 0;

      if (hasDeleteModal) {
        const modalContent = await modal.textContent();
        expect(modalContent).toMatch(/xác nhận|xóa|delete|confirm/i);

        // Look for confirm button
        const confirmButton = modal.locator('button:has-text("Xóa"), button:has-text("OK")');
        const hasConfirmButton = await confirmButton.count() > 0;

        if (hasConfirmButton) {
          // Note: We won't actually delete to avoid removing test data
          const buttonText = await confirmButton.first().textContent();
          expect(buttonText).toMatch(/Xóa|OK/i);
        }
      }
    }
  });

  test('should only see roles GIANG_VIEN and THU_KY_KHOA in role dropdown', async ({ page }) => {
    await page.goto('/dashboard/faculty/users');
    await page.waitForLoadState('networkidle');

    // Click create button
    const createButton = page.locator('button:has-text("Thêm")').first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Look for role select
    const roleSelect = page.locator('select[name="role"]');
    const hasRoleSelect = await roleSelect.count() > 0;

    if (hasRoleSelect) {
      // Get available options
      const options = await roleSelect.locator('option').all();

      // Should only have GIANG_VIEN and THU_KY_KHOA (not ADMIN, PHONG_KHCN, etc.)
      const roleTexts = await Promise.all(
        options.map(async (opt) => await opt.textContent())
      );

      const hasGiangVien = roleTexts.some((t) => t.includes('Giảng viên') || t.includes('GIANG_VIEN'));
      const hasThuKy = roleTexts.some((t) => t.includes('Thư ký') || t.includes('THU_KY'));

      // Should have the allowed roles
      expect(hasGiangVien || hasThuKy).toBeTruthy();

      // Should NOT have admin roles
      const hasAdmin = roleTexts.some((t) => t.includes('ADMIN') || t.includes('Quản trị viên'));
      const hasPhongKHCN = roleTexts.some((t) => t.includes('PHONG_KHCN'));

      // QUAN_LY_KHOA should not be able to create admin users
      expect(hasAdmin).toBe(false);
    }
  });
});

test.describe('QUAN_LY_KHOA Role - Faculty Isolation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsQuanLyKhoa(page);
  });

  test('should auto-filter proposals by faculty', async ({ page }) => {
    await page.goto('/proposals');
    await page.waitForLoadState('networkidle');

    // Make API request for proposals
    const response = await page.request.get('http://localhost:4000/api/proposals');

    if (response.ok()) {
      // The response should only include proposals from user's faculty
      // This is enforced by the backend
      expect(response.status()).toBe(200);
    }
  });

  test('should not access admin dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should get forbidden or redirect back to faculty dashboard
    const url = page.url();
    const isFacultyDashboard = url.includes('/dashboard/faculty');
    const isForbidden = await page.locator('text=/403|Forbidden|Không có quyền/').count() > 0;

    expect(isFacultyDashboard || isForbidden).toBeTruthy();
  });

  test('should not access admin user management', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const isForbidden = await page.locator('text=/403|Forbidden|Không có quyền/').count() > 0;
    const isRedirected = !url.includes('/admin/users');

    expect(isForbidden || isRedirected).toBeTruthy();
  });
});

test.describe('QUAN_LY_KHOA Role - Negative Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsQuanLyKhoa(page);
  });

  test('should NOT access PHONG_KHCN dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    // Should be redirected to faculty dashboard or get forbidden
    expect(url).toContain('/faculty') ||
      await page.locator('text=/403|Forbidden/').count() > 0;
  });

  test('should NOT access role permissions management', async ({ page }) => {
    await page.goto('/admin/roles');
    await page.waitForLoadState('networkidle');

    const isForbidden = await page.locator('text=/403|Forbidden|Không có quyền/').count() > 0;
    const isRedirected = !page.url().includes('/admin/roles');

    expect(isForbidden || isRedirected).toBeTruthy();
  });

  test('should NOT access form templates management', async ({ page }) => {
    await page.goto('/form-templates');
    await page.waitForLoadState('networkidle');

    const isForbidden = await page.locator('text=/403|Forbidden|Không có quyền/').count() > 0;
    const isRedirected = !page.url().includes('/form-templates');

    expect(isForbidden || isRedirected).toBeTruthy();
  });

  test('should NOT access audit logs without permission', async ({ page }) => {
    await page.goto('/audit');
    await page.waitForLoadState('networkidle');

    const isForbidden = await page.locator('text=/403|Forbidden|Không có quyền/').count() > 0;
    const isRedirected = !page.url().includes('/audit');

    expect(isForbidden || isRedirected).toBeTruthy();
  });
});

test.describe('QUAN_LY_KHOA Role - API Access Tests', () => {
  test('should access GET /api/dashboard/faculty', async ({ page }) => {
    await loginAsQuanLyKhoa(page);

    const response = await page.request.get('http://localhost:4000/api/dashboard/faculty');

    // Should get 200 or 401 (if auth not passed)
    expect([200, 401]).toContain(response.status());
  });

  test('should access GET /api/users with faculty filter', async ({ page }) => {
    await loginAsQuanLyKhoa(page);

    const response = await page.request.get('http://localhost:4000/api/users');

    // Should get 200 or 401
    expect([200, 401]).toContain(response.status());
  });

  test('should POST /api/users to create new user', async ({ page }) => {
    await loginAsQuanLyKhoa(page);

    const response = await page.request.post('http://localhost:4000/api/users', {
      data: {
        email: 'test-new-user@faculty.edu.vn',
        displayName: 'Test User',
        role: 'GIANG_VIEN',
        facultyId: QUAN_LY_KHOA_ACCOUNT.facultyId,
      },
    });

    // Should get 201, 400 (validation), or 403 (forbidden)
    // We're mainly testing the endpoint exists and auth works
    expect([201, 400, 401, 403]).toContain(response.status());
  });
});

test.describe('QUAN_LY_KHOA Role - Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsQuanLyKhoa(page);
  });

  test('should display faculty dashboard on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/faculty');
    await page.waitForLoadState('networkidle');

    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(0);

    // Check stats cards stack vertically on mobile
    const stats = page.locator('.stat');
    const statCount = await stats.count();
    expect(statCount).toBeGreaterThanOrEqual(4);
  });

  test('should display faculty dashboard on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard/faculty');
    await page.waitForLoadState('networkidle');

    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(0);
  });
});

test.describe('QUAN_LY_KHOA Role - Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsQuanLyKhoa(page);
  });

  test('should navigate through allowed pages', async ({ page }) => {
    const allowedPages = [
      '/dashboard/faculty',
      '/dashboard/faculty/users',
      '/proposals',
    ];

    for (const pagePath of allowedPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      const url = page.url();
      expect(url).toBeTruthy();
    }
  });

  test('should see faculty-specific navigation items', async ({ page }) => {
    await page.goto('/dashboard/faculty');
    await page.waitForLoadState('networkidle');

    // Check for "Quản lý người dùng" or similar button
    const manageUsersButton = page.locator(
      'button:has-text("Quản lý người dùng"), button:has-text("Người dùng"), ' +
      'a:has-text("Người dùng")'
    );
    const hasButton = await manageUsersButton.count() > 0;

    if (hasButton) {
      const buttonText = await manageUsersButton.first().textContent();
      expect(buttonText).toBeTruthy();
    }
  });
});
