import { describe, expect, it } from 'vitest';
import { pageHref, pageNumbers } from '../src/lib/pagination';

describe('pagination helpers', () => {
  it('keeps pagination within available pages', () => {
    expect(pageNumbers(1, 8)).toEqual([1, 2, 3, 4, 5]);
    expect(pageNumbers(8, 8)).toEqual([6, 7, 8]);
  });

  it('does not add a query string to the first page', () => {
    expect(pageHref('/the/golang', 1)).toBe('/the/golang');
    expect(pageHref('/the/golang', 2)).toBe('/the/golang?page=2');
  });
});
