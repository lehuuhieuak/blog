import { safeAdminNext } from "./admin-auth"

export function browserAPIBase(): string {
  return process.env.PUBLIC_API_URL ?? "http://localhost:8080/api/v1"
}

export function postAdminLogin(apiBase: string, username: string, password: string): Promise<Response> {
  return fetch(`${apiBase}/admin/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password }),
  })
}

export function postAdminLogout(apiBase: string): Promise<Response> {
  return fetch(`${apiBase}/admin/auth/logout`, {
    method: "POST",
    credentials: "include",
  })
}

export async function adminBrowserFetch(apiBase: string, path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${apiBase}${path}`, { ...init, credentials: "include" })
  if (response.status === 401) {
    const nextPath = safeAdminNext(`${window.location.pathname}${window.location.search}`)
    window.location.assign(`/admin/login?next=${encodeURIComponent(nextPath)}`)
  }
  return response
}
