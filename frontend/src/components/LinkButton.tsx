import type { ComponentProps, ReactNode } from "react"

import { Button } from "@/components/ui/button"

type LinkButtonProps = ComponentProps<"a"> & {
  children: ReactNode
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"
}

export default function LinkButton({
  children,
  className,
  href,
  variant,
  size,
  ...props
}: LinkButtonProps) {
  return (
    <Button
      nativeButton={false}
      variant={variant}
      size={size}
      className={className}
      render={<a href={href} {...props} />}
    >
      {children}
    </Button>
  )
}
