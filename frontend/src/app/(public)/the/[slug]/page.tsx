import type { Metadata } from "next"

import ArticleList from "@/components/ArticleList"
import PageShell from "@/components/PageShell"
import Pagination from "@/components/Pagination"
import { listArticles, listTags } from "@/lib/api"
import { normalizePage } from "@/lib/pagination"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { data: tags } = await listTags()
  const name = tags.find((tag) => tag.slug === slug)?.name ?? slug
  return { title: `Thẻ ${name}`, alternates: { canonical: `/the/${slug}` } }
}

export default async function TagPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }) {
  const [{ slug }, { page: requestedPage }] = await Promise.all([params, searchParams])
  const page = normalizePage(requestedPage)
  const [result, tags] = await Promise.all([listArticles(page, slug), listTags()])
  const tagName = tags.data.find((tag) => tag.slug === slug)?.name ?? slug

  return <PageShell><section aria-labelledby="tag-title"><p className="eyebrow">Thẻ</p><h1 id="tag-title">#{tagName}</h1><ArticleList articles={result.data} /><Pagination pathname={`/the/${slug}`} current={result.meta.page} total={result.meta.total_pages} /></section></PageShell>
}
