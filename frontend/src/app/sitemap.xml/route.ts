import { listArticles } from "@/lib/api"
import { canonicalURL } from "@/lib/site"

const escapeXML = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;")

export async function GET() {
  const first = await listArticles(1)
  const remaining = await Promise.all(Array.from({ length: Math.max(0, first.meta.total_pages - 1) }, (_, index) => listArticles(index + 2)))
  const data = [...first.data, ...remaining.flatMap((page) => page.data)]
  const staticURLs = ["/", "/gioi-thieu"]
  const entries = [...staticURLs.map((path) => `<url><loc>${escapeXML(canonicalURL(path))}</loc></url>`), ...data.map((article) => `<url><loc>${escapeXML(canonicalURL(`/bai-viet/${article.slug}`))}</loc><lastmod>${new Date(article.updated_at).toISOString()}</lastmod></url>`)].join("")
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`, { headers: { "Content-Type": "application/xml; charset=utf-8" } })
}
