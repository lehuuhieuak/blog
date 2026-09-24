import { afterEach, describe, expect, it, vi } from "vitest"
import { cookies } from "next/headers"

import { APIError, getAdminArticle, getAdminSession, getArticle, listAdminArticles, listArticles, listTags } from "../src/lib/api"

vi.mock("next/headers", () => ({ cookies: vi.fn() }))

afterEach(() => vi.unstubAllGlobals())

describe("server API client", () => {
  it("maps backend error payloads and keeps server data fresh", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Dữ liệu không hợp lệ" } }), { status: 422, headers: { "Content-Type": "application/json" } }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(listArticles()).rejects.toEqual(expect.objectContaining<Partial<APIError>>({ status: 422, message: "Dữ liệu không hợp lệ" }))
    const [, init] = fetchMock.mock.calls[0]
    expect(init?.cache).toBe("no-store")
    expect(new Headers(init?.headers).get("Accept")).toBe("application/json")
  })

  it("forwards only the encoded admin session cookie to server-side admin reads", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => ({ name: "admin_session", value: "signed.session/value" }),
    } as never)
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "Content-Type": "application/json" } })))
    vi.stubGlobal("fetch", fetchMock)

    await getAdminSession()
    await listAdminArticles()
    await getAdminArticle("article/id")

    expect(fetchMock).toHaveBeenCalledTimes(3)
    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init?.headers).get("Cookie")).toBe("admin_session=signed.session%2Fvalue")
    }
  })

  it("never forwards the admin session cookie to public reads", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => ({ name: "admin_session", value: "signed.session/value" }),
    } as never)
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "Content-Type": "application/json" } })))
    vi.stubGlobal("fetch", fetchMock)

    await listArticles()
    await getArticle("hello")
    await listTags()

    expect(fetchMock).toHaveBeenCalledTimes(3)
    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init?.headers).has("Cookie")).toBe(false)
    }
  })

  it("preserves unauthorized status as APIError for the server session guard", async () => {
    vi.mocked(cookies).mockResolvedValue({ get: () => ({ name: "admin_session", value: "expired" }) } as never)
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Phiên đăng nhập không hợp lệ." } }), { status: 401, headers: { "Content-Type": "application/json" } })))

    await expect(getAdminSession()).rejects.toEqual(expect.objectContaining<Partial<APIError>>({ status: 401, message: "Phiên đăng nhập không hợp lệ." }))
  })
})
