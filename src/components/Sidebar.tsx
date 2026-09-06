import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Inbox,
  Users2,
  ClipboardList,
  Presentation,
  GraduationCap,
  AlertTriangle,
  X,
} from 'lucide-react'
import { classNames } from '../utils/format'

const WORKSPACE_LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/inbox', label: 'Session Inbox', icon: Inbox },
]

const CLINICAL_LINKS = [
  { to: '/supervision', label: 'Supervision', icon: Users2 },
  { to: '/treatment-plans', label: 'Treatment Plan', icon: ClipboardList },
  { to: '/presentations', label: 'Case Presentations', icon: Presentation },
  { to: '/learning', label: 'Clinical Learning', icon: GraduationCap },
  { to: '/gaps', label: 'Documentation Gaps', icon: AlertTriangle },
]

function NavSection({ title, links, onNavigate }: { title: string; links: typeof WORKSPACE_LINKS; onNavigate?: () => void }) {
  return (
    <div className="mb-6">
      <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-cream)]/35">
        {title}
      </div>
      <nav className="flex flex-col gap-0.5">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              classNames(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-[var(--color-sage-deep)]/25 text-[var(--color-cream)] font-medium'
                  : 'text-[var(--color-cream)]/65 hover:bg-white/5 hover:text-[var(--color-cream)]',
              )
            }
          >
            <Icon size={16} className="shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function SidebarContent({ onNavigate, onClose }: { onNavigate?: () => void; onClose?: () => void }) {
  return (
    <div className="flex h-full flex-col px-3 py-5">
      <div className="flex items-center justify-between px-2 mb-1">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-sage-light)]">ZNKSTR</div>
          <div className="font-serif-display text-lg text-[var(--color-cream)] -mt-0.5">Practicum</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-full p-1.5 text-[var(--color-cream)]/60 hover:bg-white/10 md:hidden">
            <X size={18} />
          </button>
        )}
      </div>
      <div className="h-px bg-[var(--color-charcoal-line)] my-4" />
      <NavSection title="Workspace" links={WORKSPACE_LINKS} onNavigate={onNavigate} />
      <NavSection title="Clinical Thinking" links={CLINICAL_LINKS} onNavigate={onNavigate} />
      <div className="mt-auto pt-4">
        <NavLink
          to="/practicum"
          onClick={onNavigate}
          className={({ isActive }) =>
            classNames(
              'block rounded-xl px-3.5 py-3 transition-colors',
              isActive ? 'bg-[var(--color-sage-deep)]/25' : 'bg-white/[0.04] hover:bg-white/[0.07]',
            )
          }
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-sage-light)]">
            ZNKSTR · Progress
          </div>
          <div className="text-sm text-[var(--color-cream)]/85 mt-0.5">Practicum Hours →</div>
        </NavLink>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-[var(--color-charcoal)]">
      <SidebarContent />
    </aside>
  )
}
