import { useEffect, useRef, useState } from 'react'
import { brl, dateLabel } from '../data/format'
import { guessShop, matchProduct, fetchNota, type Nota } from '../data/nfce'
import { ticketLeft } from '../data/logic'
import { activeTrip, applyNotaToTrip, compareNota, importNota, tripToCheck, useDB, type NotaDiff, type NotaLine } from '../data/store'
import type { Id } from '../data/types'
import { Sheet, embedded, toast } from './ui'

type Step = 'scan' | 'loading' | 'map' | 'diff'

/**
 * Lê o QR code da nota fiscal (NFC-e). O uso principal é em casa, depois da
 * feira: conferir a compra marcada no Modo Mercado com a nota (preços,
 * o que esqueceu de marcar, o que não veio). Também serve pra registrar uma
 * compra que não passou pelo app.
 */
export function NotaSheet({ tripId, onClose, onDone }: { tripId?: Id; onClose: () => void; onDone: () => void }) {
  const db = useDB()
  const [step, setStep] = useState<Step>('scan')
  const [error, setError] = useState<string | null>(null)
  const [nota, setNota] = useState<Nota | null>(null)
  const [lines, setLines] = useState<NotaLine[]>([])
  const [pasted, setPasted] = useState('')
  const [dest, setDest] = useState<Id | 'nova'>('nova')
  const [shopId, setShopId] = useState<Id>('')
  const [paid, setPaid] = useState('')
  const [diff, setDiff] = useState<NotaDiff | null>(null)
  const [remove, setRemove] = useState<Set<Id>>(new Set())

  // compras que dá pra conferir: a pedida, a em andamento e a finalizada há pouco
  const candidates = [tripId ? db.trips[tripId] : undefined, activeTrip(db), tripToCheck(db)].filter(
    (t, i, a): t is NonNullable<typeof t> => !!t && !t.deleted && a.findIndex((x) => x?.id === t.id) === i,
  )

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
      setDest(candidates[0]?.id ?? 'nova')
      setStep('map')
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

  const next = () => {
    if (dest === 'nova') {
      const when = nota?.date ? new Date(nota.date).getTime() || Date.now() : Date.now()
      const paidNum = Math.max(0, parseFloat(paid.replace(/\./g, '').replace(',', '.')) || 0)
      importNota(lines, { shopId, when, paidTicket: Math.min(paidNum, nota?.total ?? paidNum) })
      toast(`Compra salva: ${brl(nota?.total ?? 0)} 🧾`)
      onDone()
      return
    }
    setDiff(compareNota(dest, lines))
    setRemove(new Set())
    setStep('diff')
  }

  const apply = () => {
    if (dest === 'nova') return
    applyNotaToTrip(dest, lines, [...remove])
    toast('Compra conferida com a nota ✓')
    onDone()
  }

  const tripLabel = (id: Id) => {
    const t = db.trips[id]!
    const shop = db.shops[t.shopId]?.name ?? 'Mercado'
    return t.finishedAt == null ? `Compra em andamento (${shop})` : `Compra de ${dateLabel(t.finishedAt)} no ${shop}`
  }

  return (
    <Sheet onClose={onClose} full={step === 'map' || step === 'diff'}>
      {(step === 'scan' || step === 'loading') && (
        <div className="stack">
          <h2>Conferir com a nota fiscal</h2>
          <p className="small muted" style={{ margin: 0 }}>
            Aponte a câmera pro QR code no fim da nota. O app busca os itens e preços na Sefaz e compara com o que foi marcado no mercado.
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

      {step === 'map' && nota && (
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
            1 de 2 · Confira a qual item da despensa cada produto corresponde. O app lembra da escolha na próxima nota.
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
                  <option value="ignorar">Ignorar (sacola, etc.)</option>
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
            <label className="field">
              <span>O que fazer com essa nota</span>
              <select value={dest} onChange={(e) => setDest(e.target.value)}>
                {candidates.map((t) => (
                  <option key={t.id} value={t.id}>
                    Conferir: {tripLabel(t.id)}
                  </option>
                ))}
                <option value="nova">Registrar como compra nova</option>
              </select>
            </label>
            {dest === 'nova' && (
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
            <button className="btn primary block" onClick={next}>
              {dest === 'nova' ? 'Salvar compra' : 'Ver diferenças'}
            </button>
          </div>
        </>
      )}

      {step === 'diff' && diff && dest !== 'nova' && (
        <>
          <div className="row between">
            <div>
              <h2>Conferência</h2>
              <div className="small muted">2 de 2 · {tripLabel(dest)}</div>
            </div>
            <button className="btn sm" onClick={() => setStep('map')}>
              Voltar
            </button>
          </div>
          <div className="stack" style={{ overflowY: 'auto', flex: 1, gap: 12, paddingTop: 10 }}>
            <div className="grid2">
              <div className="card" style={{ padding: 12 }}>
                <div className="small muted">Marcado no app</div>
                <div className="stat num" style={{ fontSize: 22 }}>
                  {brl(diff.appTotal)}
                </div>
              </div>
              <div className="card" style={{ padding: 12 }}>
                <div className="small muted">Na nota</div>
                <div className="stat num" style={{ fontSize: 22 }}>
                  {brl(diff.notaTotal)}
                </div>
              </div>
            </div>

            {!diff.priceChanges.length && !diff.filled.length && !diff.added.length && !diff.notInNota.length && (
              <div className="card" style={{ background: 'var(--primary-soft)' }}>
                ✓ Tudo bate com a nota.
              </div>
            )}

            <DiffGroup title="Preço diferente" hint="Fica o da nota." show={diff.priceChanges.length > 0}>
              {diff.priceChanges.map((c) => (
                <div key={c.itemId} className="row between small" style={{ padding: '6px 0' }}>
                  <span style={{ fontWeight: 700 }}>{c.name}</span>
                  <span className="num">
                    <s className="muted">{brl(c.app)}</s> → <b>{brl(c.nota)}</b>
                  </span>
                </div>
              ))}
            </DiffGroup>

            <DiffGroup title="Estava sem preço" hint="Preenchido com a nota." show={diff.filled.length > 0}>
              {diff.filled.map((c) => (
                <div key={c.itemId} className="row between small" style={{ padding: '6px 0' }}>
                  <span style={{ fontWeight: 700 }}>{c.name}</span>
                  <b className="num">{brl(c.nota)}</b>
                </div>
              ))}
            </DiffGroup>

            <DiffGroup title="Esqueceu de marcar" hint="Veio na nota e entra na compra." show={diff.added.length > 0}>
              {diff.added.map((c) => (
                <div key={c.key} className="row between small" style={{ padding: '6px 0' }}>
                  <span style={{ fontWeight: 700 }}>{c.name}</span>
                  <b className="num">{brl(c.total)}</b>
                </div>
              ))}
            </DiffGroup>

            <DiffGroup title="Marcado, mas não está na nota" hint="Marque o que não veio: sai da compra e volta pra lista." show={diff.notInNota.length > 0}>
              {diff.notInNota.map((c) => (
                <label key={c.itemId} className="row small" style={{ padding: '6px 0', gap: 10, fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={remove.has(c.itemId)}
                    onChange={(e) =>
                      setRemove((s) => {
                        const n = new Set(s)
                        if (e.target.checked) n.add(c.itemId)
                        else n.delete(c.itemId)
                        return n
                      })
                    }
                    style={{ width: 20, height: 20 }}
                  />
                  <span className="grow">{c.name}</span>
                  <span className="muted" style={{ fontWeight: 500 }}>
                    {remove.has(c.itemId) ? 'não veio' : 'mantém'}
                  </span>
                </label>
              ))}
            </DiffGroup>
          </div>
          <button className="btn primary block" style={{ marginTop: 10 }} onClick={apply}>
            Corrigir a compra
          </button>
        </>
      )}
    </Sheet>
  )
}

function DiffGroup({ title, hint, show, children }: { title: string; hint: string; show: boolean; children: React.ReactNode }) {
  if (!show) return null
  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ fontWeight: 800 }}>{title}</div>
      <div className="small muted" style={{ marginBottom: 4 }}>
        {hint}
      </div>
      {children}
    </div>
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
