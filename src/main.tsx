import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './algorithmGraph.css'
import { PwaStatus } from './components/PwaStatus'
import './index.css'
import './flatHardware.css'
import './sidebarViewport.css'
import { registerServiceWorker } from './pwa/registerServiceWorker'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Application root element was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
    <PwaStatus />
  </StrictMode>,
)

registerServiceWorker()
