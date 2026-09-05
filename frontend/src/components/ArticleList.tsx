import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { ArticleSummary } from "@/features/article/types"

interface Props { articles: ArticleSummary[] }

const formatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeZone: "UTC" })

export default function ArticleList({ articles }: Props) {
  if (articles.length === 0) return <p className="text-muted-foreground">Chưa có bài viết nào.</p>

  return <ol className="m-0 list-none p-0">{articles.map((article, index) => <li className="py-7 first:pt-0" key={article.id}><article><p className="text-sm text-muted-foreground">{article.published_at && <time dateTime={article.published_at}>{formatter.format(new Date(article.published_at))}</time>}</p><h2 className="mt-1 mb-3 text-2xl font-semibold tracking-tight sm:text-3xl"><Link className="underline-offset-4 hover:underline" href={`/bai-viet/${article.slug}`}>{article.title}</Link></h2><p className="leading-relaxed">{article.excerpt}</p>{article.tags.length > 0 && <ul className="mt-4 flex list-none flex-wrap gap-2 p-0" aria-label="Thẻ">{article.tags.map((tag) => <li key={tag.id}><Link className="inline-flex min-h-11 items-center" href={`/the/${tag.slug}`}><Badge variant="outline">#{tag.name}</Badge></Link></li>)}</ul>}</article>{index < articles.length - 1 && <Separator className="mt-7" />}</li>)}</ol>
}
