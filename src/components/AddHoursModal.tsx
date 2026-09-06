import { useState } from 'react'
import { Modal } from './Modal'
import { Field, TextInput, Select, PrimaryButton, SecondaryButton } from './Form'
import { useWorkspaceStore } from '../state/store'
import { INDIRECT_CATEGORIES } from '../data/types'

export function AddHoursModal({ kind, onClose }: { kind: 'direct' | 'indirect'; onClose: () => void }) {
  const addDirectHours = useWorkspaceStore((s) => s.addDirectHours)
  const addIndirectHours = useWorkspaceStore((s) => s.addIndirectHours)
  const clients = useWorkspaceStore((s) => s.clients)

  const [amount, setAmount] = useState(1)
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState<string>(INDIRECT_CATEGORIES[0])
  const [clientId, setClientId] = useState<string>('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (amount <= 0) return
    if (kind === 'direct') {
      const client = clients.find((c) => c.id === clientId)
      addDirectHours(amount, label.trim() || (client ? `${client.label} — manual entry` : 'Manual direct entry'), clientId || undefined)
    } else {
      addIndirectHours(amount, label.trim() || category, category)
    }
    onClose()
  }

  return (
    <Modal title={kind === 'direct' ? 'Add direct hours' : 'Add indirect hours'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Hours">
          <TextInput type="number" step="0.25" min="0.25" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} autoFocus />
        </Field>
        {kind === 'indirect' ? (
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {INDIRECT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Related client (optional)">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">— None —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Label / description" hint="Optional — defaults to the category or client.">
          <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder={kind === 'indirect' ? category : 'e.g. make-up session'} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit">Add hours</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
