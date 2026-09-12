import type { Metadata } from "next"
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google"
import Script from "next/script"

import "@/styles/global.css"
import { site } from "@/lib/site"

const sans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
  fallback: ["Inter", "system-ui", "sans-serif"],
})

const mono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  fallback: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
})

export const metadata: Metadata = {
  metadataBase: site.url,
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: { siteName: site.name, type: "website", locale: "vi_VN" },
  twitter: { card: "summary" },
}

const themeScript = `try { const saved = localStorage.getItem('theme'); const dark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.toggle('dark', dark); } catch {}`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning><body><Script id="theme" strategy="beforeInteractive">{themeScript}</Script>{children}</body></html>
}
