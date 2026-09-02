import { afterEach, describe, expect, it, vi } from "vitest"

import { APIError, listArticles } from "../src/lib/api"

afterEach(() => vi.unstubAllGlobals())

describe("server API client", () => {
  it("maps backend error payloads and keeps server data fresh", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Dữ liệu không hợp lệ" } }), { status: 422, headers: { "Content-Type": "application/json" } }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(listArticles()).rejects.toEqual(expect.objectContaining<Partial<APIError>>({ status: 422, message: "Dữ liệu không hợp lệ" }))
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/v1/articles?page=1", expect.objectContaining({ cache: "no-store", headers: { Accept: "application/json" } }))
  })
})
