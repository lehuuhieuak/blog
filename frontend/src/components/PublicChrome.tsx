import Link from "next/link"
import type { ReactNode } from "react"

import ThemeToggle from "@/components/ThemeToggle"
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu"
import { site } from "@/lib/site"

export default function PublicChrome({ children }: { children: ReactNode }) {
  return <><a className="sr-only fixed top-3 left-4 z-50 bg-foreground px-4 py-2 text-background focus:not-sr-only" href="#main-content">Chuyển đến nội dung chính</a><header className="border-b bg-background"><div className="mx-auto flex min-h-18 w-full max-w-[88rem] items-center gap-3 px-4 sm:px-8"><Link className="mr-auto text-sm font-bold no-underline hover:underline" href="/">{site.name}</Link><NavigationMenu aria-label="Điều hướng chính"><NavigationMenuList><NavigationMenuItem><NavigationMenuLink render={<Link href="/gioi-thieu" />}>Giới thiệu</NavigationMenuLink></NavigationMenuItem></NavigationMenuList></NavigationMenu><ThemeToggle /></div></header>{children}<footer data-site-footer className="mx-auto flex w-full max-w-[88rem] flex-col gap-3 border-t px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8"><p>© {new Date().getUTCFullYear()} {site.author}</p>{site.socialURL && <a className="w-fit underline-offset-4 hover:underline" href={site.socialURL} rel="me">Kết nối</a>}</footer></>
}
