import { describe, expect, it } from "vitest"

import { routes } from "../src/lib/routes"

describe("frontend route helpers", () => {
  it("builds the approved English routes and encodes dynamic segments", () => {
    expect(routes.home).toBe("/")
    expect(routes.about).toBe("/about")
    expect(routes.admin).toBe("/admin")
    expect(routes.adminLogin).toBe("/admin/login")
    expect(routes.adminArticles).toBe("/admin/articles")
    expect(routes.adminNewArticle).toBe("/admin/articles/new")
    expect(routes.article("xin chào")).toBe("/articles/xin%20ch%C3%A0o")
    expect(routes.tag("go/web")).toBe("/tags/go%2Fweb")
    expect(routes.adminArticle("id/1")).toBe("/admin/articles/id%2F1")
  })
})
