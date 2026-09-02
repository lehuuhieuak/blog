import type { Metadata } from "next"
import Script from "next/script"

import "@/styles/global.css"
import { site } from "@/lib/site"

export const metadata: Metadata = {
  metadataBase: site.url,
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: { siteName: site.name, type: "website", locale: "vi_VN" },
  twitter: { card: "summary" },
}

const themeScript = `try { const saved = localStorage.getItem('theme'); const dark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.toggle('dark', dark); } catch {}`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" suppressHydrationWarning><body><Script id="theme" strategy="beforeInteractive">{themeScript}</Script>{children}</body></html>
}
