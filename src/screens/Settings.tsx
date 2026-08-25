import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db'
import * as repo from '@/core/repo'
import * as lock from '@/core/lock'
import { getSyncStatus } from '@/core/sync'
import { useSetting, SETTINGS, setSetting } from '@/core/settings'
import { useStorageUsage, downloadBlob } from '@/core/fileStore'
import { ensureNotificationPermission } from '@/core/reminders'
import type { Note, SyncStatus, ThemeMode } from '@/core/types'
import { formatBytes, formatDate, cn } from '@/core/utils'
import { Icon } from '@/ui/Icon'
import { TopBar } from '@/ui/TopBar'
import { Sheet } from '@/ui/Sheet'
import { ActionRow, Switch } from '@/ui/sheets'
import { useDialogs, useToast } from '@/ui/Dialogs'
import { useLock } from '@/ui/Lock'
import { NoteCard } from '@/ui/cards'

export function SettingsScreen() {
  const navigate = useNavigate()
  const dialogs = useDialogs()
  const toast = useToast()
  const [params] = useSearchParams()
  const { configured, refresh, lockNow } = useLock()

  const theme = useSetting<ThemeMode>(SETTINGS.theme, 'system')
  const [bioEnabled, setBioEnabled] = useState(false)
  const [bioAvailable, setBioAvailable] = useState(false)
  const [notifState, setNotifState] = useState<NotificationPermission | 'unsupported'>('default')
  const [sync, setSync] = useState<SyncStatus | null>(null)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const usage = useStorageUsage()

  useEffect(() => {
    void lock.isBiometricEnabled().then(setBioEnabled)
    void lock.biometricsAvailable().then(setBioAvailable)
    setNotifState('Notification' in window ? Notification.permission : 'unsupported')
    void getSyncStatus().then(setSync)
  }, [configured])

  useEffect(() => {
    if (params.get('section') === 'privacy') {
      document.getElementById('section-privacy')?.scrollIntoView({ behavior: 'smooth' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setupPasscode = async () => {
    const code = await dialogs.prompt({
      title: 'Choose a 4–6 digit passcode',
      placeholder: '••••••',
      confirmLabel: 'Continue',
    })
    if (!code) return
    if (!/^\d{4,6}$/.test(code)) {
      toast.show('Use 4 to 6 digits', 'alert')
      return
    }
    await lock.setPasscode(code)
    await refresh()
    toast.show('App Lock is on', 'lock')
  }

  const changePasscode = async () => {
    const current = await dialogs.prompt({ title: 'Enter current passcode', confirmLabel: 'Continue' })
    if (!current) return
    if (!(await lock.verifyPasscode(current))) {
      toast.show('Wrong passcode', 'alert')
      return
    }
    const next = await dialogs.prompt({ title: 'New 4–6 digit passcode', confirmLabel: 'Save' })
    if (!next) return
    if (!/^\d{4,6}$/.test(next)) {
      toast.show('Use 4 to 6 digits', 'alert')
      return
    }
    await lock.setPasscode(next)
    toast.show('Passcode updated', 'check')
  }

  const toggleBiometrics = async (on: boolean) => {
    if (on) {
      const ok = await lock.enableBiometrics()
      if (ok) {
        setBioEnabled(true)
        toast.show('Biometric unlock enabled', 'scan-face')
      } else {
        toast.show('Could not enable biometrics on this device', 'alert')
      }
    } else {
      await lock.disableBiometrics()
      setBioEnabled(false)
      toast.show('Biometric unlock disabled')
    }
  }

  const exportBackup = async () => {
    toast.show('Packing backup…')
    const [folders, notes, files] = await Promise.all([
      db.folders.toArray(),
      db.notes.toArray(),
      db.files.toArray(),
    ])
    const fileEntries = await Promise.all(
      files.map(async (f) => ({
        id: f.id,
        name: f.name,
        mime: f.mime,
        size: f.size,
        createdAt: f.createdAt,
        data: await blobToBase64(f.blob),
      }))
    )
    const backup = {
      app: 'nimbus-notes',
      version: 1,
      exportedAt: Date.now(),
      folders,
      notes,
      files: fileEntries,
    }
    downloadBlob(
      new Blob([JSON.stringify(backup)], { type: 'application/json' }),
      `nimbus-backup-${new Date().toISOString().slice(0, 10)}.json`
    )
    toast.show('Backup downloaded', 'download')
  }

  const importBackup = async (file: File) => {
    try {
      const data = JSON.parse(await file.text())
      if (data.app !== 'nimbus-notes') throw new Error('bad file')
      await db.transaction('rw', db.folders, db.notes, db.files, async () => {
        for (const f of data.folders) await db.folders.put(f)
        for (const n of data.notes) await db.notes.put(n)
        for (const f of data.files) {
          const blob = await base64ToBlob(f.data, f.mime)
          await db.files.put({ ...f, blob })
        }
      })
      toast.show('Backup restored', 'check-circle')
    } catch {
      toast.show('Could not read that backup file', 'alert')
    }
  }

  const requestNotifications = async () => {
    const ok = await ensureNotificationPermission()
    setNotifState('Notification' in window ? Notification.permission : 'unsupported')
    await setSetting(SETTINGS.remindersEnabled, ok)
    toast.show(ok ? 'Reminders will notify you' : 'Notifications are blocked in browser settings', ok ? 'bell' : 'alert')
  }

  return (
    <div className="screen settings-screen">
      <TopBar back title="Settings" />

      <SettingsSection title="Appearance">
        <div className="segmented">
          {(['system', 'light', 'dark'] as ThemeMode[]).map((t) => (
            <button
              key={t}
              className={cn('segment', theme === t && 'segment-active')}
              onClick={() => void setSetting(SETTINGS.theme, t)}
            >
              <Icon name={t === 'system' ? 'settings' : t === 'light' ? 'sun' : 'moon'} size={15} />
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Privacy & Security" id="section-privacy">
        {!configured ? (
          <ActionRow icon="lock" label="Turn on App Lock" sub="Protect notes and folders" onClick={setupPasscode} />
        ) : (
          <>
            <ActionRow icon="key" label="Change passcode" onClick={changePasscode} />
            <ActionRow
              icon="scan-face"
              label="Biometric unlock"
              sub={bioAvailable ? 'Face ID, Touch ID or device biometrics' : 'Not available on this device'}
              trailing={
                <Switch
                  on={bioEnabled && bioAvailable}
                  onChange={(v) => void toggleBiometrics(v)}
                />
              }
            />
            <ActionRow
              icon="lock"
              label="Lock now"
              onClick={() => {
                lockNow()
                toast.show('Locked', 'lock')
                navigate('/')
              }}
            />
          </>
        )}
        <ActionRow
          icon="bell"
          label="Reminder notifications"
          sub={
            notifState === 'granted'
              ? 'Allowed'
              : notifState === 'denied'
                ? 'Blocked in browser settings'
                : notifState === 'unsupported'
                  ? 'Not supported here'
                  : 'Tap to allow'
          }
          onClick={requestNotifications}
        />
      </SettingsSection>

      <SettingsSection title="Sync">
        <div className="sync-card">
          <span className="sync-icon">
            <Icon name={sync?.provider === 'drive' ? 'cloud' : 'cloudOff'} size={19} />
          </span>
          <div className="sync-text">
            <b>{sync?.provider === 'drive' ? 'Google Drive' : 'This device only'}</b>
            <span>
              {sync?.message ?? 'All notes, folders and files live locally and work offline.'}
            </span>
            {sync?.lastSyncAt && <span>Last sync {formatDate(sync.lastSyncAt)}</span>}
          </div>
        </div>
        <p className="settings-note">
          The sync layer is isolated — Google Drive backup and cross-device sync arrive without
          changing how notes are stored or edited.
        </p>
      </SettingsSection>

      <SettingsSection title="Storage">
        <ActionRow
          icon="file"
          label="Files stored"
          sub={`${usage.files} files · ${formatBytes(usage.bytes)} on this device`}
        />
        <ActionRow icon="download" label="Export backup" sub="Everything, as one JSON file" onClick={exportBackup} />
        <ActionRow
          icon="upload"
          label="Import backup"
          sub="Restore from a Nimbus backup file"
          onClick={() => {
            const input = document.getElementById('backup-input') as HTMLInputElement | null
            input?.click()
          }}
        />
        <input
          id="backup-input"
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void importBackup(f)
            e.target.value = ''
          }}
        />
      </SettingsSection>

      <SettingsSection title="Library">
        <ArchivedRow onOpen={() => setArchivedOpen(true)} />
      </SettingsSection>

      <SettingsSection title="About">
        <ActionRow icon="info" label="Nimbus" sub="Version 0.1.0 · local-first prototype" />
        <p className="settings-note">
          Anything you can share from your phone, you can save here — instantly, privately,
          and offline.
        </p>
      </SettingsSection>

      <ArchivedSheet open={archivedOpen} onClose={() => setArchivedOpen(false)} />
    </div>
  )
}

function SettingsSection({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section className="settings-section" id={id}>
      <h3 className="settings-heading">{title}</h3>
      <div className="settings-card">{children}</div>
    </section>
  )
}

function ArchivedRow({ onOpen }: { onOpen: () => void }) {
  const count = useLiveQuery(() => db.notes.filter((n) => n.archived).count(), [], 0)
  return <ActionRow icon="archive" label="Archived notes" sub={`${count ?? 0} archived`} onClick={onOpen} />
}

function ArchivedSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogs = useDialogs()
  const toast = useToast()
  const archived = useLiveQuery(() => db.notes.filter((n) => n.archived).toArray(), [], [] as Note[])

  return (
    <Sheet open={open} onClose={onClose} title="Archived notes">
      {archived.length === 0 ? (
        <p className="settings-note">Nothing archived.</p>
      ) : (
        <div className="note-list">
          {archived.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onOpen={async () => {
                await repo.updateNote(n.id, { archived: false })
                toast.show('Restored', 'archive')
              }}
            />
          ))}
          <p className="settings-note">Tap a note to restore it.</p>
        </div>
      )}
    </Sheet>
  )
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

async function base64ToBlob(data: string, mime: string): Promise<Blob> {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}
