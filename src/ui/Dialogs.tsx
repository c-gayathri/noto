import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

/* Promise-based confirm + prompt dialogs, styled to match the app. */

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  destructive?: boolean
}

interface PromptOptions {
  title: string
  placeholder?: string
  initial?: string
  confirmLabel?: string
  multiline?: boolean
}

interface DialogsApi {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  prompt: (opts: PromptOptions) => Promise<string | null>
}

const DialogsContext = createContext<DialogsApi>({
  confirm: async () => false,
  prompt: async () => null,
})

export function useDialogs() {
  return useContext(DialogsContext)
}

export function DialogsProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const [promptState, setPromptState] = useState<(PromptOptions & { resolve: (v: string | null) => void }) | null>(null)
  const [promptValue, setPromptValue] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve })),
    []
  )

  const prompt = useCallback(
    (opts: PromptOptions) => {
      setPromptValue(opts.initial ?? '')
      return new Promise<string | null>((resolve) =>
        setPromptState({ ...opts, resolve })
      )
    },
    []
  )

  const closePrompt = (value: string | null) => {
    promptState?.resolve(value)
    setPromptState(null)
  }

  return (
    <DialogsContext.Provider value={{ confirm, prompt }}>
      {children}

      {confirmState && (
        <div className="scrim scrim-dark" onClick={() => { confirmState.resolve(false); setConfirmState(null) }}>
          <div className="modal modal-center dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmState.title}</h3>
            {confirmState.message && <p className="dialog-message">{confirmState.message}</p>}
            <div className="dialog-actions">
              <button
                className="btn btn-ghost"
                onClick={() => { confirmState.resolve(false); setConfirmState(null) }}
              >
                Cancel
              </button>
              <button
                className={`btn ${confirmState.destructive ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => { confirmState.resolve(true); setConfirmState(null) }}
              >
                {confirmState.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {promptState && (
        <div className="scrim scrim-dark" onClick={() => closePrompt(null)}>
          <div className="modal modal-center dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{promptState.title}</h3>
            {promptState.multiline ? (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                className="input"
                rows={4}
                autoFocus
                placeholder={promptState.placeholder}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
              />
            ) : (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                className="input"
                autoFocus
                placeholder={promptState.placeholder}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') closePrompt(promptValue.trim() || null)
                }}
                onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
              />
            )}
            <div className="dialog-actions">
              <button className="btn btn-ghost" onClick={() => closePrompt(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => closePrompt(promptValue.trim() || null)}
              >
                {promptState.confirmLabel ?? 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogsContext.Provider>
  )
}

/* ------------------------------------------------------------------ */
/* Toasts                                                            */
/* ------------------------------------------------------------------ */

interface ToastApi {
  show: (message: string, icon?: string) => void
}

const ToastContext = createContext<ToastApi>({ show: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

interface ToastItem {
  id: number
  message: string
  icon?: string
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const show = useCallback((message: string, icon?: string) => {
    const id = ++counter.current
    setItems((prev) => [...prev, { id, message, icon }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2600)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="toast-stack">
        {items.map((t) => (
          <div key={t.id} className="toast">
            {t.icon && <Icon name={t.icon} size={17} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
