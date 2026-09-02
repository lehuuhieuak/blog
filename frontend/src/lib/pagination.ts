import type { ArticleStatus } from "@/features/article/types"

export function normalizePage(value: string | undefined): number {
  const page = Number(value ?? "1")
  return Number.isInteger(page) && page > 0 ? page : 1
}

export function articleStatus(value: string | undefined): ArticleStatus | undefined {
  return value === "draft" || value === "published" ? value : undefined
}

export function pageNumbers(current: number, total: number): number[] {
  if (total <= 0) return []
  const start = Math.max(1, current - 2)
  const end = Math.min(total, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

export function pageHref(pathname: string, page: number): string {
  const separator = pathname.includes("?") ? "&" : "?"
  return page <= 1 ? pathname : `${pathname}${separator}page=${page}`
}
