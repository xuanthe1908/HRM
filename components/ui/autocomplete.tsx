"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface AutocompleteOption {
  label: string
  value: string
}

interface AutocompleteProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  options: AutocompleteOption[]
  className?: string
  inputClassName?: string
  listMaxHeight?: number
}

export function Autocomplete({
  value,
  onChange,
  placeholder = "Nhập để tìm...",
  options,
  className,
  inputClassName,
  listMaxHeight = 240,
}: AutocompleteProps) {
  const [query, setQuery] = React.useState(value ?? "")
  const [open, setOpen] = React.useState(false)
  const [highlightIndex, setHighlightIndex] = React.useState<number>(-1)
  const [openUpwards, setOpenUpwards] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [computedMaxHeight, setComputedMaxHeight] = React.useState<number>(listMaxHeight)

  React.useEffect(() => {
    setQuery(value ?? "")
  }, [value])

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setHighlightIndex(-1)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Compute filtered options BEFORE defining placement logic to avoid TDZ issues
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options.slice(0, 20)
    return options
      .filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
      .slice(0, 20)
  }, [query, options])
  const filteredLength = filtered.length

  const recomputePlacement = React.useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const margin = 8
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const estimated = Math.min(listMaxHeight, Math.max(120, filteredLength * 36))
    const shouldOpenUp = spaceBelow < Math.min(estimated, 200) && spaceAbove > spaceBelow
    setOpenUpwards(shouldOpenUp)
    const maxH = shouldOpenUp ? Math.max(120, Math.min(spaceAbove - margin, listMaxHeight)) : Math.max(120, Math.min(spaceBelow - margin, listMaxHeight))
    setComputedMaxHeight(isFinite(maxH) ? maxH : listMaxHeight)
  }, [filteredLength, listMaxHeight])

  React.useEffect(() => {
    if (open) {
      recomputePlacement()
      const onResize = () => recomputePlacement()
      const onScroll = () => recomputePlacement()
      window.addEventListener("resize", onResize)
      window.addEventListener("scroll", onScroll, true)
      return () => {
        window.removeEventListener("resize", onResize)
        window.removeEventListener("scroll", onScroll, true)
      }
    }
  }, [open, recomputePlacement])

  // filtered computed above

  const select = (opt: AutocompleteOption) => {
    onChange(opt.value)
    setQuery(opt.label)
    setOpen(false)
    setHighlightIndex(-1)
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true)
      return
    }
    if (!filtered.length) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIndex(i => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const idx = highlightIndex >= 0 ? highlightIndex : 0
      select(filtered[idx])
    } else if (e.key === "Escape") {
      setOpen(false)
      setHighlightIndex(-1)
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <input
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          inputClassName,
        )}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
          setOpen(true)
          setHighlightIndex(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && filtered.length > 0 && (
        <div
          className={cn(
            "absolute z-50 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
            openUpwards ? "bottom-full mb-1" : "mt-1"
          )}
          style={{ maxHeight: computedMaxHeight, overflowY: "auto" }}
        >
          {filtered.map((opt, idx) => (
            <div
              key={opt.value}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                idx === highlightIndex && "bg-accent text-accent-foreground"
              )}
              onMouseEnter={() => setHighlightIndex(idx)}
              onMouseDown={(e) => { e.preventDefault(); select(opt) }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


