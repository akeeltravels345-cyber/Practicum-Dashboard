import { useState } from 'react'
import { ShieldAlert, History, RotateCcw } from 'lucide-react'
import { Modal } from './Modal'
import { SecondaryButton } from './Form'
import { useWorkspaceStore } from '../state/store'
import { downloadExport } from '../services/portability'
import { readBackups, recordExport, daysSinceExport, shouldNagForExport, maybeSnapshot, type Snapshot } from '../services/backup'
import { formatDate } from '../utils/format'

/**
 * Two jobs: nag for a real off-machine backup, and offer the rolling in-browser
 * snapshots as a recovery path. The snapshots are deliberately described as the
 * weaker option — they live in the same browser as the thing they protect.
 */
export function BackupBanner() {
  const clients = useWorkspaceStore((s) => s.clients)
  const exportWorkspace = useWorkspaceStore((s) => s.exportWorkspace)
  const [showHistory, setShowHistory] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const sessionCount = clients.reduce((n, c) => n + c.sessions.length, 0)
  const hasWork = sessionCount > 0
  const days = daysSinceExport()
  const nag = shouldNagForExport(hasWork) && !dismissed

  function handleExport() {
    downloadExport(exportWorkspace())
    recordExport()
    setDismissed(true)
  }

  if (!nag && !showHistory) {
    if (!hasWork) return null
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--color-ink)]/45">
        <History size={12} className="shrink-0" />
        <span>
          {days === null ? 'No backup saved yet' : days === 0 ? 'Backed up today' : `Last backup ${days} day${days === 1 ? '' : 's'} ago`}
        </span>
        <span aria-hidden="true">·</span>
        <button onClick={handleExport} className="font-medium text-[var(--color-sage-deep)] hover:underline">
          Save one now
        </button>
        <span aria-hidden="true">·</span>
        <button onClick={() => setShowHistory(true)} className="hover:text-[var(--color-ink)]">
          Snapshots
        </button>
      </div>
    )
  }

  return (
    <>
      {nag && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 mb-5">
          <div className="flex items-start gap-2.5">
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-800" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-900">
                {days === null
                  ? 'You have never saved a backup file.'
                  : `Your last backup file was ${days} day${days === 1 ? '' : 's'} ago.`}
              </p>
              <p className="text-xs text-amber-900/75 mt-0.5">
                Everything in this app lives in this browser only. Clearing your browsing data, or moving to another computer, would
                take {sessionCount} session{sessionCount === 1 ? '' : 's'} of work with it. Save a copy somewhere you actually keep files.
              </p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <SecondaryButton onClick={handleExport}>Save a backup file</SecondaryButton>
                <button
                  onClick={() => setShowHistory(true)}
                  className="text-xs font-medium text-amber-900/70 hover:text-amber-900 underline"
                >
                  See in-browser snapshots
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="text-xs font-medium text-amber-900/50 hover:text-amber-900"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showHistory && <BackupHistoryModal onClose={() => setShowHistory(false)} />}
    </>
  )
}

function BackupHistoryModal({ onClose }: { onClose: () => void }) {
  const importWorkspace = useWorkspaceStore((s) => s.importWorkspace)
  const exportWorkspace = useWorkspaceStore((s) => s.exportWorkspace)
  const [confirming, setConfirming] = useState<Snapshot | null>(null)
  const { snapshots } = readBackups()

  function restore(snap: Snapshot) {
    // Snapshot the CURRENT state before replacing it, so a mis-clicked restore
    // is itself recoverable. Restoring is the one destructive action here.
    try {
      maybeSnapshot(exportWorkspace(), true)
    } catch {
      /* non-fatal */
    }
    importWorkspace(snap.payload)
    onClose()
  }

  return (
    <Modal
      title="Backups"
      subtitle="Automatic snapshots taken as you work. They live in this browser, so treat them as an undo, not as a real backup."
      onClose={onClose}
      wide
    >
      <div className="rounded-lg bg-[var(--color-beige)] px-3.5 py-3 text-xs text-[var(--color-ink)]/65 mb-4">
        These snapshots protect you from an accidental wipe inside the app. They do <strong>not</strong> protect you from clearing your
        browsing data, a browser reset, or a lost laptop, because they are stored in the same place as your work. For that, use
        <strong> Save a backup file</strong> and keep the file somewhere else.
      </div>

      {snapshots.length === 0 ? (
        <p className="text-sm text-[var(--color-ink)]/50">No snapshots yet. One is taken automatically when you save a session.</p>
      ) : (
        <div className="space-y-2">
          {[...snapshots].reverse().map((snap) => (
            <div key={snap.takenAt} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-beige-deep)] px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--color-ink)]">{formatDate(snap.takenAt)}</div>
                <div className="text-xs text-[var(--color-ink)]/45">
                  {snap.clientCount} client{snap.clientCount === 1 ? '' : 's'} · {snap.sessionCount} session
                  {snap.sessionCount === 1 ? '' : 's'}
                </div>
              </div>
              {confirming?.takenAt === snap.takenAt ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[var(--color-clay)]">Replace everything?</span>
                  <SecondaryButton onClick={() => restore(snap)}>Yes, restore</SecondaryButton>
                  <button onClick={() => setConfirming(null)} className="text-xs text-[var(--color-ink)]/50 hover:text-[var(--color-ink)]">
                    Cancel
                  </button>
                </div>
              ) : (
                <SecondaryButton onClick={() => setConfirming(snap)}>
                  <RotateCcw size={13} /> Restore
                </SecondaryButton>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
