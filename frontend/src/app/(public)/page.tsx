import type { Metadata } from "next"

import ArticleList from "@/components/ArticleList"
import PageShell from "@/components/PageShell"
import Pagination from "@/components/Pagination"
import { listArticles } from "@/lib/api"
import { normalizePage } from "@/lib/pagination"

export const metadata: Metadata = { alternates: { canonical: "/" } }

export default async function HomePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: requestedPage } = await searchParams
  const page = normalizePage(requestedPage)
  const result = await listArticles(page)

  return <PageShell><section aria-labelledby="latest-title"><p className="eyebrow">Ghi chép mới</p><h1 id="latest-title">Bài viết gần đây</h1><ArticleList articles={result.data} /><Pagination pathname="/" current={result.meta.page} total={result.meta.total_pages} /></section></PageShell>
}
