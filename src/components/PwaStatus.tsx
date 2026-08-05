import { useEffect, useState } from 'react'
import {
  activateWaitingServiceWorker,
  PWA_UPDATE_READY_EVENT,
  type PwaUpdateReadyDetail,
} from '../pwa/registerServiceWorker'

export function PwaStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<PwaUpdateReadyDetail>
      setRegistration(customEvent.detail.registration)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener(PWA_UPDATE_READY_EVENT, handleUpdate)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener(PWA_UPDATE_READY_EVENT, handleUpdate)
    }
  }, [])

  if (online && !registration) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border border-white/15 bg-slate-950/95 p-4 text-sm shadow-2xl shadow-black/50 backdrop-blur"
      role="status"
    >
      {registration ? (
        <>
          <p className="font-semibold text-white">FM1 Editor update available</p>
          <p className="mt-1 leading-5 text-slate-400">Reload when it is safe to replace the cached application version.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-200"
              onClick={() => activateWaitingServiceWorker(registration)}
              type="button"
            >
              Reload update
            </button>
            <button
              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/8"
              onClick={() => setRegistration(null)}
              type="button"
            >
              Later
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="font-semibold text-amber-200">Offline mode</p>
          <p className="mt-1 leading-5 text-slate-400">The cached application shell remains available. MIDI and local library functions continue; remote catalog downloads require a connection.</p>
        </>
      )}
    </div>
  )
}
