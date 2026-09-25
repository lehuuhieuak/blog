"use client"

import { useEffect, useState } from "react"
import { EyeIcon, FileTextIcon, LockKeyholeIcon, SaveIcon, SendIcon, Trash2Icon } from "lucide-react"

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
import { adminBrowserFetch } from "@/lib/browser-api"
import { routes } from "@/lib/routes"

type Action = "preview" | "draft" | "published" | "delete"
type ArticleStatus = ArticleInput["status"]

type EditorFields = Omit<ArticleInput, "tags" | "status"> & {
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
    tags: article?.tags.map((tag) => tag.name).join(", ") ?? "",
  }))
  const [manuallyEditedSlug, setManuallyEditedSlug] = useState(Boolean(article?.slug))
  const [savedStatus, setSavedStatus] = useState<ArticleStatus>(article?.status ?? "draft")
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
    tags: fields.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    status: articleStatus,
  })

  const callAPI = async <T,>(path: string, method: string, body?: unknown): Promise<T> => {
    const response = await adminBrowserFetch(apiBase, path, {
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
    setSavedStatus(articleStatus)
    setDirty(false)
    if (!articleID) {
      window.location.assign(routes.adminArticle(result.data.id))
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
    window.location.assign(routes.adminArticles)
  })

  const workspaceLayout = article
    ? "min-[68rem]:grid-cols-2"
    : "min-[68rem]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] min-[68rem]:grid-rows-[auto_auto_auto]"

  return (
    <form className="editor grid gap-8" aria-busy={!hydrated || isBusy} data-editor-ready={hydrated ? "true" : undefined} noValidate>
      <div className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="rounded-sm bg-muted px-2 py-1">{article ? `ID ${article.id.slice(0, 8)}` : "Bản thảo mới"}</span>
            {article ? (
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-2 py-1" data-article-status={savedStatus}>
                <span className="size-1.5 rounded-full bg-foreground" aria-hidden="true" />
                {savedStatus === "published" ? "Đã xuất bản" : "Nháp"}
              </span>
            ) : null}
          </div>
          <h1 className="m-0 text-[1.625rem] leading-[2.125rem] font-semibold tracking-[-0.015em] sm:text-[2rem] sm:leading-10">
            {article ? "Sửa bài viết" : "Bài viết mới"}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button className="rounded-sm" type="button" variant="outline" data-action="preview" disabled={!hydrated || isBusy} onClick={previewArticle}>
            <EyeIcon aria-hidden="true" />
            {busyAction === "preview" ? actionMessages.preview : "Xem trước"}
          </Button>
          <Button className="rounded-sm" type="button" variant="ghost" data-action="draft" disabled={!hydrated || isBusy} onClick={() => saveArticle("draft")}>
            <SaveIcon aria-hidden="true" />
            {busyAction === "draft" ? actionMessages.draft : "Lưu nháp"}
          </Button>
          <Button className="rounded-sm px-4" type="button" data-action="published" disabled={!hydrated || isBusy} onClick={() => saveArticle("published")}>
            <SendIcon aria-hidden="true" />
            {busyAction === "published" ? actionMessages.published : "Xuất bản"}
          </Button>
          {article ? (
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger
                render={(
                  <Button className="rounded-sm text-destructive lg:ml-2" type="button" variant="outline" data-action="delete" disabled={!hydrated || isBusy}>
                    <Trash2Icon aria-hidden="true" />
                    Xóa vĩnh viễn
                  </Button>
                )}
              />
              <AlertDialogContent className="rounded-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa vĩnh viễn bài viết?</AlertDialogTitle>
                  <AlertDialogDescription>Bài viết và liên kết công khai sẽ bị xóa. Thao tác này không thể hoàn tác.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-sm" type="button" disabled={!hydrated || isBusy}>Hủy</AlertDialogCancel>
                  <AlertDialogAction className="rounded-sm" type="button" variant="destructive" disabled={!hydrated || isBusy} onClick={deleteArticle}>
                    {busyAction === "delete" ? actionMessages.delete : "Xóa vĩnh viễn"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>

      {status.kind === "error" ? (
        <Alert className="rounded-sm" data-editor-status variant="destructive" role="alert">
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      ) : (
        <p className="min-h-6 rounded-sm bg-muted/55 px-3 py-1 font-mono text-xs leading-6 text-muted-foreground" data-editor-status role="status" aria-live="polite">
          {status.message}
        </p>
      )}

      <div className={`editor-workspace grid items-start gap-8 ${workspaceLayout}`}>
        <div className={article ? "grid min-w-0 gap-8" : "contents"}>
          <div className={`grid gap-2 ${article ? "" : "min-[68rem]:col-start-2 min-[68rem]:row-start-1"}`}>
            <div className="border-b border-border pb-2">
              <Label id="title-label" className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground" htmlFor="title">Tiêu đề</Label>
            </div>
            <Input
              id="title"
              className={`rounded-sm bg-card px-4 text-base font-medium ${article ? "md:text-xl" : "h-14 md:text-[2rem]"}`}
              name="title"
              required
              autoComplete="off"
              placeholder="Gõ tiêu đề bài viết tại đây…"
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

          <section className={`grid gap-5 ${article ? "" : "min-[68rem]:col-start-1 min-[68rem]:row-span-3 min-[68rem]:row-start-1"}`} aria-labelledby="metadata-title">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <FileTextIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              <h2 id="metadata-title" className="m-0 font-mono text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Thông tin ấn bản</h2>
            </div>
            <div className="grid gap-5">
              <div className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground" htmlFor="slug">Slug</Label>
                  {slugLocked ? <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground"><LockKeyholeIcon className="size-3.5" aria-hidden="true" />Đã cố định</span> : null}
                </div>
                <Input
                  id="slug"
                  className="rounded-sm bg-card font-mono text-base sm:text-sm"
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
              {slugLocked ? (
                <p id="slug-locked-note" className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LockKeyholeIcon className="size-4 shrink-0" aria-hidden="true" />
                  Slug được khóa sau lần xuất bản đầu tiên để bảo vệ liên kết.
                </p>
              ) : null}
              <div className="grid gap-2">
                <Label className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground" htmlFor="excerpt">Tóm tắt</Label>
                <Textarea className="min-h-24 rounded-sm bg-card text-base sm:text-sm" id="excerpt" name="excerpt" required value={fields.excerpt} onChange={(event) => updateField("excerpt", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground" htmlFor="tags">Thẻ <span id="tags-note" className="font-normal normal-case tracking-normal">(ngăn cách bằng dấu phẩy)</span></Label>
                <Input className="rounded-sm bg-card text-base sm:text-sm" id="tags" name="tags" aria-describedby="tags-note" value={fields.tags} onChange={(event) => updateField("tags", event.target.value)} />
              </div>
            </div>
          </section>

          <section className={`grid gap-2 ${article ? "" : "min-[68rem]:col-start-2 min-[68rem]:row-start-2"}`}>
            <div className="flex items-center justify-between gap-4 border-b border-border pb-2">
              <Label className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground" htmlFor="content-markdown">Nội dung Markdown</Label>
              <span className="font-mono text-xs text-muted-foreground">Hỗ trợ GFM</span>
            </div>
            <Textarea
              id="content-markdown"
              className="editor-content min-h-[34rem] resize-y rounded-sm bg-card p-4 font-mono text-base leading-relaxed sm:text-sm"
              name="content_markdown"
              required
              placeholder="Bắt đầu viết bằng Markdown…"
              value={fields.content_markdown}
              onChange={(event) => updateField("content_markdown", event.target.value)}
            />
          </section>
        </div>

        <div className={`grid gap-2 min-[68rem]:col-start-2 min-[68rem]:sticky min-[68rem]:top-6 ${article ? "min-[68rem]:row-start-1" : "min-[68rem]:row-start-3"}`}>
          <div className="flex items-center justify-between gap-4 border-b border-border pb-2">
            <h2 id="preview-title" className="m-0 font-mono text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Bản xem trước</h2>
          </div>
          {!preview ? (
            <div className="grid min-h-[34rem] place-items-center rounded-sm border border-dashed border-border bg-muted/20 p-8 text-center">
              <div className="grid max-w-xs justify-items-center gap-3 text-muted-foreground">
                <EyeIcon className="size-6" aria-hidden="true" />
                <p className="text-sm">Chọn “Xem trước” để đọc bài viết với định dạng hoàn chỉnh.</p>
              </div>
            </div>
          ) : null}
          <section className="editor-preview min-h-[34rem] rounded-sm border border-border bg-card p-4 sm:p-8" aria-labelledby="preview-title" hidden={!preview} data-preview>
            <div className="article-content" data-preview-content dangerouslySetInnerHTML={{ __html: preview?.html ?? "" }} />
          </section>
        </div>
      </div>
    </form>
  )
}
