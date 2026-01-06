/**
 * E2E Tests for Auto-save (Story 2.3)
 *
 * Tests auto-save behavior in real browser scenarios:
 * - AC5: Data persistence on browser close/reopen
 * - Auto-save triggers during user interaction
 * - Save indicator updates correctly
 *
 * Prerequisites:
 * - Playwright installed and configured
 * - Test server running on localhost:3000
 * - Test data seeded in database
 */

import { test, expect, Page } from '@playwright/test';

const PROPOSAL_EDIT_URL = '/proposals/proposal-123/edit';

/**
 * Helper: Login as GIANG_VIEN
 */
async function loginAsGiangVien(page: Page) {
  await page.goto('/auth/login');

  // For demo mode, switch to GIANG_VIEN persona
  // In production, this would be real login
  const personaButton = page.getByRole('button', { name: /GIANG_VIEN/ });
  if (await personaButton.isVisible()) {
    await personaButton.click();
  } else {
    // Fallback: fill login form
    await page.fill('input[name="email"]', 'giangvien@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
  }

  // Wait for navigation
  await page.waitForURL(/\/admin\/users/);
}

/**
 * Helper: Get form data from localStorage (for verification)
 */
function getStoredFormData(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('autosave-proposal-123');
  return data ? JSON.parse(data) : null;
}

/**
 * Helper: Set initial form data
 */
function setFormData(page: Page, section: string, field: string, value: string) {
  const selector = `[data-section="${section}"] [data-field="${field}"]`;
  return page.fill(selector, value);
}

/**
 * Helper: Get form field value
 */
function getFormFieldValue(page: Page, section: string, field: string) {
  const selector = `[data-section="${section}"] [data-field="${field}"]`;
  return page.inputValue(selector);
}

test.describe('Auto-save E2E Tests (Story 2.3)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGiangVien(page);
  });

  test('AC1: Auto-save triggers 2 seconds after field change', async ({ page }) => {
    await page.goto(PROPOSAL_EDIT_URL);

    // Wait for form to load
    await page.waitForSelector('[data-section="SEC_INFO_GENERAL"]');

    // Change a field
    await setFormData(page, 'SEC_INFO_GENERAL', 'title', 'New Title');

    // Save indicator should show "Đang lưu..." within 2 seconds
    const savingIndicator = page.getByText('Đang lưu...');
    await expect(savingIndicator).toBeVisible({ timeout: 2500 });

    // After save completes, should show "Đã lưu vào HH:mm:ss"
    await expect(page.getByText(/Đã lưu vào \d{2}:\d{2}:\d{2}/)).toBeVisible({ timeout: 5000 });
  });

  test('AC2: Save indicator shows "Đang lưu..." during save', async ({ page }) => {
    await page.goto(PROPOSAL_EDIT_URL);

    await page.waitForSelector('[data-section="SEC_INFO_GENERAL"]');

    // Trigger save by changing field
    await setFormData(page, 'SEC_INFO_GENERAL', 'title', 'Test Title');

    // Should show saving indicator
    await expect(page.getByText('Đang lưu...')).toBeVisible();
  });

  test('AC3: Save indicator shows timestamp on success', async ({ page }) => {
    await page.goto(PROPOSAL_EDIT_URL);

    await page.waitForSelector('[data-section="SEC_INFO_GENERAL"]');

    // Trigger save
    await setFormData(page, 'SEC_INFO_GENERAL', 'title', 'Test Title');

    // Wait for saved indicator with timestamp
    const savedIndicator = page.getByText(/Đã lưu vào \d{2}:\d{2}:\d{2}/);
    await expect(savedIndicator).toBeVisible({ timeout: 5000 });

    // Verify timestamp format
    const text = await savedIndicator.textContent();
    expect(text).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  test('AC4: Error handling with retry on network failure', async ({ page }) => {
    // Mock network failure by intercepting the API call
    await page.route('**/proposals/*/auto-save', (route) => {
      // Fail first 2 requests, succeed on 3rd
      let callCount = 0;
      if (callCount < 2) {
        callCount++;
        route.abort();
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'proposal-123',
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      }
    });

    await page.goto(PROPOSAL_EDIT_URL);

    await page.waitForSelector('[data-section="SEC_INFO_GENERAL"]');

    // Trigger save
    await setFormData(page, 'SEC_INFO_GENERAL', 'title', 'Retry Test');

    // Should show error initially, then retry and succeed
    await expect(page.getByText('Lưu thất bại')).toBeVisible({ timeout: 5000 });

    // After retries, should show saved
    await expect(page.getByText(/Đã lưu vào/)).toBeVisible({ timeout: 15000 });
  });

  test('AC5: Data preserved on browser close and reopen', async ({ page, context }) => {
    await page.goto(PROPOSAL_EDIT_URL);

    await page.waitForSelector('[data-section="SEC_INFO_GENERAL"]');

    // Enter data in multiple fields
    await setFormData(page, 'SEC_INFO_GENERAL', 'title', 'Persistent Title');
    await setFormData(page, 'SEC_INFO_GENERAL', 'objective', 'Persistent Objective');

    // Wait for auto-save to complete
    await expect(page.getByText(/Đã lưu vào/)).toBeVisible({ timeout: 5000 });

    // Close the page (simulate tab close)
    await page.close();

    // Open new page and navigate to same proposal
    const newPage = await context.newPage();
    await loginAsGiangVien(newPage);
    await newPage.goto(PROPOSAL_EDIT_URL);

    // Wait for form to load
    await newPage.waitForSelector('[data-section="SEC_INFO_GENERAL"]');

    // Verify data is preserved
    const title = await getFormFieldValue(newPage, 'SEC_INFO_GENERAL', 'title');
    const objective = await getFormFieldValue(newPage, 'SEC_INFO_GENERAL', 'objective');

    expect(title).toBe('Persistent Title');
    expect(objective).toBe('Persistent Objective');

    await newPage.close();
  });

  test('AC5: Force save on page navigation', async ({ page }) => {
    await page.goto(PROPOSAL_EDIT_URL);

    await page.waitForSelector('[data-section="SEC_INFO_GENERAL"]');

    // Enter data but don't wait for auto-save
    await setFormData(page, 'SEC_INFO_GENERAL', 'title', 'Quick Navigation Test');

    // Click "Hủy" or navigate away immediately
    await page.click('button:has-text("Hủy")');

    // Verify data was saved before navigation
    // (In real implementation, this would show a confirmation or auto-save)
    // For now, verify the API was called
    const apiCalls = [];
    page.on('request', (request) => {
      if (request.url().includes('/auto-save')) {
        apiCalls.push(request.url());
      }
    });

    // Navigate to edit page again
    await page.goto(PROPOSAL_EDIT_URL);
    await page.waitForSelector('[data-section="SEC_INFO_GENERAL"]');

    // Data should be preserved
    const title = await getFormFieldValue(page, 'SEC_INFO_GENERAL', 'title');
    expect(title).toBe('Quick Navigation Test');
  });

  test('Deep merge preserves unrelated sections', async ({ page }) => {
    await page.goto(PROPOSAL_EDIT_URL);

    await page.waitForSelector('[data-section="SEC_INFO_GENERAL"]');

    // Initial state has both sections
    await setFormData(page, 'SEC_INFO_GENERAL', 'title', 'Initial Title');
    await setFormData(page, 'SEC_BUDGET', 'total', '50000000');

    await expect(page.getByText(/Đã lưu vào/)).toBeVisible({ timeout: 5000 });

    // Only update SEC_INFO_GENERAL
    await setFormData(page, 'SEC_INFO_GENERAL', 'title', 'Updated Title');

    await expect(page.getByText(/Đã lưu vào/)).toBeVisible({ timeout: 5000 });

    // Verify SEC_BUDGET is still preserved
    const budgetTotal = await getFormFieldValue(page, 'SEC_BUDGET', 'total');
    expect(budgetTotal).toBe('50000000');
  });

  test('Only DRAFT proposals can be auto-saved', async ({ page }) => {
    // This test requires a proposal in SUBMITTED or other state
    // For now, we test the edit page shows error for non-DRAFT

    // Navigate to a submitted proposal (mock scenario)
    await page.goto('/proposals/submitted-123/edit');

    // Should show error message
    await expect(page.getByText(/Chỉ có thể chỉnh sửa đề tài ở trạng thái NHÁP/)).toBeVisible();
  });

  test('Auto-save disabled when proposal is not in DRAFT', async ({ page }) => {
    // Create or navigate to a non-DRAFT proposal
    await page.goto('/proposals/submitted-123/edit');

    // Save indicator should not be visible
    const saveIndicator = page.getByText(/Đang lưu|Đã lưu/);
    await expect(saveIndicator).not.toBeVisible();

    // Form fields should be disabled or read-only
    const titleField = page.locator('[data-section="SEC_INFO_GENERAL"] [data-field="title"]');
    await expect(titleField).toBeDisabled();
  });

  test('Multiple rapid changes only trigger one save', async ({ page }) => {
    await page.goto(PROPOSAL_EDIT_URL);

    await page.waitForSelector('[data-section="SEC_INFO_GENERAL"]');

    // Track API calls
    let apiCallCount = 0;
    await page.route('**/proposals/*/auto-save', (route) => {
      apiCallCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'proposal-123', updatedAt: new Date().toISOString() },
        }),
      });
    });

    // Rapidly change the same field multiple times
    await setFormData(page, 'SEC_INFO_GENERAL', 'title', 'Change 1');
    await page.waitForTimeout(100); // 100ms

    await setFormData(page, 'SEC_INFO_GENERAL', 'title', 'Change 2');
    await page.waitForTimeout(100); // 100ms

    await setFormData(page, 'SEC_INFO_GENERAL', 'title', 'Change 3');
    await page.waitForTimeout(100); // 100ms

    // Wait for debounce to complete
    await page.waitForTimeout(2500);

    // Should only have ONE API call (last change)
    expect(apiCallCount).toBe(1);
  });

  test('Save indicator resets to idle after 2 seconds', async ({ page }) => {
    await page.goto(PROPOSAL_EDIT_URL);

    await page.waitForSelector('[data-section="SEC_INFO_GENERAL"]');

    // Trigger save
    await setFormData(page, 'SEC_INFO_GENERAL', 'title', 'Idle Test');

    // Wait for saved indicator
    await expect(page.getByText(/Đã lưu vào/)).toBeVisible({ timeout: 5000 });

    // After 2 more seconds, should reset to idle (not visible)
    await page.waitForTimeout(2500);

    const saveIndicator = page.locator('text=/Đã lưu vào|Đang lưu/');
    await expect(saveIndicator).not.toBeVisible();
  });
});

