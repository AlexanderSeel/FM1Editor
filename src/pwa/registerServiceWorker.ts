export const PWA_UPDATE_READY_EVENT = 'fm1-pwa-update-ready'

export interface PwaUpdateReadyDetail {
  registration: ServiceWorkerRegistration
}

let reloadForUpdate = false

function announceWaitingWorker(registration: ServiceWorkerRegistration): void {
  window.dispatchEvent(new CustomEvent<PwaUpdateReadyDetail>(PWA_UPDATE_READY_EVENT, {
    detail: { registration },
  }))
}

function watchRegistration(registration: ServiceWorkerRegistration): void {
  if (registration.waiting) announceWaitingWorker(registration)

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing
    if (!worker) return

    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        announceWaitingWorker(registration)
      }
    })
  })
}

export function activateWaitingServiceWorker(registration: ServiceWorkerRegistration): void {
  if (!registration.waiting) return
  reloadForUpdate = true
  registration.waiting.postMessage({ type: 'SKIP_WAITING' })
}

export function registerServiceWorker(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloadForUpdate) return
    reloadForUpdate = false
    window.location.reload()
  })

  window.addEventListener('load', () => {
    const serviceWorkerUrl = `${import.meta.env.BASE_URL}sw.js`
    void navigator.serviceWorker.register(serviceWorkerUrl, {
      scope: import.meta.env.BASE_URL,
    }).then((registration) => {
      watchRegistration(registration)
      window.setInterval(() => void registration.update(), 60 * 60 * 1000)
    }).catch((cause: unknown) => {
      console.error('FM1 Editor service-worker registration failed.', cause)
    })
  }, { once: true })
}
