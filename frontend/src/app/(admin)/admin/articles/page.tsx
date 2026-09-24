import { PencilIcon, PlusIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import LinkButton from "@/components/LinkButton"
import Pagination from "@/components/Pagination"
import { listAdminArticles } from "@/lib/api"
import { articleStatus, normalizePage } from "@/lib/pagination"
import { routes } from "@/lib/routes"

const formatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "UTC",
})

export default async function AdminArticlesPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const { page: requestedPage, status: requestedStatus } = await searchParams
  const page = normalizePage(requestedPage)
  const status = articleStatus(requestedStatus)
  const result = await listAdminArticles(page, status)
  const query = status ? `?status=${status}` : ""

  const filters = [
    { label: "Tất cả", href: routes.adminArticles, active: status === undefined },
    { label: "Nháp", href: `${routes.adminArticles}?status=draft`, active: status === "draft" },
    { label: "Đã xuất bản", href: `${routes.adminArticles}?status=published`, active: status === "published" },
  ]

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="m-0 text-[1.625rem] leading-[2.125rem] font-semibold tracking-[-0.015em] sm:text-[2rem] sm:leading-10">Bài viết</h1>
          <span className="font-mono text-xs text-muted-foreground">{result.meta.total} mục</span>
        </div>
        <LinkButton href={routes.adminNewArticle} size="lg" className="gap-2 rounded-sm px-4">
          <PlusIcon aria-hidden="true" />
          Tạo bài viết
        </LinkButton>
      </div>

      <nav className="flex flex-wrap items-center gap-5 border-b border-border" aria-label="Lọc bài viết">
        {filters.map((filter) => (
          <a
            key={filter.href}
            href={filter.href}
            aria-current={filter.active ? "page" : undefined}
            className={`relative inline-flex min-h-11 items-center border-b-2 px-0.5 text-sm no-underline hover:bg-transparent hover:text-foreground ${filter.active ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            {filter.label}
          </a>
        ))}
      </nav>

      {result.data.length === 0 ? (
        <Alert className="rounded-sm border-dashed py-8 text-center" role="status">
          <AlertTitle>Chưa có bài viết</AlertTitle>
          <AlertDescription>Hãy tạo bài viết đầu tiên.</AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-hidden rounded-sm border border-border bg-card">
          <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Danh sách bài viết">
            <Table className="admin-list min-w-[48rem]">
              <TableHeader className="bg-muted/45 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 px-5" scope="col">Tiêu đề</TableHead>
                  <TableHead className="h-11 px-4" scope="col">Trạng thái</TableHead>
                  <TableHead className="h-11 px-4 text-right" scope="col">Cập nhật</TableHead>
                  <TableHead className="h-11 w-16 px-4"><span className="sr-only">Thao tác</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="max-w-0 px-5 py-4 whitespace-normal">
                      <a className="block truncate font-medium no-underline hover:bg-transparent hover:underline" href={routes.adminArticle(article.id)}>{article.title}</a>
                      <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">/{article.slug}</span>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <Badge className="rounded-sm font-mono text-[0.7rem]" variant={article.status === "published" ? "secondary" : "outline"}>
                        <span className={`size-1.5 rounded-full ${article.status === "published" ? "bg-foreground" : "bg-muted-foreground"}`} aria-hidden="true" />
                        {article.status === "published" ? "Đã xuất bản" : "Nháp"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right font-mono text-xs text-muted-foreground">
                      <time dateTime={article.updated_at}>{formatter.format(new Date(article.updated_at))}</time>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right">
                      <a className="inline-flex size-9 items-center justify-center rounded-sm text-muted-foreground no-underline hover:text-foreground" href={routes.adminArticle(article.id)} aria-label={`Sửa ${article.title}`}>
                        <PencilIcon className="size-4" aria-hidden="true" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/25 px-5 py-3 font-mono text-xs text-muted-foreground">
            <span>{result.meta.total} bài viết</span>
            <span>Trang {result.meta.page} / {Math.max(result.meta.total_pages, 1)}</span>
          </div>
        </div>
      )}

      <Pagination pathname={`${routes.adminArticles}${query}`} current={result.meta.page} total={result.meta.total_pages} />
    </div>
  )
}
