import type { Metadata } from "next"
import type { ReactNode } from "react"

import ThemeToggle from "@/components/ThemeToggle"
import { routes } from "@/lib/routes"
import { site } from "@/lib/site"

export const metadata: Metadata = {
  title: { default: "Quản trị", template: `%s · Quản trị · ${site.name}` },
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main-content">Chuyển đến nội dung chính</a>
      <aside className="border-b border-border bg-muted/55" role="status">
        <div className="mx-auto flex min-h-8 w-[min(calc(100%-2rem),88rem)] items-center py-1 font-mono text-xs text-muted-foreground sm:w-[min(calc(100%-4rem),88rem)]">
          <p>Khu vực quản trị chưa có xác thực. Không chia sẻ URL này trên môi trường công khai.</p>
        </div>
      </aside>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-[min(calc(100%-2rem),88rem)] items-center gap-4 sm:w-[min(calc(100%-4rem),88rem)]">
          <a className="mr-auto text-lg font-semibold tracking-[-0.02em] no-underline hover:bg-transparent hover:opacity-70" href={routes.adminArticles}>
            Quản trị bài viết
          </a>
          <nav aria-label="Điều hướng quản trị">
            <a className="inline-flex min-h-11 items-center px-1 text-sm text-muted-foreground no-underline hover:bg-transparent hover:text-foreground" href={routes.adminNewArticle}>
              Bài viết mới
            </a>
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <main id="main-content" className="mx-auto min-h-[calc(100vh-6rem)] w-[min(calc(100%-2rem),88rem)] py-8 sm:w-[min(calc(100%-4rem),88rem)] sm:py-10" tabIndex={-1}>
        {children}
      </main>
      <footer className="mx-auto flex w-[min(calc(100%-2rem),88rem)] flex-wrap items-center justify-between gap-3 border-t border-border py-6 text-sm text-muted-foreground sm:w-[min(calc(100%-4rem),88rem)]">
        <p>© {new Date().getUTCFullYear()} {site.author}</p>
        <a className="no-underline hover:bg-transparent hover:text-foreground" href={routes.home}>Quay lại trang chính</a>
      </footer>
    </>
  )
}
