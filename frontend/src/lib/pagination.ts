export function pageNumbers(current: number, total: number): number[] {
  if (total <= 0) return [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function pageHref(pathname: string, page: number): string {
  const separator = pathname.includes("?") ? "&" : "?";
  return page <= 1 ? pathname : `${pathname}${separator}page=${page}`;
}
