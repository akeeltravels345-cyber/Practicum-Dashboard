import type { Client } from '../data/types'

export interface SearchResult {
  client: Client
  matchedIn: string
  snippet: string
}

export function searchClients(clients: Client[], query: string): SearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const results: SearchResult[] = []

  for (const c of clients) {
    const fields: Array<[string, string]> = [
      ['Client label', c.label],
      ['Diagnosis', c.diagnosis],
      ['Presenting concern', c.presentingConcern],
      ['Themes', c.themes.join(', ')],
      ['Working synthesis', c.formulation.workingSynthesis],
      ['Treatment plan', c.treatmentPlan.currentPlan],
    ]
    for (const [label, value] of fields) {
      if (value && value.toLowerCase().includes(q)) {
        results.push({ client: c, matchedIn: label, snippet: snippetAround(value, q) })
      }
    }
    for (const s of c.sessions) {
      if (s.rawText.toLowerCase().includes(q)) {
        results.push({ client: c, matchedIn: `Session ${s.sessionNumber} note`, snippet: snippetAround(s.rawText, q) })
      }
    }
  }
  return results
}

function snippetAround(text: string, q: string, radius = 60): string {
  const idx = text.toLowerCase().indexOf(q)
  if (idx === -1) return text.slice(0, 120)
  const start = Math.max(0, idx - radius)
  const end = Math.min(text.length, idx + q.length + radius)
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}
