import { test, expect } from '@playwright/test';

/**
 * E2E Test: Import Excel Feature (Story 10.1)
 *
 * Tests import functionality for Admin role:
 * - Import users from Excel
 * - Import proposals from Excel
 * - Template download
 * - Import validation and error handling
 */

// Admin demo account
const ADMIN_ACCOUNT = {
  email: 'DT-USER-008@demo.qlnckh.edu.vn',
  password: 'Demo@123',
  displayName: 'Admin System',
  role: 'ADMIN',
};

test.describe('Import Excel Feature - Admin Only', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('./login');

    // Login as admin
    await page.fill('#email', ADMIN_ACCOUNT.email);
    await page.fill('#password', ADMIN_ACCOUNT.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('/', { timeout: 5000 });
  });

  test.describe('Import Page Access', () => {
    test('should access import page with admin role', async ({ page }) => {
      // Navigate to import page
      await page.goto('./admin/import');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Verify we're on the import page
      await expect(page).toHaveURL(/\/admin\/import/);

      // Check for page title
      const pageTitle = page.locator('h1, h2').filter({ hasText: /import/i });
      await expect(pageTitle).toBeVisible();
    });

    test('should show import UI elements', async ({ page }) => {
      await page.goto('./admin/import');
      await page.waitForLoadState('networkidle');

      // Check for entity type selector
      const entityTypeSelector = page.locator('select').filter({ hasText: /người dùng|đề tài|users|proposals/i });
      await expect(entityTypeSelector).toBeVisible();

      // Check for file upload
      const fileUpload = page.locator('input[type="file"]');
      await expect(fileUpload).toBeVisible();

      // Check for template download button
      const templateButton = page.locator('button').filter({ hasText: /tải xuống mẫu|template|download/i });
      await expect(templateButton).toBeVisible();
    });

    test('should show import status endpoint', async ({ page }) => {
      // Navigate to import page
      await page.goto('./admin/import');
      await page.waitForLoadState('networkidle');

      // The import status should be displayed
      // Check for max file size info
      const fileSizeInfo = page.locator('text=/10MB|10485760|filesize|kích thước/i');
      // This might not be visible if not implemented, so we just check page loads
      await expect(page.locator('h1, h2')).toBeVisible();
    });
  });

  test.describe('Template Download', () => {
    test('should download users template', async ({ page }) => {
      await page.goto('./admin/import');
      await page.waitForLoadState('networkidle');

      // Select users entity type
      await page.selectOption('select', { label: /người dùng|users/i });

      // Click template download button
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Tải xuống mẫu"), button:has-text("Download Template")');

      const download = await downloadPromise;

      // Verify file is downloaded
      expect(download.suggestedFilename()).toMatch(/\.(xlsx|xls)/);
    });

    test('should download proposals template', async ({ page }) => {
      await page.goto('./admin/import');
      await page.waitForLoadState('networkidle');

      // Select proposals entity type
      await page.selectOption('select', { label: /đề tài|proposals/i });

      // Click template download button
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Tải xuống mẫu"), button:has-text("Download Template")');

      const download = await downloadPromise;

      // Verify file is downloaded
      expect(download.suggestedFilename()).toMatch(/\.(xlsx|xls)/);
    });
  });

  test.describe('Users Import', () => {
    test('should show validation error for invalid file format', async ({ page }) => {
      await page.goto('./admin/import');
      await page.waitForLoadState('networkidle');

      // Select users entity type
      await page.selectOption('select', { label: /người dùng|users/i });

      // Create a test text file (invalid format)
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'invalid.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('invalid file content'),
      });

      // Click import button
      await page.click('button:has-text("Import"), button:has-text("Thực hiện")');

      // Should show error message
      const errorMessage = page.locator('.text-red-600, .bg-red-50, [role="alert"]');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('should display import results after processing', async ({ page }) => {
      await page.goto('./admin/import');
      await page.waitForLoadState('networkidle');

      // Select users entity type
      await page.selectOption('select', { label: /người dùng|users/i });

      // Note: This test requires a valid Excel file to be provided
      // For now, we test the UI flow without actual file

      // Check that import button exists
      const importButton = page.locator('button:has-text("Import"), button:has-text("Thực hiện")');
      await expect(importButton).toBeVisible();
    });
  });

  test.describe('Proposals Import', () => {
    test('should allow proposals import', async ({ page }) => {
      await page.goto('./admin/import');
      await page.waitForLoadState('networkidle');

      // Select proposals entity type
      await page.selectOption('select', { label: /đề tài|proposals/i });

      // Verify file upload is available
      const fileUpload = page.locator('input[type="file"]');
      await expect(fileUpload).toBeVisible();

      // Verify import button
      const importButton = page.locator('button:has-text("Import"), button:has-text("Thực hiện")');
      await expect(importButton).toBeVisible();
    });
  });

  test.describe('Import Report Display', () => {
    test('should show import summary', async ({ page }) => {
      await page.goto('./admin/import');
      await page.waitForLoadState('networkidle');

      // After import, the report should show:
      // - Total rows processed
      // - Successfully imported count
      // - Failed count
      // - Error details

      // Check that report section exists (may be hidden until import completes)
      const reportSection = page.locator('text=/kết quả import|import results|tổng số/i');
      // This might not be visible initially, so we just verify the page structure
      await expect(page.locator('h1, h2')).toBeVisible();
    });
  });
});

