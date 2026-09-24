import { NextRequest, NextResponse } from "next/server"

import { ADMIN_SESSION_COOKIE, safeAdminNext } from "./lib/admin-auth"

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (!pathname.startsWith("/admin/") || pathname === "/admin/login") {
    return NextResponse.next()
  }

  const session = request.cookies.get(ADMIN_SESSION_COOKIE)
  if (!session) {
    const loginURL = new URL("/admin/login", request.url)
    loginURL.searchParams.set("next", `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginURL)
  }

  const headers = new Headers(request.headers)
  headers.set("x-admin-return-to", safeAdminNext(`${pathname}${request.nextUrl.search}`))
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ["/admin/:path*"],
}
