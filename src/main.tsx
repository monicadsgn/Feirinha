import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { startSync } from './data/sync'
import { runMigrations } from './data/store'
import '@fontsource-variable/montserrat'
import './styles.css'

// service worker só no app de verdade (dentro de iframe o navegador bloqueia)
// A versão nova fica esperando e só entra quando o app vai pro fundo (ou na
// próxima abertura), pra nunca recarregar no meio de um cadastro ou compra.
if (window.self === window.top) {
  let waiting = false
  const update = registerSW({
    immediate: true,
    onNeedRefresh() {
      waiting = true
    },
  })
  document.addEventListener('visibilitychange', () => {
    if (waiting && document.visibilityState === 'hidden') void update(true)
  })
}

startSync()
runMigrations()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
