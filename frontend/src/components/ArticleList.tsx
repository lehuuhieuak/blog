import { Badge } from "@/components/ui/badge"
import type { ArticleSummary } from "@/features/article/types"

interface Props { articles: ArticleSummary[] }

const formatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeZone: "UTC" })

export default function ArticleList({ articles }: Props) {
  if (articles.length === 0) return <p className="empty-state text-muted-foreground">Chưa có bài viết nào.</p>

  return (
    <ol className="article-list">
      {articles.map((article) => (
        <li key={article.id}>
          <article>
            <p className="article-list__meta">{article.published_at && <time dateTime={article.published_at}>{formatter.format(new Date(article.published_at))}</time>}</p>
            <h2><a href={`/bai-viet/${article.slug}`}>{article.title}</a></h2>
            <p>{article.excerpt}</p>
            {article.tags.length > 0 && (
              <ul className="tag-list" aria-label="Thẻ">
                {article.tags.map((tag) => <li key={tag.id}><a href={`/the/${tag.slug}`}><Badge variant="outline">#{tag.name}</Badge></a></li>)}
              </ul>
            )}
          </article>
        </li>
      ))}
    </ol>
  )
}
