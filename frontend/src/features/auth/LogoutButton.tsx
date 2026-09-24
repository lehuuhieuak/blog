"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { postAdminLogout } from "@/lib/browser-api"

export default function LogoutButton({ apiBase }: { apiBase: string }) {
  const [pending, setPending] = useState(false)
  const [hasError, setHasError] = useState(false)

  const logout = async () => {
    setPending(true)
    setHasError(false)
    try {
      const response = await postAdminLogout(apiBase)
      if (response.status === 204) {
        window.location.assign("/admin/login")
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
    <span className="inline-flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
      {hasError ? <span className="text-xs text-destructive" role="status" aria-live="polite">Không thể đăng xuất. Vui lòng thử lại.</span> : null}
      <Button className="rounded-sm" type="button" variant="outline" disabled={pending} onClick={logout}>
        {pending ? "Đang đăng xuất…" : "Đăng xuất"}
      </Button>
    </span>
  )
}
