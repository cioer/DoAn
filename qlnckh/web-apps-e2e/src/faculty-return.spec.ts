import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Faculty Return Dialog Flow (Story 4.2)
 *
 * Tests the complete flow:
 * 1. Faculty user opens proposal in FACULTY_REVIEW state
 * 2. Clicks "Yêu cầu sửa" button
 * 3. Fills out return form (reason code + sections + comment)
 * 4. Submits and verifies CHANGES_REQUESTED state
 * 5. Verifies ChangesRequestedBanner appears
 *
 * AC Coverage:
 * - AC1: UI Button "Yêu cầu sửa" visible for QUAN_LY_KHOA
 * - AC2: Button hidden for wrong roles/states
 * - AC3: Return Dialog content (reason dropdown, section checkboxes, comment)
 * - AC4: Validation (submit disabled when invalid)
 * - AC5: Backend RBAC check
 * - AC6: Idempotency key handling
 */

/**
 * Helper: Login using demo mode dropdown
 */
async function loginWithDemoMode(page: any, personaName: string): Promise<void> {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');

  // Find demo mode dropdown
  const personaDropdown = page.locator('select').first();
  await personaDropdown.waitFor({ state: 'visible', timeout: 10000 });

  // Get all options and find matching persona
  const options = await personaDropdown.locator('option').all();
  const optionTexts = await Promise.all(options.map((o: any) => o.textContent()));
  const matchingOption = optionTexts.find((text: string | null) =>
    text && text.toLowerCase().includes(personaName.toLowerCase())
  );

  if (matchingOption) {
    await personaDropdown.selectOption({ label: matchingOption });
  } else {
    throw new Error(`Persona "${personaName}" not found`);
  }

  await page.waitForTimeout(300);
  await page.click('button:has-text("Đăng nhập")');
  await page.waitForURL(/\/(proposals|admin|dashboard)/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Faculty Return Dialog Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as QUAN_LY_KHOA (Faculty Manager) using demo mode
    await loginWithDemoMode(page, 'Quản lý Khoa');
  });

  test('AC1, AC2: QUAN_LY_KHOA sees "Yêu cầu sửa" button on FACULTY_REVIEW proposal', async ({ page }) => {
    // Navigate to a proposal in FACULTY_REVIEW state
    await page.goto('/proposals/demo-faculty-review');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify "Yêu cầu sửa" button is visible
    const returnButton = page.getByRole('button', { name: /yêu cầu sửa/i });
    await expect(returnButton).toBeVisible();

    // Also verify "Duyệt hồ sơ" button is visible
    const approveButton = page.getByRole('button', { name: /duyệt hồ sơ/i });
    await expect(approveButton).toBeVisible();
  });

  test('AC2: "Yêu cầu sửa" button NOT visible for GIANG_VIEN on FACULTY_REVIEW proposal', async ({ page }) => {
    // Re-login as GIANG_VIEN using demo mode
    await loginWithDemoMode(page, 'Giảng viên');

    // Navigate to a proposal in FACULTY_REVIEW state
    await page.goto('/proposals/demo-faculty-review');
    await page.waitForLoadState('networkidle');

    // Verify "Yêu cầu sửa" button is NOT visible
    const returnButton = page.getByRole('button', { name: /yêu cầu sửa/i });
    await expect(returnButton).not.toBeVisible();
  });

  test('AC2: "Yêu cầu sửa" button NOT visible when proposal NOT in FACULTY_REVIEW state', async ({ page }) => {
    // Navigate to a proposal in DRAFT state
    await page.goto('/proposals/demo-draft');
    await page.waitForLoadState('networkidle');

    // Verify "Yêu cầu sửa" button is NOT visible
    const returnButton = page.getByRole('button', { name: /yêu cầu sửa/i });
    await expect(returnButton).not.toBeVisible();
  });

  test('AC3: Return Dialog displays all required fields', async ({ page }) => {
    await page.goto('/proposals/demo-faculty-review');
    await page.waitForLoadState('networkidle');

    // Click "Yêu cầu sửa" button
    await page.click('button:has-text("Yêu cầu sửa")');

    // Verify dialog opens
    const dialog = page.locator('[role="dialog"]').or(page.locator('.dialog'));
    await expect(dialog).toBeVisible();

    // Verify reason code dropdown
    const reasonLabel = page.getByText(/lý do/i);
    await expect(reasonLabel).toBeVisible();

    // Verify section checkboxes
    const sectionLabel = page.getByText(/chọn phần cần sửa/i);
    await expect(sectionLabel).toBeVisible();

    // Verify comment textarea
    const commentLabel = page.getByText(/ghi chú/i);
    await expect(commentLabel).toBeVisible();

    // Verify action buttons
    await expect(page.getByRole('button', { name: /gửi/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /hủy/i })).toBeVisible();
  });

  test('AC3: Reason dropdown contains all expected options', async ({ page }) => {
    await page.goto('/proposals/demo-faculty-review');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Yêu cầu sửa")');

    // Click reason dropdown
    const reasonTrigger = page.locator('[role="combobox"]').or(page.locator('.select-trigger'));
    await reasonTrigger.first().click();

    // Verify all reason options
    await expect(page.getByRole('option', { name: /thiếu tài liệu/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /nội dung không rõ ràng/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /phương pháp không khả thi/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /kinh phí không hợp lý/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /khác/i })).toBeVisible();
  });

  test('AC3: Section checkboxes display all sections', async ({ page }) => {
    await page.goto('/proposals/demo-faculty-review');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Yêu cầu sửa")');

    // Verify all section checkboxes
    await expect(page.getByText(/thông tin chung/i)).toBeVisible();
    await expect(page.getByText(/nội dung nghiên cứu/i)).toBeVisible();
    await expect(page.getByText(/phương pháp nghiên cứu/i)).toBeVisible();
    await expect(page.getByText(/kết quả mong đợi/i)).toBeVisible();
    await expect(page.getByText(/kinh phí/i)).toBeVisible();
    await expect(page.getByText(/tài liệu đính kèm/i)).toBeVisible();
  });

  test('AC4: Submit button disabled when form is invalid', async ({ page }) => {
    await page.goto('/proposals/demo-faculty-review');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Yêu cầu sửa")');

    const submitButton = page.getByRole('button', { name: /gửi/i });

    // Initially, submit button should be disabled
    await expect(submitButton).toBeDisabled();

    // Select only reason code (no sections)
    await page.locator('[role="combobox"]').or(page.locator('.select-trigger')).first().click();
    await page.click('[role="option"]:has-text("Thiếu tài liệu")');

    // Still disabled - need at least 1 section
    await expect(submitButton).toBeDisabled();

    // Select one section
    await page.check('input[type="checkbox"]');

    // Now submit button should be enabled
    await expect(submitButton).toBeEnabled();
  });

  test('AC5, AC6: Complete return flow - submit and verify CHANGES_REQUESTED state', async ({ page }) => {
    await page.goto('/proposals/demo-faculty-review');
    await page.waitForLoadState('networkidle');

    // Click "Yêu cầu sửa" button
    await page.click('button:has-text("Yêu cầu sửa")');

    // Fill out the form
    // Select reason code
    await page.locator('[role="combobox"]').or(page.locator('.select-trigger')).first().click();
    await page.click('[role="option"]:has-text("Thiếu tài liệu")');

    // Select sections
    await page.check('input[type="checkbox"]'); // Select first section

    // Add comment
    await page.fill('textarea', 'Cần bổ sung bảng kê kinh phí chi tiết.');

    // Submit
    await page.click('button:has-text("Gửi")');

    // Wait for success message or navigation
    await page.waitForTimeout(1000);

    // Verify proposal state changed to CHANGES_REQUESTED
    // Look for the ChangesRequestedBanner
    await expect(page.getByText(/hồ sơ cần sửa trước khi nộp lại/i)).toBeVisible();

    // Verify return reason is displayed
    await expect(page.getByText(/thiếu tài liệu/i)).toBeVisible();

    // Verify "Yêu cầu sửa" button is no longer visible (not FACULTY_REVIEW anymore)
    await expect(page.getByRole('button', { name: /yêu cầu sửa/i })).not.toBeVisible();
  });

  test('AC6: Idempotency - double submit returns 409 Conflict', async ({ page, request }) => {
    await page.goto('/proposals/demo-faculty-review');
    await page.waitForLoadState('networkidle');

    // Get auth token from localStorage
    const token = await page.evaluate(() => localStorage.getItem('auth_token') || '');

    // First request - should succeed
    const firstResponse = await request.post('/api/workflow/demo-faculty-review/return-faculty', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': 'test-idempotency-key-e2e-001',
      },
      data: {
        reasonCode: 'THIEU_TAI_LIEU',
        revisionSections: ['SEC_BUDGET'],
        comment: 'Test comment for idempotency',
      },
    });

    expect(firstResponse.ok()).toBeTruthy();

    // Second request with same idempotency key - should return 409
    const secondResponse = await request.post('/api/workflow/demo-faculty-review/return-faculty', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': 'test-idempotency-key-e2e-001', // Same key
      },
      data: {
        reasonCode: 'NOI_DUNG_KHONG_RO_RANG',
        revisionSections: ['SEC_METHOD'],
        comment: 'This should be rejected',
      },
    });

    expect(secondResponse.status()).toBe(409);
  });

  test('Cancel button closes dialog without submitting', async ({ page }) => {
    await page.goto('/proposals/demo-faculty-review');
    await page.waitForLoadState('networkidle');

    // Click "Yêu cầu sửa" button
    await page.click('button:has-text("Yêu cầu sửa")');

    // Verify dialog is open
    await expect(page.locator('[role="dialog"]').or(page.locator('.dialog'))).toBeVisible();

    // Click Hủy (Cancel)
    await page.click('button:has-text("Hủy")');

    // Verify dialog is closed
    await expect(page.locator('[role="dialog"]').or(page.locator('.dialog'))).not.toBeVisible();

    // Verify proposal state is still FACULTY_REVIEW
    await expect(page.getByRole('button', { name: /yêu cầu sửa/i })).toBeVisible();
  });

  test('ChangesRequestedBanner displays after return', async ({ page }) => {
    // This test assumes a proposal that has already been returned
    await page.goto('/proposals/demo-changes-requested');
    await page.waitForLoadState('networkidle');

    // Verify ChangesRequestedBanner is visible
    await expect(page.getByText(/hồ sơ cần sửa trước khi nộp lại/i)).toBeVisible();

    // Verify warning icon is present
    const banner = page.locator('.bg-amber-50, .bg-yellow-50').or(page.locator('[class*="warning"]'));
    await expect(banner).toBeVisible();

    // Verify return reason is shown
    await expect(page.getByText(/lý do:/i)).toBeVisible();
  });
});

/**
 * Testing Notes:
 *
 * These E2E tests require:
 * 1. Demo/test users to be set up in the database:
 *    - quanly.khoa@demo.vn (QUAN_LY_KHOA role)
 *    - giang.vien@demo.vn (GIANG_VIEN role)
 * 2. Demo proposals with specific states:
 *    - demo-faculty-review: proposal in FACULTY_REVIEW state
 *    - demo-draft: proposal in DRAFT state
 *    - demo-changes-requested: proposal already in CHANGES_REQUESTED state
 *
 * To run these tests:
 * npm run e2e web-apps-e2e
 *
 * Or for specific test file:
 * npx playwright test web-apps-e2e/src/faculty-return.spec.ts
 */
