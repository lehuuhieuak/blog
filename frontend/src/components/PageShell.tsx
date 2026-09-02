import type { ReactNode } from "react"

interface Props { children: ReactNode; width?: "reading" | "wide" }

export default function PageShell({ children, width = "reading" }: Props) {
  return <main id="main-content" className={`page-shell page-shell--${width}`} tabIndex={-1}>{children}</main>
}
