import type { Metadata } from "next"
import type { ReactNode } from "react"

import ThemeToggle from "@/components/ThemeToggle"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { site } from "@/lib/site"

export const metadata: Metadata = {
  title: { default: "Quản trị", template: `%s · Quản trị · ${site.name}` },
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <><a className="skip-link" href="#main-content">Chuyển đến nội dung chính</a><header className="site-header"><div className="site-header__inner"><a className="site-name" href="/quan-tri/bai-viet">Quản trị bài viết</a><nav className="site-nav" aria-label="Điều hướng quản trị"><a href="/quan-tri/bai-viet/moi">Bài viết mới</a></nav><ThemeToggle /></div></header><main id="main-content" className="page-shell page-shell--wide" tabIndex={-1}><Alert className="admin-warning mb-8" role="status"><AlertTitle>Khu vực quản trị chưa có xác thực</AlertTitle><AlertDescription>Không chia sẻ URL này trên môi trường công khai.</AlertDescription></Alert>{children}</main></>
}
