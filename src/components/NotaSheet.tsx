import { useEffect, useRef, useState } from 'react'
import { brl } from '../data/format'
import { guessShop, matchProduct, fetchNota, type Nota } from '../data/nfce'
import { ticketLeft } from '../data/logic'
import { importNota, useDB, type NotaLine } from '../data/store'
import type { Id } from '../data/types'
import { Sheet, embedded, toast } from './ui'

type Step = 'scan' | 'loading' | 'review'

/**
 * Lê o QR code da nota fiscal (NFC-e) e transforma numa compra:
 * preços reais, sem digitar. Se tiver uma compra em andamento no Modo
 * Mercado, preenche os preços dela.
 */
export function NotaSheet({ tripId, onClose, onDone }: { tripId?: Id; onClose: () => void; onDone: () => void }) {
  const db = useDB()
  const [step, setStep] = useState<Step>('scan')
  const [error, setError] = useState<string | null>(null)
  const [nota, setNota] = useState<Nota | null>(null)
  const [lines, setLines] = useState<NotaLine[]>([])
  const [pasted, setPasted] = useState('')
  const [shopId, setShopId] = useState<Id>('')
  const [paid, setPaid] = useState('')

  const load = async (text: string) => {
    setStep('loading')
    setError(null)
    try {
      const n = await fetchNota(text)
      setNota(n)
      setLines(
        n.items.map((i) => {
          const m = matchProduct(db, i.name)
          return { productName: i.name, target: m?.id ?? 'novo', qty: i.qty, notaUnit: i.unit, total: i.total }
        }),
      )
      setShopId(guessShop(db, n.store) ?? Object.values(db.shops).find((s) => !s.deleted)?.id ?? '')
      const left = db.settings.ticketMonthly > 0 ? ticketLeft(db) : 0
      setPaid(Math.min(n.total, left).toFixed(2).replace('.', ','))
      setStep('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não consegui abrir essa nota.')
      setStep('scan')
    }
  }

  const items = Object.values(db.items)
    .filter((i) => !i.deleted)
    .sort((a, b) => a.name.localeCompare(b.name))
  const shops = Object.values(db.shops).filter((s) => !s.deleted)
  const matched = lines.filter((l) => l.target !== 'novo' && l.target !== 'ignorar').length

  const save = () => {
    const when = nota?.date ? new Date(nota.date).getTime() || Date.now() : Date.now()
    const paidNum = Math.max(0, parseFloat(paid.replace(/\./g, '').replace(',', '.')) || 0)
    importNota(lines, tripId ? { tripId } : { shopId, when, paidTicket: Math.min(paidNum, nota?.total ?? paidNum) })
    toast(tripId ? 'Preços da nota preenchidos ✓' : `Compra salva: ${brl(nota?.total ?? 0)} 🧾`)
    onDone()
  }

  return (
    <Sheet onClose={onClose} full={step === 'review'}>
      {step !== 'review' && (
        <div className="stack">
          <h2>Ler nota fiscal</h2>
          <p className="small muted" style={{ margin: 0 }}>
            Aponte a câmera pro QR code no fim da nota. Os itens e preços vêm do site da Sefaz, sem digitar.
          </p>
          {step === 'loading' ? (
            <div className="empty">
              <div className="big">🧾</div>
              Buscando a nota na Sefaz…
            </div>
          ) : (
            <>
              {!embedded && <Scanner onCode={load} />}
              {error && (
                <div className="badge yellow" style={{ padding: 10, borderRadius: 12 }}>
                  {error}
                </div>
              )}
              <label className="field">
                <span>Ou cole o link do QR code</span>
                <div className="row">
                  <input id="nota-link" inputMode="url" placeholder="https://…sefaz…" value={pasted} onChange={(e) => setPasted(e.target.value)} />
                  <button className="btn primary" disabled={!pasted.trim()} onClick={() => void load(pasted)}>
                    Abrir
                  </button>
                </div>
              </label>
              <p className="small muted" style={{ margin: 0 }}>
                No iPhone, a câmera normal também lê o QR: segure o link que aparecer, copie e cole aqui.
              </p>
            </>
          )}
        </div>
      )}

      {step === 'review' && nota && (
        <>
          <div className="row between">
            <div>
              <h2>{nota.store || 'Nota fiscal'}</h2>
              <div className="small muted">
                {nota.items.length} produtos · {matched} reconhecidos · <b className="num">{brl(nota.total)}</b>
              </div>
            </div>
            <button className="btn sm" onClick={onClose}>
              Cancelar
            </button>
          </div>
          <p className="small muted" style={{ margin: '8px 0' }}>
            Confira a qual item da despensa cada produto corresponde. O app lembra da escolha na próxima nota.
          </p>
          <div className="list" style={{ overflowY: 'auto', flex: 1 }}>
            {lines.map((l, i) => (
              <div className="li" key={i} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div className="row between">
                  <span className="small" style={{ fontWeight: 700 }}>
                    {l.productName}
                  </span>
                  <span className="small num muted" style={{ whiteSpace: 'nowrap' }}>
                    {String(l.qty).replace('.', ',')} {l.notaUnit} · {brl(l.total)}
                  </span>
                </div>
                <select
                  value={l.target}
                  onChange={(e) => setLines((x) => x.map((y, j) => (j === i ? { ...y, target: e.target.value } : y)))}
                  style={{ padding: '8px 10px', borderColor: l.target === 'novo' ? 'var(--warn)' : undefined }}
                >
                  <option value="novo">+ Item novo na despensa</option>
                  <option value="ignorar">Ignorar (não entra na compra)</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="stack" style={{ paddingTop: 10, gap: 8 }}>
            {!tripId && (
              <div className="grid2">
                <label className="field">
                  <span>Onde</span>
                  <select value={shopId} onChange={(e) => setShopId(e.target.value)}>
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.emoji} {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                {db.settings.ticketMonthly > 0 && (
                  <label className="field">
                    <span>Pago no ticket</span>
                    <input inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} />
                  </label>
                )}
              </div>
            )}
            <button className="btn primary block" onClick={save}>
              {tripId ? 'Preencher os preços da compra' : 'Salvar compra'}
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}

/** Câmera + leitura do QR. Usa o leitor do próprio navegador quando existe, senão o jsQR. */
function Scanner({ onCode }: { onCode: (text: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'starting' | 'on' | 'denied'>('starting')
  const cb = useRef(onCode)
  cb.current = onCode

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let stopped = false
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (stopped) return stream.getTracks().forEach((t) => t.stop())
        const v = video.current!
        v.srcObject = stream
        await v.play()
        setStatus('on')
        const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector
        const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null
        const jsQR = detector ? null : (await import('jsqr')).default
        const tick = async () => {
          if (stopped) return
          if (v.readyState >= 2) {
            let found: string | null = null
            if (detector) {
              const r = await detector.detect(v).catch(() => [])
              found = r[0]?.rawValue ?? null
            } else if (jsQR && ctx) {
              const w = (canvas.width = Math.min(v.videoWidth, 800))
              const h = (canvas.height = Math.round((v.videoHeight / v.videoWidth) * w))
              ctx.drawImage(v, 0, 0, w, h)
              found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h)?.data ?? null
            }
            if (found && /https?:\/\//.test(found)) {
              stopped = true
              stream?.getTracks().forEach((t) => t.stop())
              cb.current(found)
              return
            }
          }
          raf = requestAnimationFrame(() => void tick())
        }
        void tick()
      } catch {
        setStatus('denied')
      }
    }
    void start()
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  if (status === 'denied')
    return (
      <div className="badge yellow" style={{ padding: 10, borderRadius: 12 }}>
        Não consegui abrir a câmera. Libere a câmera pro Feirinha nas configurações do navegador, ou cole o link abaixo.
      </div>
    )
  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '1', maxHeight: '50dvh' }}>
      <video ref={video} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: '18%', border: '3px solid #fff', borderRadius: 18, boxShadow: '0 0 0 999px rgb(0 0 0 / 0.35)' }} />
      {status === 'starting' && (
        <div className="center small" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff' }}>
          Abrindo a câmera…
        </div>
      )}
    </div>
  )
}
