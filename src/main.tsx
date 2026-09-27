import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { startPWA } from './pwa'
import { App } from './App'
import { startSync } from './data/sync'
import { runMigrations } from './data/store'
import '@fontsource-variable/montserrat'
import './styles.css'

// service worker só no app de verdade (dentro de iframe o navegador bloqueia)
startPWA()
startSync()
runMigrations()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
