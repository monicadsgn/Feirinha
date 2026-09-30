import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

/**
 * Atualização do app instalado. A versão nova baixa sozinha e:
 * - entra quando a pessoa volta pro app depois de 5+ min fora (como se abrisse
 *   de novo), desde que não tenha compra aberta, ou
 * - na hora, se a pessoa tocar em "Atualizar" no aviso.
 * Nunca recarrega com o app no fundo: no iPhone isso deixava a tela preta
 * (ex.: sair pra câmera ou pro Uber no meio da feira).
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
  let hiddenAt = 0
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now()
    else if (waiting && hiddenAt && Date.now() - hiddenAt > 5 * 60_000 && !busy()) void update(true)
  })
}

/** Compra em andamento: não troca de versão no meio do mercado. */
function busy(): boolean {
  try {
    const d = JSON.parse(localStorage.getItem('feirinha:v1') ?? '{}') as { trips?: Record<string, { finishedAt?: number | null; deleted?: boolean }> }
    return Object.values(d.trips ?? {}).some((t) => !t.deleted && t.finishedAt == null)
  } catch {
    return true
  }
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