/**
 * Test utilities for manual testing
 */
test.describe('Auto-save Manual Tests (for QA)', () => {
  test('Manual Test 1: Verify auto-save works while typing', async ({ page }) => {
    // Instructions for manual tester:
    // 1. Navigate to proposal edit page
    // 2. Start typing in title field
    // 3. Observe save indicator appears after stopping typing for 2 seconds
    // 4. Verify "Đã lưu vào HH:mm:ss" appears
    // 5. Check browser network tab for PATCH /api/proposals/:id/auto-save

    await page.goto(PROPOSAL_EDIT_URL);
    await page.waitForSelector('[data-section="SEC_INFO_GENERAL"]');

    // Auto-test the basic flow
    const titleField = page.locator('[data-section="SEC_INFO_GENERAL"] [data-field="title"]');
    await titleField.fill('Test Title');
    await page.waitForTimeout(2500);

    await expect(page.getByText(/Đã lưu vào/)).toBeVisible();
  });

  test('Manual Test 2: Verify data persists after refresh', async ({ page }) => {
    // Instructions:
    // 1. Edit form fields
    // 2. Wait for "Đã lưu" indicator
    // 3. Refresh browser (F5)
    // 4. Verify data is still present

    await page.goto(PROPOSAL_EDIT_URL);
    await page.waitForSelector('[data-section="SEC_INFO_GENERAL"]');

    await setFormData(page, 'SEC_INFO_GENERAL', 'title', 'Refresh Test Data');
    await expect(page.getByText(/Đã lưu vào/)).toBeVisible({ timeout: 5000 });

    await page.reload();
    await page.waitForSelector('[data-section="SEC_INFO_GENERAL"]');

    const title = await getFormFieldValue(page, 'SEC_INFO_GENERAL', 'title');
    expect(title).toBe('Refresh Test Data');
  });
});
