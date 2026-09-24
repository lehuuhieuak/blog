import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

import { safeAdminNext } from "../src/lib/admin-auth"
import { adminBrowserFetch, browserAPIBase, postAdminLogin, postAdminLogout } from "../src/lib/browser-api"
import { proxy } from "../src/proxy"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("safeAdminNext", () => {
  it.each([
    [undefined, "/admin/articles"],
    [null, "/admin/articles"],
    ["", "/admin/articles"],
    ["https://evil.example/admin/articles", "/admin/articles"],
    ["//evil.example/admin/articles", "/admin/articles"],
    ["\\\\evil.example\\admin\\articles", "/admin/articles"],
    ["/\\\\evil.example/admin/articles", "/admin/articles"],
    ["/administrator", "/admin/articles"],
    ["/admin/login?next=/admin/articles", "/admin/articles"],
    ["/admin/login/", "/admin/articles"],
    ["/admin/login/?next=/admin/articles", "/admin/articles"],
    ["/admin/%E0%A4%A", "/admin/articles"],
    ["/admin/articles/%", "/admin/articles"],
    ["/admin/articles/new?draft=1", "/admin/articles/new?draft=1"],
    ["/admin/articles/new?draft=1#section", "/admin/articles/new?draft=1"],
  ])("normalizes next=%s", (value, expected) => {
    expect(safeAdminNext(value)).toBe(expected)
  })
})

describe("browserAPIBase", () => {
  it("uses the configured public API URL and keeps the local fallback", () => {
    vi.stubEnv("PUBLIC_API_URL", "https://api.example.test/api/v1")
    expect(browserAPIBase()).toBe("https://api.example.test/api/v1")

    vi.stubEnv("PUBLIC_API_URL", undefined)
    expect(browserAPIBase()).toBe("http://localhost:8080/api/v1")
  })
})

describe("browser admin API calls", () => {
  it("submits login credentials with cookies included", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetchMock)

    await postAdminLogin("https://api.example.test/api/v1", "admin", "secret")

    expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/api/v1/admin/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: "admin", password: "secret" }),
    })
  })

  it("logs out with cookies included", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetchMock)

    await postAdminLogout("https://api.example.test/api/v1")

    expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/api/v1/admin/auth/logout", {
      method: "POST",
      credentials: "include",
    })
  })

  it("includes credentials and returns expired sessions to login safely", async () => {
    const assign = vi.fn()
    vi.stubGlobal("window", { location: { pathname: "/admin/articles/new", search: "?draft=1", assign } })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })))

    await adminBrowserFetch("https://api.example.test/api/v1", "/admin/articles", { method: "POST" })

    expect(fetch).toHaveBeenCalledWith("https://api.example.test/api/v1/admin/articles", expect.objectContaining({
      method: "POST",
      credentials: "include",
    }))
    expect(assign).toHaveBeenCalledWith("/admin/login?next=%2Fadmin%2Farticles%2Fnew%3Fdraft%3D1")
  })
})

describe("admin proxy", () => {
  it("redirects unauthenticated admin pages while preserving their path and query", () => {
    const response = proxy(new NextRequest("https://blog.example/admin/articles?page=3"))
    const location = new URL(response.headers.get("location") ?? "")

    expect(location.pathname).toBe("/admin/login")
    expect(location.searchParams.get("next")).toBe("/admin/articles?page=3")
  })

  it("allows the login page without a session", () => {
    const response = proxy(new NextRequest("https://blog.example/admin/login"))

    expect(response.status).toBe(200)
    expect(response.headers.has("location")).toBe(false)
  })

  it("passes a safe current destination to the authoritative layout check", () => {
    const request = new NextRequest("https://blog.example/admin/articles?page=3")
    request.cookies.set("admin_session", "signed-token")

    const response = proxy(request)

    expect(response.headers.get("x-middleware-request-x-admin-return-to")).toBe("/admin/articles?page=3")
  })
})
