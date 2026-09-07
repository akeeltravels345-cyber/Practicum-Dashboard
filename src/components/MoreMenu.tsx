import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'

export interface MoreMenuItem {
  label: string
  onSelect: () => void
  icon?: ReactNode
  /** Rendered dimmer, below a divider — for the destructive or rarely-wanted ones. */
  separated?: boolean
}

/**
 * Condenses the secondary page actions into one control.
 *
 * The dashboard header had six equal-weight buttons, which made none of them
 * read as the thing you actually came to do. Everything still lives here, so no
 * action was removed — only demoted a click.
 */
export function MoreMenu({ items, label = 'More' }: { items: MoreMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-beige-deep)] bg-[var(--color-paper)] px-3.5 py-2 text-sm font-medium text-[var(--color-ink)]/75 transition-colors hover:text-[var(--color-ink)] hover:bg-[var(--color-beige)]/50"
      >
        {label} <MoreHorizontal size={15} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-[var(--color-beige-deep)] bg-[var(--color-paper)] py-1.5 shadow-lg"
        >
          {items.map((item, i) => (
            <div key={item.label}>
              {item.separated && i > 0 && <div className="my-1.5 border-t border-[var(--color-beige-deep)]" />}
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-[var(--color-ink)]/80 transition-colors hover:bg-[var(--color-beige)]/60 hover:text-[var(--color-ink)]"
              >
                {item.icon}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
