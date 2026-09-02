"use client"

import { useEffect, useState } from "react"
import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

type Theme = "light" | "dark"

function savedTheme(): Theme | undefined {
  try {
    const value = window.localStorage.getItem("theme")
    return value === "light" || value === "dark" ? value : undefined
  } catch {
    return undefined
  }
}

function setDocumentTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
}

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
    const synchronizeTheme = () => {
      const selectedTheme = savedTheme() ?? (systemTheme.matches ? "dark" : "light")
      setDocumentTheme(selectedTheme)
      setIsDark(selectedTheme === "dark")
    }
    const handleSystemThemeChange = () => {
      if (!savedTheme()) synchronizeTheme()
    }

    synchronizeTheme()
    systemTheme.addEventListener("change", handleSystemThemeChange)
    return () => systemTheme.removeEventListener("change", handleSystemThemeChange)
  }, [])

  const toggleTheme = () => {
    const nextTheme: Theme = isDark ? "light" : "dark"
    setDocumentTheme(nextTheme)
    try {
      window.localStorage.setItem("theme", nextTheme)
    } catch {
      // The selected theme still applies for this page if storage is unavailable.
    }
    setIsDark(nextTheme === "dark")
  }

  const label = isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"

  return (
    <Button
      className="theme-toggle"
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label={label}
      aria-pressed={isDark}
      data-theme-toggle
      onClick={toggleTheme}
    >
      {isDark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
      <span className="sr-only">{label}</span>
    </Button>
  )
}
