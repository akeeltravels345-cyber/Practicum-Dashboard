import { useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Modal } from './Modal'
import { Field, TextInput, PrimaryButton, SecondaryButton } from './Form'
import { useWorkspaceStore } from '../state/store'
import { testAiConnection } from '../clinical/ai'
import { DEFAULT_AI_MODEL } from '../data/types'

export function AiSettingsModal({ onClose }: { onClose: () => void }) {
  const aiSettings = useWorkspaceStore((s) => s.aiSettings)
  const updateAiSettings = useWorkspaceStore((s) => s.updateAiSettings)

  const [enabled, setEnabled] = useState(aiSettings.enabled)
  const [apiKey, setApiKey] = useState(aiSettings.apiKey)
  const [model, setModel] = useState(aiSettings.model || DEFAULT_AI_MODEL)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    const result = await testAiConnection({ enabled: true, apiKey, model: model.trim() || DEFAULT_AI_MODEL })
    setTestResult(result)
    setTesting(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateAiSettings({ enabled, apiKey: apiKey.trim(), model: model.trim() || DEFAULT_AI_MODEL })
    onClose()
  }

  return (
    <Modal
      title="AI Assist settings"
      subtitle="Optional. When enabled, new session notes are analyzed by calling the Anthropic API directly from this browser."
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit}>
        <div className="rounded-lg bg-[var(--color-beige)] px-3.5 py-3 text-xs text-[var(--color-ink)]/65 mb-4 space-y-1.5">
          <p>
            Your API key is stored only in this browser's local storage and is sent only to <code>api.anthropic.com</code> — never to any
            other server, and never included in workspace export files.
          </p>
          <p>
            The only content sent is what's already in this app: this client's de-identified profile, prior session notes, and current
            clinical documents. Keep session notes de-identified before pasting them — "Paste session" will warn you if text that looks
            identifying is detected.
          </p>
          <p>
            When AI Assist is off (or no key is set), the app falls back to a fully local, offline rule-based drafting engine —
            nothing ever leaves your machine.
          </p>
        </div>

        <label className="flex items-center gap-2.5 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-sage-deep)]"
          />
          <span className="text-sm font-medium text-[var(--color-ink)]/80">Enable AI Assist (live Claude analysis)</span>
        </label>

        <Field label="Anthropic API key" hint="Starts with sk-ant-… Create one at console.anthropic.com.">
          <TextInput type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-…" autoComplete="off" />
        </Field>

        <Field
          label="Model"
          hint="Check docs.claude.com/en/docs/about-claude/models for the current recommended model id if this default has since been retired."
        >
          <TextInput value={model} onChange={(e) => setModel(e.target.value)} placeholder={DEFAULT_AI_MODEL} />
        </Field>

        <div className="flex items-center gap-3 mb-4">
          <SecondaryButton type="button" onClick={handleTest} disabled={!apiKey.trim() || testing}>
            {testing ? <Loader2 size={14} className="animate-spin" /> : null} Test connection
          </SecondaryButton>
          {testResult && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                testResult.ok ? 'text-[var(--color-sage-deep)]' : 'text-[var(--color-clay-deep)]'
              }`}
            >
              {testResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {testResult.message}
            </span>
          )}
        </div>

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
