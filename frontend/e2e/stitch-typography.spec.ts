import { expect, test } from '@playwright/test';

test('Stitch typography uses loaded Geist fonts and stays readable across layouts', async ({ page }) => {
  const apiBase = process.env.E2E_API_BASE_URL ?? 'http://localhost:8080/api/v1';
  const slug = `stitch-typography-${Date.now()}`;
  const response = await page.request.post(`${apiBase}/admin/articles`, {
    data: {
      title: 'Tiếng Việt: Những ghi chép về thiết kế và mã nguồn',
      slug,
      excerpt: 'Kiểm tra dấu tiếng Việt, kiểu chữ và bố cục trên màn hình nhỏ.',
      content_markdown: '## Nội dung tiếng Việt\n\nMột đoạn văn có **chữ đậm**, chữ nghiêng và `inlineCode`.\n\n```go\nfunc main() {\n    println("Xin chào")\n}\n```',
      tags: ['Stitch typography'],
      status: 'published',
    },
  });
  expect(response.ok()).toBe(true);
  const { data: article } = await response.json() as { data: { id: string; tags: { slug: string }[] } };

  try {
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme });
        for (const route of ['/', '/gioi-thieu', '/404', `/the/${article.tags[0].slug}`, `/bai-viet/${slug}`, '/quan-tri/bai-viet', '/quan-tri/bai-viet/moi', `/quan-tri/bai-viet/${article.id}`]) {
          await page.goto(route);
          await page.evaluate(() => document.fonts.ready);
          expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `${route} at ${width}`).toBe(false);
          const mainBox = await page.locator('main').boundingBox();
          expect(mainBox?.x, `${route} keeps a reading gutter`).toBeGreaterThanOrEqual(16);
          if (width === 1440 && (route.endsWith('/moi') || route.endsWith(article.id))) {
            const expectedSize = route.endsWith('/moi') ? 32 : 20;
            expect(await page.locator('input[name=title]').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBe(expectedSize);
          }
          const heading = page.locator('h1');
          await expect(heading).toBeVisible();
          expect(await heading.evaluate(element => getComputedStyle(element).fontFamily)).toContain('Geist');
          expect(await page.evaluate(() => [...document.fonts].some(font => font.family.includes('Geist') && !font.family.includes('Fallback') && font.status === 'loaded'))).toBe(true);
        }
      }
    }
    await page.goto(`/bai-viet/${slug}`);
    await page.evaluate(() => document.fonts.ready);
    const code = page.locator('.article-content pre code');
    await expect(code).toBeVisible();
    expect(await code.evaluate(element => getComputedStyle(element).fontFamily)).toMatch(/Geist.?Mono/i);
    // Ask Chromium which font drew the glyphs, using a leaf token in highlighted code.
    // Chroma nests spans; querying its outer code wrapper may return no direct glyphs.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument');
    for (const [selector, expected] of [['h1', /Geist/i], ['.article-content pre code .chroma-kd', /Geist.?Mono/i]] as const) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      expect(fonts.some(font => expected.test(font.familyName) && font.isCustomFont && font.glyphCount > 0), `${selector}: ${JSON.stringify(fonts)}`).toBe(true);
    }
    await cdp.detach();
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/quan-tri/bai-viet/moi');
    for (const selector of ['input[name="slug"]', 'textarea[name="content_markdown"]']) {
      const field = page.locator(selector);
      expect(await field.evaluate(element => getComputedStyle(element).fontFamily)).toMatch(/Geist.?Mono/i);
      expect(await field.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    }
  } finally {
    const deleted = await page.request.delete(`${apiBase}/admin/articles/${article.id}`);
    expect(deleted.status()).toBe(204);
  }
});
