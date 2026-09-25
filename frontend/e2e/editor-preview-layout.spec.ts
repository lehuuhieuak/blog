import { expect, test, type Page } from '@playwright/test';

import { adminAPIUrl, adminOriginHeaders, authenticateAdmin } from './helpers/admin-auth';

async function expectEditorFieldGaps(page: Page) {
  const titleBox = await page.locator('input[name="title"]').locator('..').boundingBox();
  const metadataBox = await page.locator('section[aria-labelledby="metadata-title"]').boundingBox();
  const markdownBox = await page.locator('section').filter({ has: page.locator('textarea[name="content_markdown"]') }).boundingBox();

  expect(titleBox).not.toBeNull();
  expect(metadataBox).not.toBeNull();
  expect(markdownBox).not.toBeNull();
  expect(metadataBox!.y - (titleBox!.y + titleBox!.height)).toBeCloseTo(32, 0);
  expect(markdownBox!.y - (metadataBox!.y + metadataBox!.height)).toBeCloseTo(32, 0);

  return markdownBox!;
}

test('a long preview does not spread out the editor fields', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await authenticateAdmin(page);

  const unique = Date.now().toString();
  const response = await page.request.post(adminAPIUrl('admin/articles'), {
    headers: adminOriginHeaders(),
    data: {
      title: `Kiểm tra bố cục ${unique}`,
      slug: `kiem-tra-bo-cuc-${unique}`,
      excerpt: 'Bài nháp dùng để kiểm tra bố cục bản xem trước.',
      content_markdown: Array.from(
        { length: 48 },
        (_, index) => `## Mục ${index + 1}\n\nNội dung đủ dài để bản xem trước cao hơn cột nhập liệu.`,
      ).join('\n\n'),
      tags: [],
      status: 'draft',
    },
  });
  expect(response.status()).toBe(201);
  const article = await response.json() as { data: { id: string } };

  try {
    await page.goto(`/admin/articles/${article.data.id}`);
    await expect(page.locator('.editor')).toHaveAttribute('data-editor-ready', 'true');

    await page.getByRole('button', { name: 'Xem trước' }).click();
    await expect(page.locator('[data-preview]')).toBeVisible();

    await expectEditorFieldGaps(page);

    await page.setViewportSize({ width: 375, height: 900 });
    const markdownBox = await expectEditorFieldGaps(page);
    const previewBox = await page.locator('[data-preview]').boundingBox();
    expect(previewBox).not.toBeNull();
    expect(previewBox!.y).toBeGreaterThan(markdownBox.y + markdownBox.height);
  } finally {
    const cleanup = await page.request.delete(adminAPIUrl(`admin/articles/${article.data.id}`), {
      headers: adminOriginHeaders(),
    });
    expect(cleanup.status()).toBe(204);
  }
});

test('the new article workspace keeps its desktop column placement', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await authenticateAdmin(page);
  await page.goto('/admin/articles/new');
  await expect(page.locator('.editor')).toHaveAttribute('data-editor-ready', 'true');

  const titleBox = await page.locator('input[name="title"]').locator('..').boundingBox();
  const metadataBox = await page.locator('section[aria-labelledby="metadata-title"]').boundingBox();
  const markdownBox = await page.locator('section').filter({ has: page.locator('textarea[name="content_markdown"]') }).boundingBox();
  const previewBox = await page.locator('#preview-title').locator('..').boundingBox();

  expect(titleBox).not.toBeNull();
  expect(metadataBox).not.toBeNull();
  expect(markdownBox).not.toBeNull();
  expect(previewBox).not.toBeNull();
  expect(metadataBox!.x).toBeLessThan(titleBox!.x);
  expect(markdownBox!.x).toBeCloseTo(titleBox!.x, 0);
  expect(previewBox!.x).toBeCloseTo(titleBox!.x, 0);
  expect(markdownBox!.y).toBeGreaterThan(titleBox!.y + titleBox!.height);
  expect(previewBox!.y).toBeGreaterThan(markdownBox!.y + markdownBox!.height);
});
