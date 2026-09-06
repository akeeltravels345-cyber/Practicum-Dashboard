import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useWorkspaceStore } from '../state/store'
import { SecondaryButton, PrimaryButton, TextArea } from '../components/Form'
import { formatDate } from '../utils/format'
import { Circle, CheckCircle2, Plus, Minus, Printer, ClipboardList, MessageSquare } from 'lucide-react'
import type { Client, SupervisionQuestion } from '../data/types'

type View = 'open' | 'agenda' | 'resolved'

interface Row {
  client: Client
  question: SupervisionQuestion
}

/**
 * Supervision prep.
 *
 * The questions the app generates are only useful if they turn into something
 * you can walk into a meeting with. So this page does three things the old
 * read-only list did not: lets you pick what to raise, lets you record what was
 * said, and prints the agenda.
 *
 * "On the agenda" and "resolved" are deliberately independent. A question can
 * be raised and still be open afterwards, which is often the honest outcome.
 */
export function Supervision() {
  const clients = useWorkspaceStore((s) => s.clients)
  const toggleAgenda = useWorkspaceStore((s) => s.toggleSupervisionAgenda)
  const clearAgenda = useWorkspaceStore((s) => s.clearSupervisionAgenda)
  const toggleResolved = useWorkspaceStore((s) => s.toggleSupervisionResolved)
  const updateNotes = useWorkspaceStore((s) => s.updateSupervisionNotes)

  const [view, setView] = useState<View>('open')
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [draftNote, setDraftNote] = useState('')

  const all: Row[] = clients.flatMap((client) => client.supervisionQuestions.map((question) => ({ client, question })))
  const open = all.filter((r) => !r.question.resolved)
  const agenda = open.filter((r) => r.question.onAgenda)
  const resolved = all.filter((r) => r.question.resolved)

  const rows = view === 'agenda' ? agenda : view === 'resolved' ? resolved : open
  const grouped = groupByClient(rows)

  function saveNote(r: Row) {
    updateNotes(r.client.id, r.question.id, draftNote)
    setNoteFor(null)
    setDraftNote('')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Clinical Thinking"
        title="Supervision"
        subtitle="Open questions across all cases. Pick what to raise, record what was said, and take the agenda in with you."
        actions={
          <>
            <SecondaryButton onClick={() => window.print()}>
              <Printer size={16} /> Print agenda
            </SecondaryButton>
            {agenda.length > 0 && (
              <SecondaryButton onClick={clearAgenda}>
                <ClipboardList size={16} /> Clear agenda
              </SecondaryButton>
            )}
          </>
        }
      />

      <div className="flex items-center gap-1.5 mb-5 print:hidden">
        <Tab active={view === 'open'} onClick={() => setView('open')} label={`Open (${open.length})`} />
        <Tab active={view === 'agenda'} onClick={() => setView('agenda')} label={`Agenda (${agenda.length})`} />
        <Tab active={view === 'resolved'} onClick={() => setView('resolved')} label={`Discussed (${resolved.length})`} />
      </div>

      {view === 'agenda' && agenda.length > 0 && (
        <div className="rounded-lg bg-[var(--color-beige)] px-3.5 py-3 text-xs text-[var(--color-ink)]/65 mb-5 print:hidden">
          This is what you are taking into supervision. Marking something discussed does not remove it from the agenda, and clearing the
          agenda does not mark anything discussed — a question can be raised and still be genuinely open afterwards.
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-sm text-[var(--color-ink)]/50">
          {view === 'open' && 'No open supervision questions.'}
          {view === 'agenda' && 'Nothing on the agenda yet. Add questions from the Open tab.'}
          {view === 'resolved' && 'Nothing marked as discussed yet.'}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([clientId, clientRows]) => {
            const client = clientRows[0].client
            return (
              <div key={clientId} className="card p-5">
                <div className="flex items-center justify-between mb-3 gap-3">
                  <Link
                    to={`/clients/${client.id}?tab=supervision`}
                    className="font-serif-display text-base text-[var(--color-ink)] hover:underline"
                  >
                    {client.label}
                  </Link>
                  <span className="text-xs text-[var(--color-ink)]/40">
                    {client.diagnosis || 'No diagnosis recorded'} · {clientRows.length}
                  </span>
                </div>

                <ul className="space-y-3">
                  {clientRows.map((r) => (
                    <li key={r.question.id} className="text-sm">
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={() => toggleResolved(client.id, r.question.id)}
                          className="mt-0.5 shrink-0 print:hidden"
                          title={r.question.resolved ? 'Mark as still open' : 'Mark as discussed'}
                        >
                          {r.question.resolved ? (
                            <CheckCircle2 size={15} className="text-[var(--color-sage-deep)]" />
                          ) : (
                            <Circle size={15} className="text-[var(--color-ink)]/25 hover:text-[var(--color-ink)]/50" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className={r.question.resolved ? 'text-[var(--color-ink)]/50 line-through decoration-[var(--color-ink)]/20' : 'text-[var(--color-ink)]/80'}>
                            {r.question.question}
                          </div>
                          <div className="text-xs text-[var(--color-ink)]/35 mt-0.5">Raised {formatDate(r.question.createdAt)}</div>

                          {r.question.notes ? (
                            <div className="mt-1.5 rounded bg-[var(--color-beige)]/60 px-2.5 py-1.5 text-[13px] text-[var(--color-ink)]/70">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/40">
                                From supervision
                              </span>
                              <div>{r.question.notes}</div>
                            </div>
                          ) : null}

                          {noteFor === r.question.id ? (
                            <div className="mt-2 print:hidden">
                              <TextArea
                                value={draftNote}
                                onChange={(e) => setDraftNote(e.target.value)}
                                placeholder="What did your supervisor say?"
                                className="min-h-[70px]"
                              />
                              <div className="flex items-center gap-2 mt-1.5">
                                <PrimaryButton type="button" onClick={() => saveNote(r)}>
                                  Save
                                </PrimaryButton>
                                <button
                                  onClick={() => setNoteFor(null)}
                                  className="text-xs text-[var(--color-ink)]/50 hover:text-[var(--color-ink)]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setNoteFor(r.question.id)
                                setDraftNote(r.question.notes ?? '')
                              }}
                              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-ink)]/45 hover:text-[var(--color-ink)] print:hidden"
                            >
                              <MessageSquare size={11} /> {r.question.notes ? 'Edit note' : 'Add note'}
                            </button>
                          )}
                        </div>

                        {!r.question.resolved && (
                          <button
                            onClick={() => toggleAgenda(client.id, r.question.id)}
                            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium print:hidden ${
                              r.question.onAgenda
                                ? 'bg-[var(--color-sage-tint)] text-[var(--color-sage-deep)]'
                                : 'text-[var(--color-ink)]/40 hover:text-[var(--color-ink)]/70'
                            }`}
                            title={r.question.onAgenda ? 'Remove from agenda' : 'Add to the next supervision agenda'}
                          >
                            {r.question.onAgenda ? <Minus size={11} /> : <Plus size={11} />}
                            {r.question.onAgenda ? 'On agenda' : 'Agenda'}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function groupByClient(rows: Row[]): Array<[string, Row[]]> {
  const map = new Map<string, Row[]>()
  for (const r of rows) {
    const list = map.get(r.client.id) ?? []
    list.push(r)
    map.set(r.client.id, list)
  }
  return [...map.entries()]
}

function Tab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-[var(--color-ink)] text-[var(--color-cream)]'
          : 'text-[var(--color-ink)]/55 hover:text-[var(--color-ink)] hover:bg-[var(--color-beige)]'
      }`}
    >
      {label}
    </button>
  )
}
