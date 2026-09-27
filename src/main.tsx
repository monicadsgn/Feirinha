import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import '@fontsource-variable/montserrat'
import './styles.css'

// service worker só no app de verdade (dentro de iframe o navegador bloqueia)
if (window.self === window.top) registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
