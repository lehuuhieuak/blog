import { expect, test } from '@playwright/test';

test('admin can take an article through its public lifecycle', async ({ page }) => {
  const unique = Date.now().toString();
  const title = `Bài kiểm thử ${unique}`;
  const slug = `bai-kiem-thu-${unique}`;
  const editPath = /\/quan-tri\/bai-viet\/[0-9a-f-]{36}$/;

  await page.goto('/quan-tri/bai-viet/moi');
  await page.getByLabel('Tiêu đề').fill(title);
  await page.locator('input[name="slug"]').fill(slug);
  await page.getByLabel('Excerpt').fill('Mô tả dùng để xác minh luồng xuất bản.');
  await page.getByLabel('Tags (ngăn cách bằng dấu phẩy)').fill('Golang, Backend');
  await page.getByLabel('Nội dung Markdown').fill('# Mở đầu\n\n## Phần xem trước\n\nNội dung kiểm thử.');
  await page.getByRole('button', { name: 'Lưu nháp' }).click();
  await expect(page).toHaveURL(editPath);
  const editURL = page.url();

  await page.goto('/');
  await expect(page.getByRole('link', { name: title })).toHaveCount(0);

  await page.goto(editURL);
  await page.getByRole('button', { name: 'Xem trước' }).click();
  await expect(page.locator('[data-preview-content]')).toContainText('Phần xem trước');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.getByRole('button', { name: 'Xuất bản' }).click(),
  ]);

  await page.goto('/');
  await expect(page.getByRole('link', { name: title })).toBeVisible();
  await page.goto(`/the/golang`);
  await expect(page.getByRole('link', { name: title })).toBeVisible();

  await page.goto(editURL);
  const slugInput = page.locator('input[name="slug"]');
  await expect(slugInput).toBeDisabled();
  await expect(slugInput).toHaveValue(slug);
  await page.getByLabel('Excerpt').fill('Mô tả đã được cập nhật nhưng slug không đổi.');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.getByRole('button', { name: 'Xuất bản' }).click(),
  ]);
  await expect(page.locator('input[name="slug"]')).toHaveValue(slug);

  await page.goto(`/bai-viet/${slug}`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`/bai-viet/${slug}$`));
  expect(await page.locator('script[type="application/ld+json"]').evaluate((element) => element.innerHTML)).toContain(title);
  expect(await (await page.goto('/sitemap.xml'))?.text()).toContain(`/bai-viet/${slug}`);
  expect(await (await page.goto('/rss.xml'))?.text()).toContain(title);
  expect(await (await page.goto('/robots.txt'))?.text()).toContain('Disallow: /quan-tri/');

  await page.goto('/');
  await page.locator('[data-theme-toggle]').click();
  const theme = await page.locator('html').getAttribute('data-theme');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme ?? 'light');

  await page.goto(editURL);
  await page.getByRole('button', { name: 'Lưu nháp' }).click();
  await expect(page.locator('[data-editor-status]')).toHaveText('Đã lưu nháp.');
  const unpublished = await page.goto(`/bai-viet/${slug}`);
  expect(unpublished?.status()).toBe(404);

  await page.goto(editURL);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Xóa vĩnh viễn' }).click();
  await expect(page).toHaveURL('/quan-tri/bai-viet');
});
