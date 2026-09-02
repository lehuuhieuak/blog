import type {
  AdminArticle,
  ArticleInput,
  ArticleSummary,
  ListResponse,
  MarkdownPreview,
  PublicArticle,
  Tag,
} from "@/features/article/types"

const serverAPIBase = process.env.API_URL ?? "http://localhost:8080/api/v1"

export class APIError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${serverAPIBase}${path}`, {
    ...init,
    cache: "no-store",
    headers: { Accept: "application/json", ...init?.headers },
  })
  if (!response.ok) {
    let message = "Không thể tải dữ liệu."
    try {
      const body = (await response.json()) as { error?: { message?: string } }
      message = body.error?.message ?? message
    } catch {
      // Preserve the generic user-facing message if the response is not JSON.
    }
    throw new APIError(response.status, message)
  }
  return response.json() as Promise<T>
}

function query(parameters: Record<string, string | number | undefined>): string {
  const values = new URLSearchParams()
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== "") values.set(key, String(value))
  }
  const serialized = values.toString()
  return serialized ? `?${serialized}` : ""
}

export function listArticles(page = 1, tag?: string): Promise<ListResponse<ArticleSummary>> {
  return request(`/articles${query({ page, tag })}`)
}

export function getArticle(slug: string): Promise<{ data: PublicArticle }> {
  return request(`/articles/${encodeURIComponent(slug)}`)
}

export function listTags(): Promise<{ data: Tag[] }> {
  return request("/tags")
}

export function listAdminArticles(page = 1, status?: string): Promise<ListResponse<AdminArticle>> {
  return request(`/admin/articles${query({ page, status })}`)
}

export function getAdminArticle(id: string): Promise<{ data: AdminArticle }> {
  return request(`/admin/articles/${encodeURIComponent(id)}`)
}

export function apiBaseForBrowser(): string {
  return process.env.PUBLIC_API_URL ?? "http://localhost:8080/api/v1"
}

export function serializeArticleInput(input: ArticleInput): RequestInit {
  return {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  }
}

export type { MarkdownPreview }
