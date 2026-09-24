"use client"

import { useState, type FormEvent } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { postAdminLogin } from "@/lib/browser-api"

interface Props {
  apiBase: string
  nextPath: string
}

export default function LoginForm({ apiBase, nextPath }: Props) {
  const [pending, setPending] = useState(false)
  const [hasError, setHasError] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setHasError(false)

    const form = new FormData(event.currentTarget)
    const username = String(form.get("username") ?? "")
    const password = String(form.get("password") ?? "")

    try {
      const response = await postAdminLogin(apiBase, username, password)
      if (response.status === 204) {
        window.location.assign(nextPath)
        return
      }
      setHasError(true)
    } catch {
      setHasError(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="grid gap-5" aria-busy={pending} onSubmit={submit}>
      {hasError ? (
        <Alert className="rounded-sm" variant="destructive" aria-live="assertive">
          <AlertDescription>Không thể đăng nhập. Vui lòng kiểm tra thông tin và thử lại.</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="username">Tên đăng nhập</Label>
        <Input id="username" name="username" autoComplete="username" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Button className="w-full rounded-sm" type="submit" disabled={pending}>
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>
    </form>
  )
}
