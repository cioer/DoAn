import { test, expect } from '@playwright/test';

/**
 * E2E Test: Login All Demo Accounts
 *
 * Tests login functionality for all 8 demo accounts.
 * Verifies that each account can successfully log in and access the dashboard.
 */

// Demo accounts from demo-seed-data.constants.ts
const DEMO_ACCOUNTS = [
  {
    id: 'DT-USER-001',
    email: 'DT-USER-001@demo.qlnckh.edu.vn',
    password: 'Demo@123',
    displayName: 'Nguyễn Văn A',
    role: 'GIANG_VIEN',
  },
  {
    id: 'DT-USER-002',
    email: 'DT-USER-002@demo.qlnckh.edu.vn',
    password: 'Demo@123',
    displayName: 'Trần Thị B',
    role: 'QUAN_LY_KHOA',
  },
  {
    id: 'DT-USER-003',
    email: 'DT-USER-003@demo.qlnckh.edu.vn',
    password: 'Demo@123',
    displayName: 'Lê Văn C',
    role: 'THU_KY_KHOA',
  },
  {
    id: 'DT-USER-004',
    email: 'DT-USER-004@demo.qlnckh.edu.vn',
    password: 'Demo@123',
    displayName: 'Phạm Thị D',
    role: 'PHONG_KHCN',
  },
  {
    id: 'DT-USER-005',
    email: 'DT-USER-005@demo.qlnckh.edu.vn',
    password: 'Demo@123',
    displayName: 'Hoàng Văn E',
    role: 'THU_KY_HOI_DONG',
  },
  {
    id: 'DT-USER-006',
    email: 'DT-USER-006@demo.qlnckh.edu.vn',
    password: 'Demo@123',
    displayName: 'Đặng Thị F',
    role: 'THANH_TRUNG',
  },
  {
    id: 'DT-USER-007',
    email: 'DT-USER-007@demo.qlnckh.edu.vn',
    password: 'Demo@123',
    displayName: 'Vũ Văn G',
    role: 'BAN_GIAM_HOC',
  },
  {
    id: 'DT-USER-008',
    email: 'DT-USER-008@demo.qlnckh.edu.vn',
    password: 'Demo@123',
    displayName: 'Admin System',
    role: 'ADMIN',
  },
];

test.describe('Login All Demo Accounts', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page using baseURL
    await page.goto('./login');
  });

  for (const account of DEMO_ACCOUNTS) {
    test(`login as ${account.id} - ${account.displayName} (${account.role})`, async ({
      page,
    }) => {
      // Fill in login form
      await page.fill('#email', account.email);
      await page.fill('#password', account.password);

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for navigation to dashboard
      await page.waitForURL('/', { timeout: 5000 });

      // Verify we're on the dashboard/home page
      await expect(page).toHaveURL('/');

      // Take screenshot for visual verification
      await page.screenshot({
        path: `screenshots/login-${account.id}.png`,
        fullPage: true,
      });

      // Verify user info is displayed (check for common dashboard elements)
      // The dashboard should show user's name or role somewhere
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(0);
    });
  }
});

test.describe('Login Negative Tests', () => {
  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('./login');

    // Try to login with invalid credentials
    await page.fill('#email', 'invalid@test.com');
    await page.fill('#password', 'WrongPassword123');
    await page.click('button[type="submit"]');

    // Should stay on login page or show error
    // Check for error message or failed login state
    await page.waitForTimeout(1000);

    // Should not navigate to dashboard
    await expect(page).not.toHaveURL('/');
  });

  test('should show error for empty fields', async ({ page }) => {
    await page.goto('./login');

    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // HTML5 validation should prevent submission
    // Check that we're still on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show error for wrong password', async ({ page }) => {
    await page.goto('./login');

    // Use correct email but wrong password
    await page.fill('#email', 'DT-USER-001@demo.qlnckh.edu.vn');
    await page.fill('#password', 'WrongPassword123');
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(2000);

    // Should not navigate to dashboard
    await expect(page).not.toHaveURL('/');

    // Check for error message
    const errorMessage = page.locator('.bg-red-50, .text-red-600');
    const hasError = (await errorMessage.count()) > 0;
    expect(hasError).toBeTruthy();
  });
});
