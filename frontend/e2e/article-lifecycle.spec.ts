import { expect, test } from '@playwright/test';

test('admin can take an article through its public lifecycle', async ({ page }) => {
  const unique = Date.now().toString();
  const title = `Bài kiểm thử ${unique}`;
  const slug = `bai-kiem-thu-${unique}`;
  const editPath = /\/quan-tri\/bai-viet\/[0-9a-f-]{36}$/;
  const apiBase = process.env.E2E_API_BASE_URL ?? 'http://localhost:8080/api/v1';
  const extraArticleIDs: string[] = [];

  await page.goto('/quan-tri/bai-viet/moi');
  await page.getByLabel('Tiêu đề').fill(title);
  await page.locator('input[name="slug"]').fill(slug);
  await page.getByLabel('Tóm tắt').fill('Mô tả dùng để xác minh luồng xuất bản.');
  await page.getByLabel('Thẻ (ngăn cách bằng dấu phẩy)').fill('Golang, Backend');
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
  await page.getByLabel('Tóm tắt').fill('Mô tả đã được cập nhật nhưng slug không đổi.');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.getByRole('button', { name: 'Xuất bản' }).click(),
  ]);
  await expect(page.locator('input[name="slug"]')).toHaveValue(slug);

  await page.goto(`/bai-viet/${slug}`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`/bai-viet/${slug}$`));
  expect(await page.locator('script[type="application/ld+json"]').evaluate((element) => element.innerHTML)).toContain(title);

  for (const viewport of [
    { width: 375, desktopTOC: false },
    { width: 768, desktopTOC: false },
    { width: 1024, desktopTOC: false },
    { width: 1440, desktopTOC: true },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: 900 });
    await page.goto(`/bai-viet/${slug}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    if (viewport.desktopTOC) {
      await expect(page.locator('.toc--desktop')).toBeVisible();
      await expect(page.locator('.toc--compact')).toBeHidden();
      expect(await page.locator('.article-content').evaluate((element) => element.getBoundingClientRect().width)).toBeLessThanOrEqual(768);
    } else {
      await expect(page.locator('.toc--desktop')).toBeHidden();
      await expect(page.locator('.toc--compact > summary')).toBeVisible();
      if (viewport.width === 375) {
        const tocSummary = page.locator('.toc--compact > summary');
        await tocSummary.focus();
        await expect(tocSummary).toBeFocused();
        await tocSummary.press('Enter');
        await expect(page.locator('.toc--compact')).toHaveAttribute('open', '');
      }
    }
  }

  const skipLink = page.getByRole('link', { name: 'Chuyển đến nội dung chính' });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await page.getByRole('link', { name: '#Golang' }).focus();
  await expect(page.getByRole('link', { name: '#Golang' })).toBeFocused();
  expect(await (await page.goto('/sitemap.xml'))?.text()).toContain(`/bai-viet/${slug}`);
  expect(await (await page.goto('/rss.xml'))?.text()).toContain(title);
  expect(await (await page.goto('/robots.txt'))?.text()).toContain('Disallow: /quan-tri/');

  for (const index of Array.from({ length: 10 }, (_, item) => item)) {
    const response = await page.request.post(`${apiBase}/admin/articles`, {
      data: {
        title: `Bài phân trang ${unique}-${index}`,
        slug: `bai-phan-trang-${unique}-${index}`,
        excerpt: 'Bài viết tạo trong E2E để kiểm tra phân trang.',
        content_markdown: '# Phân trang',
        cover_image_url: null,
        tags: [],
        status: 'published',
      },
    });
    expect(response.ok()).toBe(true);
    const created = await response.json() as { data: { id: string } };
    extraArticleIDs.push(created.data.id);
  }
  await page.goto('/');
  const pagination = page.getByRole('navigation', { name: 'Phân trang' });
  await expect(pagination).toBeVisible();
  const secondPage = pagination.getByRole('link', { name: '2', exact: true });
  await secondPage.focus();
  await expect(secondPage).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\?page=2$/);

  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('theme'));
  await page.reload();
  expect(await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(255, 255, 255)');
  const themeToggle = page.locator('[data-theme-toggle]');
  await themeToggle.focus();
  await expect(themeToggle).toBeFocused();
  await page.keyboard.press('Enter');
  const theme = await page.locator('html').getAttribute('data-theme');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme ?? 'light');
  await page.evaluate(() => localStorage.removeItem('theme'));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  expect(await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(23, 23, 23)');
  await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('aria-label', 'Chuyển sang giao diện sáng');
  await page.locator('[data-theme-toggle]').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/quan-tri/bai-viet');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.locator('.admin-table-scroll').focus();
  await expect(page.locator('.admin-table-scroll')).toBeFocused();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(editURL);
  let releasePreviewRequest: () => void = () => {};
  const previewRequest = new Promise<void>((resolve) => { releasePreviewRequest = resolve; });
  const previewPath = '**/admin/markdown/preview';
  await page.route(previewPath, async (route) => {
    await previewRequest;
    await route.continue();
  });
  const previewButton = page.locator('[data-action="preview"]');
  await previewButton.click();
  await expect(page.locator('.editor')).toHaveAttribute('aria-busy', 'true');
  await expect(previewButton).toBeDisabled();
  releasePreviewRequest();
  await expect(page.locator('[data-preview]')).toBeVisible();
  await page.unroute(previewPath);
  const markdownBox = await page.locator('textarea[name="content_markdown"]').boundingBox();
  const previewBox = await page.locator('[data-preview]').boundingBox();
  expect((previewBox?.x ?? 0) > (markdownBox?.x ?? 0)).toBe(true);

  await page.setViewportSize({ width: 1024, height: 900 });
  const stackedMarkdownBox = await page.locator('textarea[name="content_markdown"]').boundingBox();
  const stackedPreviewBox = await page.locator('[data-preview]').boundingBox();
  expect((stackedPreviewBox?.y ?? 0) > (stackedMarkdownBox?.y ?? 0)).toBe(true);

  await page.goto(editURL);
  await page.getByRole('button', { name: 'Lưu nháp' }).click();
  await expect(page.locator('[data-editor-status]')).toHaveText('Đã lưu nháp.');
  const unpublished = await page.goto(`/bai-viet/${slug}`);
  expect(unpublished?.status()).toBe(404);

  await page.goto(editURL);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Xóa vĩnh viễn' }).click();
  await expect(page).toHaveURL('/quan-tri/bai-viet');
  for (const articleID of extraArticleIDs) {
    const response = await page.request.delete(`${apiBase}/admin/articles/${articleID}`);
    expect(response.status()).toBe(204);
  }
});
