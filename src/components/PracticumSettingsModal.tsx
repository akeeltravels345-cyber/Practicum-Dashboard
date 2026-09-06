import { useState } from 'react'
import { Modal } from './Modal'
import { Field, TextInput, PrimaryButton, SecondaryButton } from './Form'
import { useWorkspaceStore } from '../state/store'

export function PracticumSettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useWorkspaceStore((s) => s.practicum.settings)
  const updatePracticumSettings = useWorkspaceStore((s) => s.updatePracticumSettings)

  const [directTarget, setDirectTarget] = useState(settings.directTarget)
  const [indirectTarget, setIndirectTarget] = useState(settings.indirectTarget)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updatePracticumSettings({ directTarget, indirectTarget })
    onClose()
  }

  return (
    <Modal title="Practicum settings" subtitle="Edit your program's hour targets — change these any time your requirements change." onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Direct hours target">
            <TextInput type="number" min="0" value={directTarget} onChange={(e) => setDirectTarget(Number(e.target.value))} />
          </Field>
          <Field label="Indirect hours target">
            <TextInput type="number" min="0" value={indirectTarget} onChange={(e) => setIndirectTarget(Number(e.target.value))} />
          </Field>
        </div>
        <p className="text-xs text-[var(--color-ink)]/50 mb-4">
          Total target: {directTarget + indirectTarget} hours. Default program target is 200 direct + 200 indirect = 400.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit">Save settings</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
