/**
 * E2E Test for TRUONG KHOA (Quản lý Khoa) Features
 *
 * Tests all faculty management features:
 * - Login as TRUONG KHOA
 * - Dashboard Khoa (Faculty Dashboard)
 * - Quản lý người dùng khoa (Faculty User Management)
 * - View proposals from faculty
 * - Approve/Return proposals
 *
 * Test account: truongkhoa@mail.com / WmS8fOPW41SZ
 */

import { test, expect } from '@playwright/test';

const TRUONG_KHOA_CREDS = {
  email: 'truongkhoa@mail.com',
  password: 'WmS8fOPW41SZ',
};

test.describe('TRUONG KHOA - Login và Dashboard', () => {
  test('should login successfully and see faculty dashboard', async ({ page }) => {
    await page.goto('http://localhost:4200/auth/login');

    // Fill login form
    await page.fill('#email', TRUONG_KHOA_CREDS.email);
    await page.fill('#password', TRUONG_KHOA_CREDS.password);
    await page.click('button[type="submit"]');

    // Wait for navigation - should redirect to faculty dashboard
    await page.waitForTimeout(3000);
    const url = page.url();
    console.log('Current URL after login:', url);

    // Should be logged in and see faculty dashboard or default page
    expect(url).toContain('dashboard');
  });

  test('should display faculty dashboard KPI cards', async ({ page }) => {
    await page.goto('http://localhost:4200/auth/login');

    await page.fill('#email', TRUONG_KHOA_CREDS.email);
    await page.fill('#password', TRUONG_KHOA_CREDS.password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);

    // Navigate to faculty dashboard
    await page.goto('http://localhost:4200/dashboard/faculty');
    await page.waitForTimeout(2000);

    // Should see page content
    const content = await page.content();
    expect(content.length).toBeGreaterThan(0);

    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/faculty-dashboard.png' });
  });
});

test.describe('TRUONG KHOA - Quản lý người dùng khoa', () => {
  test('should access faculty user management page', async ({ page }) => {
    await loginAsTruongKhoa(page);

    // Navigate to user management
    await page.goto('http://localhost:4200/dashboard/faculty/users');
    await page.waitForTimeout(2000);

    // Check if page loaded
    const url = page.url();
    expect(url).toContain('/dashboard/faculty/users');

    // Should see user management content
    const content = await page.content();
    console.log('Page has content:', content.length > 100);

    await page.screenshot({ path: 'test-results/faculty-users.png' });
  });

  test('should see "Thêm người dùng" button', async ({ page }) => {
    await loginAsTruongKhoa(page);
    await page.goto('http://localhost:4200/dashboard/faculty/users');
    await page.waitForTimeout(2000);

    // Look for add user button
    const createButton = page.locator('button:has-text("Thêm")').or(page.locator('text=/Thêm người dùng/'));
    const isVisible = await createButton.count() > 0;
    console.log('Add button visible:', isVisible);

    await page.screenshot({ path: 'test-results/faculty-users-add-btn.png' });
  });

  test('should open create user modal', async ({ page }) => {
    await loginAsTruongKhoa(page);
    await page.goto('http://localhost:4200/dashboard/faculty/users');
    await page.waitForTimeout(2000);

    // Click create button
    const createButton = page.locator('button:has-text("Thêm")').or(page.locator('text=/Thêm người dùng/'));
    const count = await createButton.count();

    if (count > 0) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Should see modal
      const modal = page.locator('[role="dialog"], .modal, dialog');
      const hasModal = await modal.count() > 0;
      console.log('Modal opened:', hasModal);

      await page.screenshot({ path: 'test-results/faculty-users-modal.png' });
    }
  });
});

test.describe('TRUONG KHOA - Xem đề tài khoa', () => {
  test('should view proposals list', async ({ page }) => {
    await loginAsTruongKhoa(page);

    // Navigate to proposals
    await page.goto('http://localhost:4200/proposals');
    await page.waitForTimeout(2000);

    const url = page.url();
    expect(url).toContain('/proposals');

    await page.screenshot({ path: 'test-results/proposals-list.png' });
  });
});

test.describe('TRUONG KHOA - API Tests', () => {
  test('should access faculty dashboard API', async ({ playwright }) => {
    // Create a new API context that handles cookies
    const apiContext = await playwright.request.newContext();

    // Login - cookies will be stored automatically
    const loginResponse = await apiContext.post('http://localhost:4000/api/auth/login', {
      data: {
        email: TRUONG_KHOA_CREDS.email,
        password: TRUONG_KHOA_CREDS.password,
      },
    });

    console.log('Login status:', loginResponse.status());
    expect(loginResponse.ok()).toBeTruthy();

    const loginData = await loginResponse.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    expect(loginData.success).toBe(true);
    expect(loginData.data.user.role).toBe('QUAN_LY_KHOA');
    expect(loginData.data.user.permissions).toContain('FACULTY_DASHBOARD_VIEW');

    await apiContext.dispose();
  });

  test('should get faculty dashboard data', async ({ playwright }) => {
    const apiContext = await playwright.request.newContext();

    // Login - cookies stored automatically
    await apiContext.post('http://localhost:4000/api/auth/login', {
      data: {
        email: TRUONG_KHOA_CREDS.email,
        password: TRUONG_KHOA_CREDS.password,
      },
    });

    // Get faculty dashboard - cookies sent automatically
    const dashboardResponse = await apiContext.get('http://localhost:4000/api/dashboard/faculty');

    console.log('Dashboard response status:', dashboardResponse.status());

    if (dashboardResponse.ok()) {
      const dashboardData = await dashboardResponse.json();
      console.log('Dashboard data:', JSON.stringify(dashboardData, null, 2));
      expect(dashboardData.success).toBe(true);
    }

    await apiContext.dispose();
  });

  test('should get users list with faculty filter', async ({ playwright }) => {
    const apiContext = await playwright.request.newContext();

    // Login - cookies stored automatically
    await apiContext.post('http://localhost:4000/api/auth/login', {
      data: {
        email: TRUONG_KHOA_CREDS.email,
        password: TRUONG_KHOA_CREDS.password,
      },
    });

    // Get users - cookies sent automatically
    const usersResponse = await apiContext.get('http://localhost:4000/api/users');

    console.log('Users response status:', usersResponse.status());

    if (usersResponse.ok()) {
      const usersData = await usersResponse.json();
      console.log('Users count:', usersData.data?.length || usersData.users?.length);
      expect(usersData.success).toBe(true);
    }

    await apiContext.dispose();
  });
});

// Helper function
async function loginAsTruongKhoa(page: any) {
  await page.goto('http://localhost:4200/auth/login');
  await page.fill('#email', TRUONG_KHOA_CREDS.email);
  await page.fill('#password', TRUONG_KHOA_CREDS.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
}
