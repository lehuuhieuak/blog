import type { Metadata } from "next"

import ArticleList from "@/components/ArticleList"
import PageShell from "@/components/PageShell"
import Pagination from "@/components/Pagination"
import { listArticles } from "@/lib/api"
import { normalizePage } from "@/lib/pagination"
import { routes } from "@/lib/routes"
import { site } from "@/lib/site"

export const metadata: Metadata = { alternates: { canonical: routes.home } }

export default async function HomePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: requestedPage } = await searchParams
  const page = normalizePage(requestedPage)
  const result = await listArticles(page)

  return <PageShell><section aria-labelledby="latest-title"><header className="page-intro"><p className="eyebrow">Ghi chép mới</p><h1 id="latest-title">Bài viết gần đây</h1><p>{site.description}</p></header><ArticleList articles={result.data} /><Pagination pathname={routes.home} current={result.meta.page} total={result.meta.total_pages} /></section></PageShell>
}