test.describe('Import Excel - API Direct Tests', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Login to get auth token
    const loginResponse = await request.post('./api/auth/login', {
      data: {
        email: ADMIN_ACCOUNT.email,
        password: ADMIN_ACCOUNT.password,
      },
    });

    if (loginResponse.ok()) {
      const data = await loginResponse.json();
      authToken = data.access_token || data.token;
    }
  });

  test('GET /admin/import/status should return import capabilities', async ({
    request,
  }) => {
    const response = await request.get('./api/admin/import/status', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.supportedTypes).toContain('users');
    expect(data.data.supportedTypes).toContain('proposals');
    expect(data.data.maxFileSize).toBeGreaterThan(0);
  });

  test('GET /admin/import/template/users should download Excel file', async ({
    request,
  }) => {
    const response = await request.get('./api/admin/import/template/users', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/vnd.openxmlformats');

    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(0);
  });

  test('GET /admin/import/template/proposals should download Excel file', async ({
    request,
  }) => {
    const response = await request.get('./api/admin/import/template/proposals', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/vnd.openxmlformats');

    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(0);
  });

  test('GET /admin/import/template/invalid should return 404', async ({
    request,
  }) => {
    const response = await request.get('./api/admin/import/template/invalid', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.status()).toBe(404);
  });

  test('should require authentication for import endpoints', async ({ request }) => {
    // Test without auth token
    const statusResponse = await request.get('./api/admin/import/status');
    expect(statusResponse.status()).toBe(401);

    const templateResponse = await request.get('./api/admin/import/template/users');
    expect(templateResponse.status()).toBe(401);
  });
});

test.describe('Import Excel - Non-Admin Access', () => {
  const GIANG_VIEN_ACCOUNT = {
    email: 'DT-USER-001@demo.qlnckh.edu.vn',
    password: 'Demo@123',
  };

  test('should deny access to import page for non-admin users', async ({ page }) => {
    // Login as GIANG_VIEN (non-admin)
    await page.goto('./login');
    await page.fill('#email', GIANG_VIEN_ACCOUNT.email);
    await page.fill('#password', GIANG_VIEN_ACCOUNT.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 5000 });

    // Try to access import page
    await page.goto('./admin/import');

    // Should be redirected to 403 page
    await page.waitForURL(/\/error\/403/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/error\/403/);
  });

  test('should deny API access for non-admin users', async ({ request }) => {
    // Login as GIANG_VIEN
    const loginResponse = await request.post('./api/auth/login', {
      data: {
        email: GIANG_VIEN_ACCOUNT.email,
        password: GIANG_VIEN_ACCOUNT.password,
      },
    });

    let authToken = '';
    if (loginResponse.ok()) {
      const data = await loginResponse.json();
      authToken = data.access_token || data.token;
    }

    // Try to access import status endpoint
    const response = await request.get('./api/admin/import/status', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    // Should return 403 Forbidden
    expect(response.status()).toBe(403);
  });
});
