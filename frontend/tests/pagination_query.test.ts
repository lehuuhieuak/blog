import { expect, it } from "vitest"

import { articleStatus, normalizePage, pageHref } from "../src/lib/pagination"

it("preserves existing query parameters when changing page", () => {
  expect(pageHref("/quan-tri/bai-viet?status=draft", 3)).toBe("/quan-tri/bai-viet?status=draft&page=3")
})

it.each([
  [undefined, 1],
  ["1", 1],
  ["2", 2],
  ["0", 1],
  ["-1", 1],
  ["1.5", 1],
  ["abc", 1],
])("normalizes page query %s to %i", (value, expected) => {
  expect(normalizePage(value)).toBe(expected)
})

it.each([
  [undefined, undefined],
  ["draft", "draft"],
  ["published", "published"],
  ["all", undefined],
])("accepts only known admin status %s", (value, expected) => {
  expect(articleStatus(value)).toBe(expected)
})
