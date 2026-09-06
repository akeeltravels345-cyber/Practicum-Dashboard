import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from './Modal'
import { Field, TextInput, TextArea, Select, PrimaryButton, SecondaryButton } from './Form'
import { useWorkspaceStore } from '../state/store'
import type { ClientStatus } from '../data/types'

export function NewClientModal({ onClose }: { onClose: () => void }) {
  const addClient = useWorkspaceStore((s) => s.addClient)
  const navigate = useNavigate()

  const [label, setLabel] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [diagnosis, setDiagnosis] = useState('')
  const [status, setStatus] = useState<ClientStatus>('Intake')
  const [presentingConcern, setPresentingConcern] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    const id = addClient({ label: label.trim(), age: age === '' ? 0 : age, diagnosis, status, presentingConcern })
    onClose()
    navigate(`/clients/${id}`)
  }

  return (
    <Modal title="New client" subtitle="Use an anonymous label only — never a real name." onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Client label" hint='e.g. "Client M" — never a real name.'>
          <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Client M" required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Age">
            <TextInput type="number" min="0" value={age} onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as ClientStatus)}>
              <option value="Intake">Intake</option>
              <option value="Active">Active</option>
              <option value="On Hold">On Hold</option>
              <option value="Closed">Closed</option>
            </Select>
          </Field>
        </div>
        <Field label="Diagnosis / working diagnosis">
          <TextInput value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. GAD, Adjustment Disorder" />
        </Field>
        <Field label="Presenting concern">
          <TextArea value={presentingConcern} onChange={(e) => setPresentingConcern(e.target.value)} className="min-h-[80px]" />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit">Create client</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
