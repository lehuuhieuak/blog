import { routes } from "@/lib/routes"
import { canonicalURL } from "@/lib/site"

export function GET() {
  return new Response(`User-agent: *\nAllow: /\nDisallow: ${routes.admin}/\nSitemap: ${canonicalURL("/sitemap.xml")}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
}
