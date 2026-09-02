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
  return <PaginationRoot className="pagination mt-10 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3" aria-label="Phân trang"><div>{current > 1 ? <PaginationPrevious href={pageHref(pathname, current - 1)} rel="prev" text="Mới hơn" aria-label="Đến trang mới hơn" /> : <span className="invisible inline-flex h-8 items-center" aria-hidden="true">Mới hơn</span>}</div><PaginationContent>{pages.map((page) => <PaginationItem key={page}><PaginationLink href={pageHref(pathname, page)} isActive={page === current}>{page}</PaginationLink></PaginationItem>)}</PaginationContent><div className="justify-self-end">{current < total ? <PaginationNext href={pageHref(pathname, current + 1)} rel="next" text="Cũ hơn" aria-label="Đến trang cũ hơn" /> : <span className="invisible inline-flex h-8 items-center" aria-hidden="true">Cũ hơn</span>}</div></PaginationRoot>
}
