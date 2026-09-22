import type { Metadata } from "next"

import ArticleEditor from "@/features/editor/ArticleEditor"
import { apiBaseForBrowser } from "@/lib/api"

export const metadata: Metadata = { title: "Bài viết mới" }

export default function NewArticlePage() {
  return <ArticleEditor apiBase={apiBaseForBrowser()} />
}
