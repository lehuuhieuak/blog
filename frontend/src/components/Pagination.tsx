import {
  Pagination as PaginationRoot,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { pageHref, pageNumbers } from "@/lib/pagination"

interface Props { pathname: string; current: number; total: number }

export default function Pagination({ pathname, current, total }: Props) {
  const pages = pageNumbers(current, total)
  if (total <= 1) return null
  return <PaginationRoot className="pagination" aria-label="Phân trang"><div>{current > 1 ? <PaginationPrevious className="rounded-sm" href={pageHref(pathname, current - 1)} rel="prev" text="Mới hơn" aria-label="Đến trang mới hơn" /> : <span className="invisible inline-flex h-8 items-center" aria-hidden="true">Mới hơn</span>}</div><PaginationContent>{pages.map((page) => <PaginationItem key={page}><PaginationLink className="rounded-sm font-mono text-xs" href={pageHref(pathname, page)} isActive={page === current}>{page}</PaginationLink></PaginationItem>)}</PaginationContent><div className="justify-self-end">{current < total ? <PaginationNext className="rounded-sm" href={pageHref(pathname, current + 1)} rel="next" text="Cũ hơn" aria-label="Đến trang cũ hơn" /> : <span className="invisible inline-flex h-8 items-center" aria-hidden="true">Cũ hơn</span>}</div></PaginationRoot>
}
