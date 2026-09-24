import { Badge } from "@/components/ui/badge"
import type { ArticleSummary } from "@/features/article/types"
import { routes } from "@/lib/routes"

interface Props { articles: ArticleSummary[] }

const formatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeZone: "UTC" })

export default function ArticleList({ articles }: Props) {
  if (articles.length === 0) {
    return (
      <div className="empty-state" role="status">
        <p className="empty-state__title">Chưa có bài viết nào.</p>
        <p>Nội dung sẽ xuất hiện ở đây khi có bài viết được xuất bản.</p>
      </div>
    )
  }

  return (
    <ol className="article-list">
      {articles.map((article) => (
        <li key={article.id}>
          <article>
            <p className="article-list__meta">{article.published_at && <time dateTime={article.published_at}>{formatter.format(new Date(article.published_at))}</time>}</p>
            <h2><a href={routes.article(article.slug)}>{article.title}</a></h2>
            <p className="article-list__excerpt">{article.excerpt}</p>
            {article.tags.length > 0 && (
              <ul className="tag-list" aria-label="Thẻ">
                {article.tags.map((tag) => <li key={tag.id}><a className="group" href={routes.tag(tag.slug)}><Badge className="h-auto min-h-6 min-w-0 max-w-full rounded-sm border-0 bg-muted font-mono text-xs font-normal leading-4 whitespace-normal text-muted-foreground [overflow-wrap:anywhere] group-hover:bg-accent group-hover:text-foreground" variant="secondary">#{tag.name}</Badge></a></li>)}
              </ul>
            )}
          </article>
        </li>
      ))}
    </ol>
  )
}
