import type { ReactNode } from "react"

interface Props { children: ReactNode; width?: "reading" | "wide" }

const widths = {
  reading: "max-w-[52rem]",
  wide: "max-w-[88rem]",
} as const

export default function PageShell({ children, width = "reading" }: Props) {
  return (
    <main id="main-content" className={`mx-auto w-full ${widths[width]} px-4 py-10 outline-none sm:px-8 sm:py-16`} tabIndex={-1}>
      {children}
    </main>
  )
}
