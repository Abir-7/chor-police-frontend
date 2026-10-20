import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ServerStatusGate } from './components/ServerStatusGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Waits for the (free-tier) backend to wake up before showing the app */}
    <ServerStatusGate>
      <App />
    </ServerStatusGate>
  </StrictMode>,
)
