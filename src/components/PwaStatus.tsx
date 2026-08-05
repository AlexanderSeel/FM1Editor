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
      className="fm1-toast fixed bottom-4 right-4 z-50 max-w-sm p-4 text-sm"
      role="status"
    >
      {registration ? (
        <>
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_8px_rgba(115,216,255,0.8)]" />
            <p className="fm1-hardware-label text-[10px] text-white">System update</p>
          </div>
          <p className="mt-2 leading-5 text-slate-400">Reload when it is safe to replace the cached application version.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-cyan-300/40 bg-cyan-300 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-slate-950"
              onClick={() => activateWaitingServiceWorker(registration)}
              type="button"
            >
              Reload update
            </button>
            <button
              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-300"
              onClick={() => setRegistration(null)}
              type="button"
            >
              Later
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(244,201,102,0.7)]" />
            <p className="fm1-hardware-label text-[10px] text-amber-200">Offline mode</p>
          </div>
          <p className="mt-2 leading-5 text-slate-400">The cached application shell remains available. MIDI and local library functions continue; remote catalog downloads require a connection.</p>
        </>
      )}
    </div>
  )
}
