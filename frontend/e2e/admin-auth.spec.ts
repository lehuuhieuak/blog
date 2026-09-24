import { expect, test, type APIResponse, type Page } from '@playwright/test';

import { adminAPIUrl, adminOriginHeaders, authenticateAdmin } from './helpers/admin-auth';

const validCredentials = {
  username: 'admin',
  password: 'Hieu1234@@',
};

async function submitCredentials(page: Page, credentials = validCredentials) {
  await page.getByLabel('Tên đăng nhập').fill(credentials.username);
  await page.getByLabel('Mật khẩu').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
}

async function expectErrorCode(response: APIResponse, status: number, code: string) {
  expect(response.status()).toBe(status);
  const body = await response.json() as { error: { code: string } };
  expect(body.error.code).toBe(code);
}

test('redirects an unauthenticated admin visit to login with its requested path', async ({ page }) => {
  await page.goto('/admin/articles/new');

  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Farticles%2Fnew$/);
});

test('rejects wrong credentials with the generic login error', async ({ page }) => {
  await page.goto('/admin/login');
  await submitCredentials(page, { username: 'admin', password: 'wrong-password' });

  await expect(page.getByText('Không thể đăng nhập. Vui lòng kiểm tra thông tin và thử lại.')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test('valid credentials return to the requested admin page', async ({ page }) => {
  await page.goto('/admin/articles/new');
  await submitCredentials(page);

  await expect(page).toHaveURL(/\/admin\/articles\/new$/);
  await expect(page.locator('.editor')).toHaveAttribute('data-editor-ready', 'true');
});

test('admin article API rejects requests without a session', async ({ page }) => {
  const response = await page.request.get(adminAPIUrl('admin/articles'));

  await expectErrorCode(response, 401, 'unauthorized');
});

test('authenticated unsafe admin API requests require the exact Origin', async ({ page }) => {
  await authenticateAdmin(page);

  const wrongOrigin = await page.request.post(adminAPIUrl('admin/markdown/preview'), {
    headers: adminOriginHeaders('https://evil.example'),
    data: { markdown: '# Preview' },
  });
  const missingOrigin = await page.request.post(adminAPIUrl('admin/markdown/preview'), {
    data: { markdown: '# Preview' },
  });

  await expectErrorCode(wrongOrigin, 403, 'csrf_failed');
  await expectErrorCode(missingOrigin, 403, 'csrf_failed');
});

test('logout clears the session before the next protected visit', async ({ page }) => {
  await authenticateAdmin(page);
  await page.goto('/admin/articles');
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);

  await page.goto('/admin/articles');

  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Farticles$/);
});

test('unsafe next values fall back to the admin article list', async ({ page }) => {
  for (const next of ['https://evil.example', '//evil.example']) {
    await page.goto(`/admin/login?next=${encodeURIComponent(next)}`);
    await submitCredentials(page);
    await expect(page).toHaveURL(/\/admin\/articles$/);
  }
});
