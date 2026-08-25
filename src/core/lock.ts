import { getMeta, setMeta } from './db'

/* ------------------------------------------------------------------ */
/* Authentication layer for private content.                          */
/* Primary: platform biometrics via WebAuthn. Fallback: device-style  */
/* passcode (SHA-256 hashed, stored locally). Unlock is per-session.  */
/* ------------------------------------------------------------------ */

const KEY_HASH = 'lock.passcodeHash'
const KEY_BIO = 'lock.biometric'
const KEY_CRED = 'lock.credId'
const SESSION_KEY = 'nimbus.unlocked'

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function isLockConfigured(): Promise<boolean> {
  return !!(await getMeta<string | null>(KEY_HASH, null))
}

export async function isBiometricEnabled(): Promise<boolean> {
  return getMeta<boolean>(KEY_BIO, false)
}

export async function biometricsAvailable(): Promise<boolean> {
  try {
    const win = window as Window & {
      PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> }
    }
    return !!win.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable &&
      (await win.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  } catch {
    return false
  }
}

export async function setPasscode(code: string): Promise<void> {
  await setMeta(KEY_HASH, await sha256(`nimbus:${code}`))
  sessionStorage.setItem(SESSION_KEY, '1')
}

export async function verifyPasscode(code: string): Promise<boolean> {
  const hash = await getMeta<string | null>(KEY_HASH, null)
  return !!hash && hash === (await sha256(`nimbus:${code}`))
}

export async function enableBiometrics(): Promise<boolean> {
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Nimbus Notes' },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: 'nimbus-local',
          displayName: 'Nimbus (this device)',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null
    if (!cred) return false
    await setMeta(KEY_CRED, cred.rawId)
    await setMeta(KEY_BIO, true)
    return true
  } catch {
    return false
  }
}

export async function disableBiometrics(): Promise<void> {
  await setMeta(KEY_BIO, false)
}

export async function authenticateBiometric(): Promise<boolean> {
  try {
    const credId = await getMeta<BufferSource | null>(KEY_CRED, null)
    await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        ...(credId ? { allowCredentials: [{ id: credId, type: 'public-key' }] } : {}),
        userVerification: 'required',
        timeout: 60000,
      },
    })
    return true
  } catch {
    return false
  }
}

export function isUnlocked(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === '1'
}

export function markUnlocked() {
  sessionStorage.setItem(SESSION_KEY, '1')
}

export function lockSession() {
  sessionStorage.removeItem(SESSION_KEY)
}
