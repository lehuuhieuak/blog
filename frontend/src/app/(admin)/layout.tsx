import type { Metadata } from "next"
import Link from "next/link"
import type { ReactNode } from "react"

import ThemeToggle from "@/components/ThemeToggle"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu"
import { site } from "@/lib/site"

export const metadata: Metadata = { title: { default: "Quản trị", template: `%s · Quản trị · ${site.name}` }, robots: { index: false, follow: false } }

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <><a className="sr-only fixed top-3 left-4 z-50 bg-foreground px-4 py-2 text-background focus:not-sr-only" href="#main-content">Chuyển đến nội dung chính</a><header className="border-b bg-background"><div className="mx-auto flex min-h-18 w-full max-w-[88rem] items-center gap-3 px-4 sm:px-8"><Link className="mr-auto text-sm font-bold no-underline hover:underline" href="/quan-tri/bai-viet">Quản trị bài viết</Link><NavigationMenu aria-label="Điều hướng quản trị"><NavigationMenuList><NavigationMenuItem><NavigationMenuLink render={<Link href="/quan-tri/bai-viet/moi" />}>Bài viết mới</NavigationMenuLink></NavigationMenuItem></NavigationMenuList></NavigationMenu><ThemeToggle /></div></header><main id="main-content" className="mx-auto w-full max-w-[88rem] px-4 py-10 outline-none sm:px-8 sm:py-16" tabIndex={-1}><Alert className="mb-8 border-l-4 border-l-ring" role="status"><AlertTitle>Khu vực quản trị chưa có xác thực</AlertTitle><AlertDescription>Không chia sẻ URL này trên môi trường công khai.</AlertDescription></Alert>{children}</main></>
}
