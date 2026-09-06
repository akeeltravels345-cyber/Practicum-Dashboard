import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar, SidebarContent } from './Sidebar'
import { GlobalSearch } from './GlobalSearch'

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      <Sidebar />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-[var(--color-charcoal)]">
            <SidebarContent onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--color-beige-deep)] bg-[var(--color-cream)]/90 backdrop-blur px-4 sm:px-6 py-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden rounded-lg p-2 text-[var(--color-ink)]/70 hover:bg-[var(--color-beige)]"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1 flex justify-end sm:justify-start">
            <GlobalSearch />
          </div>
        </header>
        <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
