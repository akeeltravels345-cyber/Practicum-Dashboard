// Rolling local backups.
//
// The whole workspace lives in one browser's localStorage. Clearing site data,
// switching laptop, or a browser wiping storage under pressure would take a
// year of practicum work with it, and the existing Export button only helps if
// you remember to press it. So the app keeps its own rolling snapshots.
//
// These are a safety net, not an archive: they live in the same browser, so
// they survive an accidental in-app wipe but not a cleared profile or a lost
// machine. The UI says so, and still nags for a real off-machine export.

import type { ExportPayload } from '../data/types'

const KEY = 'znkstr-practicum-backups-v1'
const MAX_SNAPSHOTS = 10
const MIN_GAP_MS = 1000 * 60 * 60 * 6 // at most one automatic snapshot per 6h

export interface Snapshot {
  takenAt: string
  clientCount: number
  sessionCount: number
  payload: ExportPayload
}

export interface BackupState {
  snapshots: Snapshot[]
  lastExportAt: string | null // last time a real file left the browser
}

const EMPTY: BackupState = { snapshots: [], lastExportAt: null }

export function readBackups(): BackupState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as BackupState
    return {
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
      lastExportAt: typeof parsed.lastExportAt === 'string' ? parsed.lastExportAt : null,
    }
  } catch {
    // A corrupt backup store must never take the app down with it.
    return EMPTY
  }
}

function write(state: BackupState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded. Drop the oldest half and try once more rather than
    // failing silently and leaving the user with no backups at all.
    try {
      const trimmed = { ...state, snapshots: state.snapshots.slice(-Math.ceil(state.snapshots.length / 2)) }
      localStorage.setItem(KEY, JSON.stringify(trimmed))
    } catch {
      /* give up quietly — backups must never block the app */
    }
  }
}

export function recordExport() {
  write({ ...readBackups(), lastExportAt: new Date().toISOString() })
}

/**
 * Take a snapshot if enough time has passed since the last one.
 * Returns true when a snapshot was actually written.
 */
export function maybeSnapshot(payload: ExportPayload, force = false): boolean {
  const state = readBackups()
  const latest = state.snapshots[state.snapshots.length - 1]

  if (!force && latest && Date.now() - Date.parse(latest.takenAt) < MIN_GAP_MS) return false

  const sessionCount = payload.clients.reduce((n, c) => n + c.sessions.length, 0)

  // Never let an empty or shrunken workspace quietly overwrite good history.
  // If the newest snapshot has more in it than what we are about to store, keep
  // both — the whole point is to survive an accidental wipe.
  if (!force && latest && sessionCount === 0 && latest.sessionCount > 0) return false

  const snapshots = [
    ...state.snapshots,
    { takenAt: new Date().toISOString(), clientCount: payload.clients.length, sessionCount, payload },
  ].slice(-MAX_SNAPSHOTS)

  write({ ...state, snapshots })
  return true
}

/** Days since a real export file was saved out of the browser, or null if never. */
export function daysSinceExport(): number | null {
  const { lastExportAt } = readBackups()
  if (!lastExportAt) return null
  return Math.floor((Date.now() - Date.parse(lastExportAt)) / (1000 * 60 * 60 * 24))
}

/** True when the user should be nudged to save a real backup off the machine. */
export function shouldNagForExport(hasWork: boolean): boolean {
  if (!hasWork) return false
  const days = daysSinceExport()
  return days === null || days >= 7
}
