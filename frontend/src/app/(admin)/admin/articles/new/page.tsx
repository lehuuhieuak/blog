import type { Metadata } from "next"

import ArticleEditor from "@/features/editor/ArticleEditor"
import { browserAPIBase } from "@/lib/browser-api"

export const metadata: Metadata = { title: "Bài viết mới" }

export default function NewArticlePage() {
  return (
    <ArticleEditor apiBase={browserAPIBase()} />
  )
}
