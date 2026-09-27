import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

/**
 * Atualização do app instalado. A versão nova baixa sozinha e:
 * - entra quando o app vai pro fundo (nunca no meio do uso), ou
 * - na hora, se a pessoa tocar em "Atualizar" no aviso.
 * O app procura versão nova ao abrir, ao voltar pra frente e a cada 30 min.
 */

let waiting = false
const subs = new Set<() => void>()
let update: (reload?: boolean) => Promise<void> = async () => {}

export function startPWA() {
  // dentro de iframe (link de teste do Claude) o navegador bloqueia service worker
  if (window.self !== window.top) return
  update = registerSW({
    immediate: true,
    onNeedRefresh() {
      waiting = true
      subs.forEach((s) => s())
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return
      const check = () => void reg.update().catch(() => {})
      setInterval(check, 30 * 60_000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })
  document.addEventListener('visibilitychange', () => {
    if (waiting && document.visibilityState === 'hidden') void update(true)
  })
}

export function applyUpdate() {
  void update(true)
}

export function useUpdateReady(): boolean {
  return useSyncExternalStore(
    (s) => {
      subs.add(s)
      return () => subs.delete(s)
    },
    () => waiting,
  )
}

/** Data do build, pra saber qual versão está no celular. */
export const BUILD = new Date(__BUILD_TIME__).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
