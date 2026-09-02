import type { Metadata } from "next"
import { notFound } from "next/navigation"

import ArticleEditor from "@/features/editor/ArticleEditor"
import { APIError, apiBaseForBrowser, getAdminArticle } from "@/lib/api"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  try {
    const { data } = await getAdminArticle(id)
    return { title: data.title }
  } catch (error) {
    if (error instanceof APIError && error.status === 404) return { title: "Không tìm thấy" }
    throw error
  }
}

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { data } = await getAdminArticle(id)
    return <><h1>Sửa bài viết</h1><ArticleEditor article={data} apiBase={apiBaseForBrowser()} /></>
  } catch (error) {
    if (error instanceof APIError && error.status === 404) notFound()
    throw error
  }
}
