import type { Metadata } from "next"

import PageShell from "@/components/PageShell"
import { site } from "@/lib/site"

export const metadata: Metadata = { title: "Giới thiệu", alternates: { canonical: "/gioi-thieu" } }

export default function AboutPage() {
  return <PageShell><article className="article-content"><p className="eyebrow">Giới thiệu</p><h1>Chào bạn, mình là {site.author}.</h1><p>Đây là nơi mình lưu lại những điều đang học, những công cụ hữu ích và vài suy nghĩ chưa kịp hoàn thiện.</p><p>Nội dung và thông tin liên hệ mẫu của blog được tập trung trong một cấu hình để bạn có thể thay đổi dễ dàng.</p></article></PageShell>
}
