import type { Metadata } from "next"

import LoginForm from "@/features/auth/LoginForm"
import { safeAdminNext } from "@/lib/admin-auth"
import { browserAPIBase } from "@/lib/browser-api"

export const metadata: Metadata = {
  title: "Đăng nhập quản trị",
  robots: { index: false, follow: false },
}

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const parameters = await searchParams
  const nextPath = safeAdminNext(Array.isArray(parameters.next) ? parameters.next[0] : parameters.next)

  return (
    <main className="mx-auto grid min-h-screen w-[min(calc(100%-2rem),28rem)] content-center gap-8 py-12">
      <header className="grid gap-2">
        <p className="m-0 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">Khu vực quản trị</p>
        <h1 className="m-0 text-3xl font-semibold tracking-[-0.025em]">Đăng nhập</h1>
        <p className="m-0 text-sm leading-6 text-muted-foreground">Đăng nhập để quản lý bài viết.</p>
      </header>
      <LoginForm apiBase={browserAPIBase()} nextPath={nextPath} />
    </main>
  )
}
