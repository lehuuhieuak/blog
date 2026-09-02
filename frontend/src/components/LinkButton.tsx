import type { ComponentProps, ReactNode } from "react"

import { staticButtonClass, type StaticButtonSize, type StaticButtonVariant } from "@/components/ui/server-button-styles"

type LinkButtonProps = ComponentProps<"a"> & { children: ReactNode; variant?: StaticButtonVariant; size?: StaticButtonSize }

export default function LinkButton({ children, className, variant, size, ...props }: LinkButtonProps) {
  return <a className={staticButtonClass(variant, size, className)} {...props}>{children}</a>
}
