export const ADMIN_SESSION_COOKIE = "admin_session"

const DEFAULT_ADMIN_DESTINATION = "/admin/articles"
const ADMIN_ORIGIN = "http://admin.local"

export function safeAdminNext(value?: string | null): string {
  if (!value || value.includes("\\")) return DEFAULT_ADMIN_DESTINATION

  try {
    const destination = new URL(value, ADMIN_ORIGIN)
    const decodedPathname = decodeURI(destination.pathname)
    const normalizedPathname = destination.pathname.replace(/\/+$/, "")

    if (
      destination.origin !== ADMIN_ORIGIN ||
      !destination.pathname.startsWith("/admin/") ||
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
