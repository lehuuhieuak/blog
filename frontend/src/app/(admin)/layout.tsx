import type { Metadata } from "next"
import type { ReactNode } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import ThemeToggle from "@/components/ThemeToggle"
import LogoutButton from "@/features/auth/LogoutButton"
import { APIError, getAdminSession } from "@/lib/api"
import { safeAdminNext } from "@/lib/admin-auth"
import { browserAPIBase } from "@/lib/browser-api"
import { routes } from "@/lib/routes"
import { site } from "@/lib/site"

export const metadata: Metadata = {
  title: { default: "Quản trị", template: `%s · Quản trị · ${site.name}` },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    await getAdminSession()
  } catch (error) {
    if (error instanceof APIError && error.status === 401) {
      const returnTo = safeAdminNext((await headers()).get("x-admin-return-to"))
      redirect(`${routes.adminLogin}?next=${encodeURIComponent(returnTo)}`)
    }
    throw error
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Chuyển đến nội dung chính</a>
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
          <LogoutButton apiBase={browserAPIBase()} />
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
