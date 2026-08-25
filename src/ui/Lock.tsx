import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import * as lock from '@/core/lock'
import { Icon } from './Icon'

/* ------------------------------------------------------------------ */
/* Privacy gate. One provider owns the unlock session; any screen can */
/* call ensureUnlocked() and receive a promise that resolves when the */
/* user has authenticated (or rejects/cancels).                       */
/* ------------------------------------------------------------------ */

interface LockApi {
  configured: boolean
  unlocked: boolean
  refresh: () => Promise<void>
  ensureUnlocked: () => Promise<boolean>
  lockNow: () => void
}

const LockContext = createContext<LockApi>({
  configured: false,
  unlocked: true,
  refresh: async () => {},
  ensureUnlocked: async () => true,
  lockNow: () => {},
})

export function useLock() {
  return useContext(LockContext)
}

export function LockProvider({ children }: { children: ReactNode }) {
  const [configured, setConfigured] = useState(false)
  const [unlocked, setUnlocked] = useState(true)
  const [gate, setGate] = useState<{ resolve: (v: boolean) => void } | null>(null)
  const [bioAvailable, setBioAvailable] = useState(false)
  const [bioEnabled, setBioEnabled] = useState(false)

  const refresh = useCallback(async () => {
    const cfg = await lock.isLockConfigured()
    setConfigured(cfg)
    setUnlocked(!cfg || lock.isUnlocked())
    setBioEnabled(await lock.isBiometricEnabled())
    setBioAvailable(await lock.biometricsAvailable())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const ensureUnlocked = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        refresh().then(() => {
          if (!configured || lock.isUnlocked()) {
            resolve(true)
            return
          }
          setGate({ resolve })
        })
      }),
    [configured, refresh]
  )

  const finish = (ok: boolean) => {
    gate?.resolve(ok)
    setGate(null)
    if (ok) setUnlocked(true)
  }

  const lockNow = useCallback(() => {
    lock.lockSession()
    setUnlocked(false)
  }, [])

  return (
    <LockContext.Provider value={{ configured, unlocked, refresh, ensureUnlocked, lockNow }}>
      {children}
      {gate && (
        <UnlockOverlay
          bioEnabled={bioEnabled && bioAvailable}
          onUnlock={() => finish(true)}
          onCancel={() => finish(false)}
        />
      )}
    </LockContext.Provider>
  )
}

function UnlockOverlay({
  bioEnabled,
  onUnlock,
  onCancel,
}: {
  bioEnabled: boolean
  onUnlock: () => void
  onCancel: () => void
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const busy = useRef(false)

  const submit = async (value: string) => {
    if (busy.current) return
    busy.current = true
    const ok = await lock.verifyPasscode(value)
    busy.current = false
    if (ok) {
      lock.markUnlocked()
      onUnlock()
    } else {
      setError(true)
      setCode('')
      setTimeout(() => setError(false), 700)
    }
  }

  const press = (digit: string) => {
    const next = (code + digit).slice(0, 6)
    setCode(next)
    if (next.length === 6) submit(next)
  }

  const tryBiometric = async () => {
    const ok = await lock.authenticateBiometric()
    if (ok) {
      lock.markUnlocked()
      onUnlock()
    }
  }

  useEffect(() => {
    if (bioEnabled) tryBiometric()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="unlock-overlay">
      <div className="unlock-card">
        <div className="unlock-icon">
          <Icon name="lock" size={26} />
        </div>
        <h2>Private content</h2>
        <p className="unlock-sub">Enter your passcode to continue</p>
        <div className={`unlock-dots ${error ? 'unlock-dots-error' : ''}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className={`unlock-dot ${i < code.length ? 'filled' : ''}`} />
          ))}
        </div>
        <div className="unlock-pad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} className="unlock-key" onClick={() => press(d)}>
              {d}
            </button>
          ))}
          <span />
          <button className="unlock-key" onClick={() => press('0')}>0</button>
          <button
            className="unlock-key unlock-key-icon"
            onClick={() => setCode((c) => c.slice(0, -1))}
            aria-label="Delete"
          >
            <Icon name="chevron-left" size={22} />
          </button>
        </div>
        {bioEnabled && (
          <button className="unlock-bio" onClick={tryBiometric}>
            <Icon name="scan-face" size={18} /> Use Face ID / biometrics
          </button>
        )}
        <button className="unlock-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
