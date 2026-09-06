import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-[var(--color-ink)]/40 backdrop-blur-[2px] p-3 sm:p-6 overflow-y-auto">
      <div
        className={`card w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} my-6 sm:my-0 max-h-[92vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-beige-deep)] px-5 sm:px-6 py-4 sm:py-5 sticky top-0 bg-[var(--color-paper)] rounded-t-2xl">
          <div>
            <h2 className="font-serif-display text-lg sm:text-xl text-[var(--color-ink)]">{title}</h2>
            {subtitle && <p className="text-sm text-[var(--color-ink)]/60 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--color-ink)]/50 hover:bg-[var(--color-beige)] hover:text-[var(--color-ink)] transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
