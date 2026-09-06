import type { ExportPayload } from '../data/types'
import { PRACTICUM_DATA_VERSION } from '../data/types'

export function downloadExport(payload: ExportPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = payload.exportedAt.slice(0, 10)
  a.href = url
  a.download = `znkstr-practicum-export-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function parseImportFile(text: string): ExportPayload {
  const data = JSON.parse(text)
  if (typeof data !== 'object' || data === null) throw new Error('Invalid file: not a JSON object.')
  if (!('version' in data)) throw new Error('Invalid file: missing version field.')
  if (!Array.isArray(data.clients)) throw new Error('Invalid file: missing clients array.')
  if (!data.practicum) throw new Error('Invalid file: missing practicum data.')
  if (data.version > PRACTICUM_DATA_VERSION) {
    throw new Error(`This file is from a newer version (v${data.version}) than this app supports (v${PRACTICUM_DATA_VERSION}). Upgrade the app before importing.`)
  }
  return data as ExportPayload
}
