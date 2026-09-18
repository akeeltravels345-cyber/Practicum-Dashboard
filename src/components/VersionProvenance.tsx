import type { Client, ProposedChange } from '../data/types'
import { ChangeList } from './ChangeList'

/**
 * The approved half of the audit trail: which session a version came from, and
 * the individual changes the clinician accepted. Shown on every history entry
 * so "why does the record say this" can be answered long after approval.
 */
export function VersionProvenance({
  client,
  sessionId,
  changes,
}: {
  client: Client
  sessionId?: string
  changes?: ProposedChange[]
}) {
  if (!sessionId && !changes?.length) return null
  const session = sessionId ? client.sessions.find((s) => s.id === sessionId) : undefined
  return (
    <div className="mt-3 space-y-2">
      {sessionId && (
        <div className="text-xs text-[var(--color-ink)]/50">
          {session
            ? `Approved from session ${session.sessionNumber} (${session.date.slice(0, 10)})`
            : 'Approved from a session that has since been deleted. The approval still stands.'}
        </div>
      )}
      {changes && changes.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-[var(--color-sage-deep)] hover:underline">
            {changes.length} approved change{changes.length === 1 ? '' : 's'}, with evidence
          </summary>
          <div className="mt-2">
            <ChangeList changes={changes} />
          </div>
        </details>
      )}
    </div>
  )
}
