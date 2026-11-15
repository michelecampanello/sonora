import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

/** Passa al volo dal tema chiaro a quello scuro e viceversa. "Come il dispositivo" resta nelle impostazioni. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const Icon = isDark ? Sun : Moon

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Passa al tema chiaro" : "Passa al tema scuro"}
      title={isDark ? "Tema chiaro" : "Tema scuro"}
      className="flex size-9 shrink-0 items-center justify-center transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}
