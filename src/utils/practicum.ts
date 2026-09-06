import type { PracticumState } from '../data/types'

export function totalHours(practicum: PracticumState, kind: 'direct' | 'indirect'): number {
  return practicum.entries.filter((e) => e.kind === kind).reduce((sum, e) => sum + e.amount, 0)
}

export function totalAllHours(practicum: PracticumState): number {
  return totalHours(practicum, 'direct') + totalHours(practicum, 'indirect')
}

export function totalTarget(practicum: PracticumState): number {
  return practicum.settings.directTarget + practicum.settings.indirectTarget
}

export function pct(value: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((value / target) * 100))
}
