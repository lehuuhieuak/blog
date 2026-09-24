export const ADMIN_SESSION_COOKIE = "admin_session"

const DEFAULT_ADMIN_DESTINATION = "/admin/articles"
const ADMIN_ORIGIN = "http://admin.local"

export function safeAdminNext(value?: string | null): string {
  if (!value || value.includes("\\")) return DEFAULT_ADMIN_DESTINATION

  try {
    const destination = new URL(value, ADMIN_ORIGIN)
    const decodedPathname = decodeURIComponent(destination.pathname)
    const normalizedPathname = decodedPathname.replace(/\/+$/, "")

    if (
      destination.origin !== ADMIN_ORIGIN ||
      !normalizedPathname.startsWith("/admin/") ||
      normalizedPathname === "/admin/login" ||
      decodedPathname.includes("\\")
    ) {
      return DEFAULT_ADMIN_DESTINATION
    }

    return `${destination.pathname}${destination.search}`
  } catch {
    return DEFAULT_ADMIN_DESTINATION
  }
}
