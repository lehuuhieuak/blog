import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import ArticleTOC from "@/components/ArticleTOC"
import PageShell from "@/components/PageShell"
import TOCScrollSpy from "@/components/TOCScrollSpy"
import { Badge } from "@/components/ui/badge"
import type { PublicArticle } from "@/features/article/types"
import { APIError, getArticle } from "@/lib/api"
import { canonicalURL, site } from "@/lib/site"

const formatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeZone: "UTC" })

async function loadArticle(slug: string): Promise<PublicArticle | null> {
  try {
    return (await getArticle(slug)).data
  } catch (error) {
    if (error instanceof APIError && error.status === 404) return null
    throw error
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = await loadArticle(slug)
  if (!article) return { title: "Không tìm thấy" }
  const canonical = canonicalURL(`/bai-viet/${article.slug}`)
  return { title: article.title, description: article.excerpt, alternates: { canonical }, openGraph: { type: "article", url: canonical, title: article.title, description: article.excerpt }, twitter: { card: "summary", title: article.title, description: article.excerpt } }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await loadArticle(slug)
  if (!article) notFound()

  const tableOfContents = article.table_of_contents
  const isUpdated = article.published_at && new Date(article.updated_at).getTime() > new Date(article.published_at).getTime()
  const jsonLD = JSON.stringify({ "@context": "https://schema.org", "@type": "BlogPosting", headline: article.title, description: article.excerpt, datePublished: article.published_at, dateModified: article.updated_at, mainEntityOfPage: canonicalURL(`/bai-viet/${article.slug}`), author: { "@type": "Person", name: site.author } }).replace(/</g, "\\u003c")

  return <PageShell width="wide"><div data-article-layout className="grid gap-8 min-[68rem]:grid-cols-[minmax(0,48rem)_minmax(14rem,16rem)] min-[68rem]:justify-center"><div className="min-[68rem]:hidden">{tableOfContents.length > 0 && <ArticleTOC items={tableOfContents} collapsible />}</div><article data-article className="min-w-0"><header className="mb-10 sm:mb-14"><p className="text-sm text-muted-foreground">{article.published_at && <time dateTime={article.published_at}>{formatter.format(new Date(article.published_at))}</time>} · {article.reading_minutes} phút đọc</p><h1 className="mt-2 mb-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">{article.title}</h1><p className="max-w-[62ch] text-lg leading-relaxed text-muted-foreground">{article.excerpt}</p>{article.tags.length > 0 && <ul className="mt-5 flex list-none flex-wrap gap-2 p-0" aria-label="Thẻ">{article.tags.map((tag) => <li key={tag.id}><Link className="inline-flex min-h-11 items-center" href={`/the/${tag.slug}`}><Badge variant="outline">#{tag.name}</Badge></Link></li>)}</ul>}{isUpdated && <p className="mt-4 text-sm text-muted-foreground">Cập nhật: <time dateTime={article.updated_at}>{formatter.format(new Date(article.updated_at))}</time></p>}</header><div className="article-content" data-article-content dangerouslySetInnerHTML={{ __html: article.content_html }} /></article>{tableOfContents.length > 0 && <aside data-toc-sidebar className="sticky top-8 hidden min-w-0 self-start min-[68rem]:block"><ArticleTOC items={tableOfContents} /></aside>}</div>{tableOfContents.length > 0 && <TOCScrollSpy />}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLD }} /></PageShell>
}
