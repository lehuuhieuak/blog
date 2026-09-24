import type { ReactNode } from "react"

import ThemeToggle from "@/components/ThemeToggle"
import { routes } from "@/lib/routes"
import { site } from "@/lib/site"

export default function PublicChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main-content">Chuyển đến nội dung chính</a>
      <header className="site-header">
        <div className="site-header__inner">
          <a className="site-name" href={routes.home}>{site.name}</a>
          <nav className="site-nav" aria-label="Điều hướng chính">
            <a href={routes.about}>Giới thiệu</a>
          </nav>
          <ThemeToggle />
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <p>© {new Date().getUTCFullYear()} {site.author}. Giữ toàn quyền.</p>
        {site.socialURL && <a href={site.socialURL} rel="me">Kết nối</a>}
      </footer>
    </>
  )
}
