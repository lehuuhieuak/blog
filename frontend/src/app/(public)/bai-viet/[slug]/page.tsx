import type { Metadata } from "next"
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
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical },
    openGraph: { type: "article", url: canonical, title: article.title, description: article.excerpt },
    twitter: { card: "summary", title: article.title, description: article.excerpt },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await loadArticle(slug)
  if (!article) notFound()

  const tableOfContents = article.table_of_contents
  const isUpdated = article.published_at && new Date(article.updated_at).getTime() > new Date(article.published_at).getTime()
  const jsonLD = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    mainEntityOfPage: canonicalURL(`/bai-viet/${article.slug}`),
    author: { "@type": "Person", name: site.author },
  }).replace(/</g, "\\u003c")

  return <PageShell width="wide"><div className="article-layout">{tableOfContents.length > 0 && <ArticleTOC items={tableOfContents} collapsible />}{/* HTML is sanitized by the backend renderer before it reaches the frontend. */}<article><header className="article-header"><p className="eyebrow">{article.published_at && <time dateTime={article.published_at}>{formatter.format(new Date(article.published_at))}</time>} · {article.reading_minutes} phút đọc</p><h1>{article.title}</h1><p className="article-excerpt">{article.excerpt}</p>{article.tags.length > 0 && <ul className="tag-list" aria-label="Thẻ">{article.tags.map((tag) => <li key={tag.id}><a href={`/the/${tag.slug}`}><Badge variant="outline">#{tag.name}</Badge></a></li>)}</ul>}{isUpdated && <p className="article-list__meta">Cập nhật: <time dateTime={article.updated_at}>{formatter.format(new Date(article.updated_at))}</time></p>}</header><div className="article-content" dangerouslySetInnerHTML={{ __html: article.content_html }} /></article>{tableOfContents.length > 0 && <aside className="article-layout__toc"><ArticleTOC items={tableOfContents} /></aside>}</div>{tableOfContents.length > 0 && <TOCScrollSpy />}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLD }} /></PageShell>
}
