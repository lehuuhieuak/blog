"use client"

import { useEffect, useState } from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { AdminArticle, ArticleInput, MarkdownPreview } from "@/features/article/types"

type Action = "preview" | "draft" | "published" | "delete"
type ArticleStatus = ArticleInput["status"]

type EditorFields = Omit<ArticleInput, "tags" | "cover_image_url" | "status"> & {
  cover_image_url: string
  tags: string
}

interface Props {
  article?: AdminArticle
  apiBase: string
}

interface StatusMessage {
  kind: "status" | "error"
  message: string
}

const actionMessages: Record<Action, string> = {
  preview: "Đang tạo bản xem trước…",
  draft: "Đang lưu nháp…",
  published: "Đang xuất bản…",
  delete: "Đang xóa bài viết…",
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export default function ArticleEditor({ article, apiBase }: Props) {
  const articleID = article?.id ?? ""
  const slugLocked = Boolean(article?.published_at)
  const [fields, setFields] = useState<EditorFields>(() => ({
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    excerpt: article?.excerpt ?? "",
    content_markdown: article?.content_markdown ?? "",
    cover_image_url: article?.cover_image_url ?? "",
    tags: article?.tags.map((tag) => tag.name).join(", ") ?? "",
  }))
  const [manuallyEditedSlug, setManuallyEditedSlug] = useState(Boolean(article?.slug))
  const [dirty, setDirty] = useState(false)
  const [busyAction, setBusyAction] = useState<Action>()
  const [preview, setPreview] = useState<MarkdownPreview>()
  const [status, setStatus] = useState<StatusMessage>({ kind: "status", message: "" })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [hydrated, setHydrated] = useState(false)
  const isBusy = busyAction !== undefined
  useEffect(() => {
    setHydrated(true)
  }, [])


  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [dirty])

  const updateField = <Key extends keyof EditorFields>(key: Key, value: EditorFields[Key]) => {
    setFields((current) => ({ ...current, [key]: value }))
    setDirty(true)
  }

  const articlePayload = (articleStatus: ArticleStatus): ArticleInput => ({
    title: fields.title,
    slug: fields.slug,
    excerpt: fields.excerpt,
    content_markdown: fields.content_markdown,
    cover_image_url: fields.cover_image_url || null,
    tags: fields.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    status: articleStatus,
  })

  const callAPI = async <T,>(path: string, method: string, body?: unknown): Promise<T> => {
    const response = await fetch(`${apiBase}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (response.status === 204) return undefined as T
    const result = await response.json() as T & { error?: { message?: string } }
    if (!response.ok) throw new Error(result.error?.message ?? "Thao tác không thành công.")
    return result
  }

  const runAction = async (action: Action, task: () => Promise<void>) => {
    setBusyAction(action)
    setStatus({ kind: "status", message: actionMessages[action] })
    try {
      await task()
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Thao tác không thành công. Vui lòng thử lại.",
      })
    } finally {
      setBusyAction(undefined)
    }
  }

  const previewArticle = () => runAction("preview", async () => {
    const result = await callAPI<{ data: MarkdownPreview }>("/admin/markdown/preview", "POST", {
      content_markdown: fields.content_markdown,
    })
    setPreview(result.data)
    setStatus({ kind: "status", message: `Xem trước · ${result.data.reading_minutes} phút đọc.` })
  })

  const saveArticle = (articleStatus: ArticleStatus) => runAction(articleStatus === "published" ? "published" : "draft", async () => {
    const result = await callAPI<{ data: { id: string } }>(
      articleID ? `/admin/articles/${articleID}` : "/admin/articles",
      articleID ? "PUT" : "POST",
      articlePayload(articleStatus),
    )
    setDirty(false)
    if (!articleID) {
      window.location.assign(`/quan-tri/bai-viet/${result.data.id}`)
      return
    }
    if (articleStatus === "published") {
      window.location.reload()
      return
    }
    setStatus({ kind: "status", message: "Đã lưu nháp." })
  })

  const deleteArticle = () => runAction("delete", async () => {
    await callAPI<void>(`/admin/articles/${articleID}`, "DELETE")
    setDirty(false)
    setDeleteDialogOpen(false)
    window.location.assign("/quan-tri/bai-viet")
  })

  return (
    <form className="editor grid gap-6" aria-busy={!hydrated || isBusy} data-editor-ready={hydrated ? "true" : undefined} noValidate>
      {status.kind === "error" ? (
        <Alert data-editor-status variant="destructive" role="alert">
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      ) : (
        <p className="min-h-6 text-sm text-muted-foreground" data-editor-status role="status" aria-live="polite">
          {status.message}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="title">Tiêu đề</Label>
          <Input
            id="title"
            name="title"
            required
            autoComplete="off"
            value={fields.title}
            onChange={(event) => {
              const title = event.target.value
              updateField("title", title)
              if (!manuallyEditedSlug && !slugLocked) {
                setFields((current) => ({ ...current, slug: slugify(title) }))
              }
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            disabled={slugLocked}
            aria-describedby={slugLocked ? "slug-locked-note" : undefined}
            value={fields.slug}
            onChange={(event) => {
              setManuallyEditedSlug(event.target.value.length > 0)
              updateField("slug", event.target.value)
            }}
          />
        </div>
        {slugLocked && (
          <p id="slug-locked-note" className="self-end text-sm text-muted-foreground">
            Slug được khóa sau lần xuất bản đầu tiên để bảo vệ liên kết.
          </p>
        )}
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="excerpt">Tóm tắt</Label>
          <Textarea id="excerpt" name="excerpt" required value={fields.excerpt} onChange={(event) => updateField("excerpt", event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cover-image-url">URL ảnh bìa</Label>
          <Input
            id="cover-image-url"
            name="cover_image_url"
            type="url"
            placeholder="https://example.com/anh-bia.jpg"
            value={fields.cover_image_url}
            onChange={(event) => updateField("cover_image_url", event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tags">Thẻ <span id="tags-note" className="font-normal text-muted-foreground">(ngăn cách bằng dấu phẩy)</span></Label>
          <Input id="tags" name="tags" aria-describedby="tags-note" value={fields.tags} onChange={(event) => updateField("tags", event.target.value)} />
        </div>
      </div>

      <div className="editor-workspace grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="content-markdown">Nội dung Markdown</Label>
          <Textarea
            id="content-markdown"
            className="editor-content min-h-[28rem] resize-y font-mono text-sm leading-relaxed"
            name="content_markdown"
            required
            value={fields.content_markdown}
            onChange={(event) => updateField("content_markdown", event.target.value)}
          />
        </div>
        <section className="editor-preview min-h-[28rem] border border-border p-4 sm:p-8" aria-labelledby="preview-title" hidden={!preview} data-preview>
          <h2 id="preview-title" className="mb-6 text-xl font-semibold">Xem trước</h2>
          <div className="article-content" data-preview-content dangerouslySetInnerHTML={{ __html: preview?.html ?? "" }} />
        </section>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border pt-5">
        <Button type="button" variant="outline" data-action="preview" disabled={!hydrated || isBusy} onClick={previewArticle}>
          {busyAction === "preview" ? actionMessages.preview : "Xem trước"}
        </Button>
        <Button type="button" variant="outline" data-action="draft" disabled={!hydrated || isBusy} onClick={() => saveArticle("draft")}>
          {busyAction === "draft" ? actionMessages.draft : "Lưu nháp"}
        </Button>
        <Button type="button" data-action="published" disabled={!hydrated || isBusy} onClick={() => saveArticle("published")}>
          {busyAction === "published" ? actionMessages.published : "Xuất bản"}
        </Button>
        {article && (
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger
              render={<Button className="ml-auto max-md:ml-0" type="button" variant="destructive" data-action="delete" disabled={!hydrated || isBusy}>Xóa vĩnh viễn</Button>}
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xóa vĩnh viễn bài viết?</AlertDialogTitle>
                <AlertDialogDescription>Thao tác này không thể hoàn tác.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel type="button" disabled={!hydrated || isBusy}>Hủy</AlertDialogCancel>
                <AlertDialogAction type="button" variant="destructive" disabled={!hydrated || isBusy} onClick={deleteArticle}>
                  {busyAction === "delete" ? actionMessages.delete : "Xóa vĩnh viễn"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </form>
  )
}
