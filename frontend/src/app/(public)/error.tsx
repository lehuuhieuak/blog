"use client"

import PageShell from "@/components/PageShell"
import UnavailableAlert from "@/components/UnavailableAlert"

export default function PublicError() {
  return <PageShell><UnavailableAlert message="Chưa thể tải nội dung. Vui lòng thử lại sau." /></PageShell>
}
