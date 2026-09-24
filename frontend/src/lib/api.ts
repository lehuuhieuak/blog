import type {
  AdminArticle,
  ArticleInput,
  ArticleSummary,
  ListResponse,
  MarkdownPreview,
  PublicArticle,
  Tag,
} from "@/features/article/types"
import { cookies } from "next/headers"

import { ADMIN_SESSION_COOKIE } from "./admin-auth"

const serverAPIBase = process.env.API_URL ?? "http://localhost:8080/api/v1"

export class APIError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has("Accept")) headers.set("Accept", "application/json")

  const response = await fetch(`${serverAPIBase}${path}`, {
    ...init,
    cache: "no-store",
    headers,
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

async function adminRequest<T>(path: string): Promise<T> {
  const cookieValue = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value
  const headers = new Headers({ Accept: "application/json" })

  if (cookieValue) {
    headers.set("Cookie", `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(cookieValue)}`)
  }

  return request<T>(path, { headers })
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
  return adminRequest(`/admin/articles${query({ page, status })}`)
}

export function getAdminArticle(id: string): Promise<{ data: AdminArticle }> {
  return adminRequest(`/admin/articles/${encodeURIComponent(id)}`)
}

export type AdminSession = {
  username: "admin"
  expires_at: string
}

export function getAdminSession(): Promise<{ data: AdminSession }> {
  return adminRequest("/admin/auth/session")
}

export function serializeArticleInput(input: ArticleInput): RequestInit {
  return {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  }
}

export type { MarkdownPreview }
