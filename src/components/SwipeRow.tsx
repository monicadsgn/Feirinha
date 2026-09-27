import { useRef, useState, type ReactNode } from 'react'

/** Linha que aceita arrastar: → pega, ← não tinha. Toque simples abre o preço. */
export function SwipeRow({
  children,
  onTap,
  onRight,
  onLeft,
  className = '',
}: {
  children: ReactNode
  onTap: () => void
  onRight: () => void
  onLeft: () => void
  className?: string
}) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const horizontal = useRef(false)
  const [dx, setDx] = useState(0)

  const reset = () => {
    start.current = null
    horizontal.current = false
    setDx(0)
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="swipe-bg" style={{ background: dx > 0 ? 'var(--primary)' : dx < 0 ? 'var(--muted)' : 'transparent' }}>
        <span>{dx > 0 ? '✓ Pegar' : ''}</span>
        <span>{dx < 0 ? 'Não tinha ✕' : ''}</span>
      </div>
      <div
        className={'li swipe-fg ' + className + (start.current ? ' dragging' : '')}
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
          horizontal.current = false
        }}
        onPointerMove={(e) => {
          const s = start.current
          if (!s) return
          const mx = e.clientX - s.x
          const my = e.clientY - s.y
          if (!horizontal.current) {
            if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) {
              start.current = null
              return
            }
            if (Math.abs(mx) > 12) {
              horizontal.current = true
              ;(e.currentTarget as HTMLElement).setPointerCapture(s.id)
            }
          }
          if (horizontal.current) setDx(Math.max(-140, Math.min(140, mx)))
        }}
        onPointerUp={() => {
          if (!start.current) return reset()
          if (horizontal.current) {
            if (dx > 80) onRight()
            else if (dx < -80) onLeft()
          } else onTap()
          reset()
        }}
        onPointerCancel={reset}
      >
        {children}
      </div>
    </div>
  )
}
