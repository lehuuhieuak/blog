import { expect, test } from '@playwright/test';

interface CreatedArticle {
  id: string;
}

function longMarkdown(): string {
  const paragraph = 'Nội dung kiểm thử đủ dài để phần bài viết tiếp tục cuộn trong khi mục lục vẫn ở trong vùng nhìn thấy của trang.';
  const sections = Array.from(
    { length: 32 },
    (_, index) => `## Phần nội dung ${index + 1}\n\n${Array.from({ length: 5 }, () => paragraph).join(' ')}\n\n### Chi tiết phần ${index + 1}\n\n${Array.from({ length: 2 }, () => paragraph).join(' ')}`,
  );

  return ['# Bài viết có mục lục dài', ...sections].join('\n\n');
}

test('TOC stays within the article and highlights the heading at the reading marker', async ({ page }) => {
  const unique = Date.now().toString();
  const apiBase = process.env.E2E_API_BASE_URL ?? 'http://localhost:8080/api/v1';
  const createdArticleIDs: string[] = [];

  async function createArticle(article: { title: string; slug: string; content_markdown: string }): Promise<CreatedArticle> {
    const response = await page.request.post(`${apiBase}/admin/articles`, {
      data: {
        ...article,
        excerpt: 'Bài viết dùng để kiểm tra mục lục sticky.',
        tags: [],
        status: 'published',
      },
    });
    expect(response.ok()).toBe(true);
    const body = await response.json() as { data: CreatedArticle };
    createdArticleIDs.push(body.data.id);
    return body.data;
  }

  try {
    const longArticleSlug = `muc-luc-dai-${unique}`;
    await createArticle({
      title: `Mục lục dài ${unique}`,
      slug: longArticleSlug,
      content_markdown: longMarkdown(),
    });
    await createArticle({
      title: `Bài viết không mục lục ${unique}`,
      slug: `khong-muc-luc-${unique}`,
      content_markdown: '# Bài viết ngắn',
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/bai-viet/${longArticleSlug}`);

    const toc = page.locator('[data-toc-desktop]');
    const tocViewport = toc.locator('[data-slot="scroll-area-viewport"]');
    const sidebar = page.locator('[data-toc-sidebar]');
    await expect(toc).toBeVisible();
    await expect(sidebar).toBeVisible();
    await expect(page.locator('[data-toc-link][aria-current="location"]')).toHaveCount(0);
    expect(await tocViewport.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
    expect(await tocViewport.evaluate((element) => getComputedStyle(element).overflowY)).toBe('scroll');

    await page.evaluate(() => {
      const article = document.querySelector('[data-article-layout] > article');
      if (!article) throw new Error('Article is missing');
      window.scrollTo({ top: article.getBoundingClientRect().top + window.scrollY + 1000 });
    });
    await expect.poll(() => sidebar.evaluate((element) => element.getBoundingClientRect().top)).toBeCloseTo(32, 1);

    const articleURL = page.url();
    await page.evaluate(() => {
      const heading = document.getElementById('chi-tiet-phan-10');
      if (!heading) throw new Error('Heading is missing');
      const readingMarker = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) * 6;
      window.scrollTo({ top: window.scrollY + heading.getBoundingClientRect().top - readingMarker + 8 });
    });
    await expect(toc.locator('[data-toc-target="chi-tiet-phan-10"]')).toHaveAttribute('aria-current', 'location');
    await expect(page.locator('[data-toc-link][aria-current="location"]')).toHaveCount(1);
    expect(page.url()).toBe(articleURL);

    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await expect(page.locator('[data-toc-link][aria-current="location"]')).toHaveCount(0);

    const lastTOCLink = toc.locator('a').last();
    await lastTOCLink.focus();
    await expect(lastTOCLink).toBeFocused();
    await expect(lastTOCLink).toBeVisible();
    const fragmentTOCLink = toc.locator('[data-toc-target="chi-tiet-phan-20"]');
    await fragmentTOCLink.focus();
    await fragmentTOCLink.press('Enter');
    await expect(page).toHaveURL(/#chi-tiet-phan-20$/);
    await expect(fragmentTOCLink).toHaveAttribute('aria-current', 'location');

    await page.locator('[data-site-footer]').scrollIntoViewIfNeeded();
    const endPositions = await page.evaluate(() => {
      const tocElement = document.querySelector('[data-toc-desktop]');
      const footer = document.querySelector('[data-site-footer]');
      if (!tocElement || !footer) throw new Error('TOC or footer is missing');
      return {
        footerTop: footer.getBoundingClientRect().top,
        tocBottom: tocElement.getBoundingClientRect().bottom,
      };
    });
    expect(endPositions.tocBottom).toBeLessThanOrEqual(endPositions.footerTop + 1);

    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(`/bai-viet/${longArticleSlug}`);
    const compactTOC = page.locator('[data-toc-mobile]');
    await expect(compactTOC.locator('[data-slot="accordion-trigger"]')).toHaveAttribute('aria-expanded', 'false');
    await page.evaluate(() => {
      const heading = document.getElementById('phan-noi-dung-10');
      if (!heading) throw new Error('Heading is missing');
      const readingMarker = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) * 6;
      window.scrollTo({ top: window.scrollY + heading.getBoundingClientRect().top - readingMarker + 8 });
    });
    await expect(compactTOC.locator('[data-slot="accordion-trigger"]')).toHaveAttribute('aria-expanded', 'false');
    const activeCompactLink = compactTOC.locator('[data-toc-target="phan-noi-dung-10"]');
    await compactTOC.locator('[data-slot="accordion-trigger"]').click();
    await expect(activeCompactLink).toBeVisible();

    await page.goto(`/bai-viet/khong-muc-luc-${unique}`);
    await expect(page.locator('[data-toc-desktop]')).toHaveCount(0);
    await expect(page.locator('[data-toc-mobile]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  } finally {
    for (const articleID of createdArticleIDs) {
      await page.request.delete(`${apiBase}/admin/articles/${articleID}`);
    }
  }
});
