import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import LinkButton from "@/components/LinkButton"
import Pagination from "@/components/Pagination"
import { listAdminArticles } from "@/lib/api"
import { articleStatus, normalizePage } from "@/lib/pagination"

const formatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeZone: "UTC" })

export default async function AdminArticlesPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const { page: requestedPage, status: requestedStatus } = await searchParams
  const page = normalizePage(requestedPage)
  const status = articleStatus(requestedStatus)
  const result = await listAdminArticles(page, status)
  const query = status ? `?status=${status}` : ""

  return <><div className="admin-actions flex flex-wrap items-center justify-between gap-4"><h1 className="m-0">Bài viết</h1><LinkButton href="/quan-tri/bai-viet/moi" size="lg">Tạo bài viết</LinkButton></div><nav className="admin-filters mb-6 flex flex-wrap gap-2" aria-label="Lọc bài viết"><LinkButton href="/quan-tri/bai-viet" variant={status === undefined ? "default" : "outline"} size="sm" aria-current={status === undefined ? "page" : undefined}>Tất cả</LinkButton><LinkButton href="/quan-tri/bai-viet?status=draft" variant={status === "draft" ? "default" : "outline"} size="sm" aria-current={status === "draft" ? "page" : undefined}>Nháp</LinkButton><LinkButton href="/quan-tri/bai-viet?status=published" variant={status === "published" ? "default" : "outline"} size="sm" aria-current={status === "published" ? "page" : undefined}>Đã xuất bản</LinkButton></nav>{result.data.length === 0 ? <Alert className="empty-state" role="status"><AlertTitle>Chưa có bài viết</AlertTitle><AlertDescription>Hãy tạo bài viết đầu tiên.</AlertDescription></Alert> : <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Danh sách bài viết"><Table className="admin-list min-w-[44rem]"><TableHeader><TableRow><TableHead scope="col">Tiêu đề</TableHead><TableHead scope="col">Trạng thái</TableHead><TableHead scope="col">Cập nhật</TableHead></TableRow></TableHeader><TableBody>{result.data.map((article) => <TableRow key={article.id}><TableCell><a href={`/quan-tri/bai-viet/${article.id}`}>{article.title}</a></TableCell><TableCell><Badge variant={article.status === "published" ? "default" : "outline"}>{article.status === "published" ? "Đã xuất bản" : "Nháp"}</Badge></TableCell><TableCell><time dateTime={article.updated_at}>{formatter.format(new Date(article.updated_at))}</time></TableCell></TableRow>)}</TableBody></Table></div>}<Pagination pathname={`/quan-tri/bai-viet${query}`} current={result.meta.page} total={result.meta.total_pages} /></>
}
