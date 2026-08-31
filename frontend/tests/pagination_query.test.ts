import { expect, it } from 'vitest';
import { pageHref } from '../src/lib/pagination';

it('preserves existing query parameters when changing page', () => {
  expect(pageHref('/quan-tri/bai-viet?status=draft', 3)).toBe('/quan-tri/bai-viet?status=draft&page=3');
});
