import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSetting, SETTINGS, setSetting } from '@/core/settings'
import { startReminderEngine, onReminderFired } from '@/core/reminders'
import type { ThemeMode } from '@/core/types'
import { ToastProvider, DialogsProvider } from '@/ui/Dialogs'
import { LockProvider } from '@/ui/Lock'
import { useToast } from '@/ui/Dialogs'
import { Home } from '@/screens/Home'
import { FolderView } from '@/screens/FolderView'
import { NoteEditor } from '@/screens/NoteEditor'
import { SaveTo } from '@/screens/SaveTo'
import { SearchScreen } from '@/screens/SearchScreen'
import { SettingsScreen } from '@/screens/Settings'
import { Study } from '@/screens/Study'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <DialogsProvider>
          <LockProvider>
            <ThemeManager />
            <ReminderBridge />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/folder/:id" element={<FolderView />} />
              <Route path="/note/:id" element={<NoteEditor />} />
              <Route path="/note/:id/study" element={<Study />} />
              <Route path="/save" element={<SaveTo />} />
              <Route path="/search" element={<SearchScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LockProvider>
        </DialogsProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

/* Theme: applies data-theme + keeps the OS status bar color in sync. */
function ThemeManager() {
  const theme = useLiveQuery(() => getSetting<ThemeMode>(SETTINGS.theme, 'system'), [], 'system' as ThemeMode)

  useEffect(() => {
    const apply = (mode: 'light' | 'dark') => {
      document.documentElement.dataset.theme = mode
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', mode === 'dark' ? '#0e1116' : '#f5f6f8')
    }
    const mode: 'light' | 'dark' =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme
    apply(mode)

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if ((theme ?? 'system') === 'system') apply(media.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  return null
}

/* Reminder engine: native notifications + in-app toast. */
function ReminderBridge() {
  const toast = useToast()
  useEffect(() => {
    startReminderEngine()
    return onReminderFired((note) => {
      toast.show(`Reminder: ${note.title || 'Note'}`, 'bell')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
