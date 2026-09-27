import { useEffect, useMemo, useState } from 'react'
import { Sheet, Stepper, confirmAction, toast } from '../components/ui'
import { SEED_ITEMS } from '../data/catalog'
import { brl, qtyLabel } from '../data/format'
import { mealsPerUnit, proteinPlan, recipeStatus } from '../data/logic'
import { readImages } from '../data/ocr'
import { MEAL_LABEL, RECIPES, type BuiltinRecipe } from '../data/recipes'
import { addToList, deleteRecipe, ensureSeedItem, matchIngredients, saveRecipe, updateItem, updateSettings, useDB } from '../data/store'
import type { DB, Id, Meal, SavedRecipe } from '../data/types'

type Filter = 'tudo' | Meal | 'salvas'

const nameOf = (db: DB, id: Id) => db.items[id]?.name ?? SEED_ITEMS.find((s) => s.key === id)?.name ?? id

/** "Filé de peito ou Sobrecoxa": só as opções que a casa tem cadastradas. */
const proteinNames = (db: DB, ids: Id[]) => {
  const own = ids.filter((p) => db.items[p] && !db.items[p]!.deleted)
  return (own.length ? own : ids.slice(0, 1)).map((p) => nameOf(db, p)).join(' ou ')
}

function addMissing(db: DB, ids: Id[]) {
  let n = 0
  for (const id of ids) {
    const real = db.items[id] && !db.items[id]!.deleted ? id : ensureSeedItem(id)
    if (real) {
      addToList(real, undefined, 'manual')
      n++
    }
  }
  toast(n ? `${n} ${n === 1 ? 'item foi' : 'itens foram'} pra lista` : 'Nada pra adicionar')
}

export function Receitas({ share, onShareHandled }: { share?: { title?: string; text?: string; url?: string } | null; onShareHandled?: () => void }) {
  const db = useDB()
  const [filter, setFilter] = useState<Filter>('tudo')
  const [onlyReady, setOnlyReady] = useState(false)
  const [open, setOpen] = useState<BuiltinRecipe | null>(null)
  const [openSaved, setOpenSaved] = useState<SavedRecipe | null>(null)
  const [adding, setAdding] = useState<Partial<SavedRecipe> | null>(() => (share ? fromShare(share) : null))
  const [yieldOf, setYieldOf] = useState<Id | null>(null)

  const plan = proteinPlan(db)
  const saved = Object.values(db.recipes).filter((r) => !r.deleted)

  const builtins = useMemo(() => {
    return RECIPES.map((r) => ({ r, st: recipeStatus(db, r.uses, r.protein) }))
      .filter(({ r }) => filter === 'tudo' || (filter !== 'salvas' && r.meals.includes(filter)))
      .filter(({ st }) => !onlyReady || (st.proteinOk && !st.missing.length && !st.unknown.length))
      .sort((a, b) => score(b.st) - score(a.st))
  }, [db, filter, onlyReady])

  const pct = plan.target ? Math.min(100, (plan.meals / plan.target) * 100) : 0

  return (
    <>
      <div className="page-head">
        <div>
          <div className="muted small">Pra variar e fazer a carne durar</div>
          <h1>Receitas</h1>
        </div>
        <button className="btn sm primary" onClick={() => setAdding({ meals: [] })}>
          + Salvar receita
        </button>
      </div>

      {/* Carnes do mês */}
      <div className="card">
        <div className="row between">
          <h3>Carnes até a próxima feira</h3>
          <span className="small muted num">
            {Math.round(plan.meals)} de ~{plan.target} refeições
          </span>
        </div>
        <div className={'meter ' + (pct < 60 ? 'red' : pct < 90 ? 'warn' : '')} style={{ height: 10 }}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <p className="small muted" style={{ margin: '8px 0 0' }}>
          Conta o que tem em casa + o que está na lista. Sem balança: cada 1 kg começa valendo 4 refeições do casal (250 g cada). Toque numa
          carne pra ajustar quanto ela rende de verdade.
        </p>
        <div style={{ marginTop: 10 }}>
          {plan.rows
            .filter((r) => r.home + r.toBuy > 0)
            .map((r) => (
              <button key={r.item.id} className="row between" style={{ width: '100%', padding: '8px 0', borderTop: '1px solid var(--line)', textAlign: 'left' }} onClick={() => setYieldOf(r.item.id)}>
                <span className="grow">
                  <span style={{ fontWeight: 700 }}>{r.item.name}</span>
                  <span className="small muted" style={{ display: 'block' }}>
                    {r.home > 0 ? `~${qtyLabel(+r.home.toFixed(1), r.item.unit)} em casa` : ''}
                    {r.home > 0 && r.toBuy > 0 ? ' + ' : ''}
                    {r.toBuy > 0 ? `${qtyLabel(r.toBuy, r.item.unit)} na lista` : ''}
                    {r.perMeal != null ? ` · ${brl(r.perMeal)}/refeição` : ''}
                  </span>
                </span>
                <b className="num">{Math.round(r.meals)} ref.</b>
              </button>
            ))}
          {!plan.rows.some((r) => r.home + r.toBuy > 0) && <div className="small muted">Nenhuma carne em casa ou na lista agora.</div>}
        </div>
        <div className="row between" style={{ marginTop: 10 }}>
          <span className="small" style={{ fontWeight: 700 }}>
            Refeições com carne por semana
          </span>
          <Stepper value={db.settings.mealsPerWeek ?? 10} unit="un" min={1} onChange={(v) => updateSettings({ mealsPerWeek: Math.round(v) })} />
        </div>
      </div>

      <div className="section">
        <div className="chips">
          {(
            [
              ['tudo', 'Tudo'],
              ['cafe', 'Café da manhã'],
              ['almoco', 'Almoço'],
              ['jantar', 'Jantar'],
              ['salvas', `Salvas (${saved.length})`],
            ] as [Filter, string][]
          ).map(([k, l]) => (
            <button key={k} className={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>
              {l}
            </button>
          ))}
        </div>
        {filter !== 'salvas' && (
          <label className="row small" style={{ gap: 8, margin: '6px 4px 10px', fontWeight: 700 }}>
            <input type="checkbox" checked={onlyReady} onChange={(e) => setOnlyReady(e.target.checked)} style={{ width: 20, height: 20 }} />
            Só o que dá pra fazer com o que tem
          </label>
        )}
      </div>

      {filter !== 'salvas' ? (
        <div className="stack" style={{ gap: 10 }}>
          {builtins.map(({ r, st }) => (
            <RecipeCard key={r.id} db={db} r={r} st={st} onOpen={() => setOpen(r)} />
          ))}
          {!builtins.length && <div className="empty">Nada com esse filtro. Tire o “só o que dá pra fazer” pra ver o que falta comprar.</div>}
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {saved.map((r) => {
            const st = recipeStatus(db, r.uses)
            return (
              <button key={r.id} className="card" style={{ textAlign: 'left' }} onClick={() => setOpenSaved(r)}>
                <div style={{ fontWeight: 800 }}>{r.name}</div>
                <div className="small muted">
                  {r.meals.map((m) => MEAL_LABEL[m]).join(' · ') || 'Receita salva'}
                  {r.addedBy ? ` · por ${r.addedBy}` : ''}
                </div>
                {r.uses.length > 0 && <Status db={db} missing={st.missing} proteinOk />}
              </button>
            )
          })}
          {!saved.length && (
            <div className="empty">
              <div className="big">📌</div>
              <p>Viu uma receita no Instagram ou TikTok? Salve aqui.</p>
              <p className="small">
                No Android, use “Compartilhar → Feirinha” direto do post (com o app instalado). No iPhone, copie o link e a legenda e cole em “+
                Salvar receita”.
              </p>
            </div>
          )}
        </div>
      )}

      {open && <RecipeSheet db={db} r={open} onClose={() => setOpen(null)} />}
      {openSaved && (
        <SavedSheet
          db={db}
          r={openSaved}
          onEdit={() => {
            setAdding(openSaved)
            setOpenSaved(null)
          }}
          onClose={() => setOpenSaved(null)}
        />
      )}
      {adding && (
        <SaveSheet
          initial={adding}
          onClose={() => {
            setAdding(null)
            onShareHandled?.()
          }}
          onSaved={() => {
            setAdding(null)
            setFilter('salvas')
            onShareHandled?.()
          }}
        />
      )}
      {yieldOf && db.items[yieldOf] && <YieldSheet db={db} id={yieldOf} onClose={() => setYieldOf(null)} />}
    </>
  )
}

function score(st: ReturnType<typeof recipeStatus>) {
  return (st.proteinOk ? 10 : 0) - st.missing.length * 2 - st.unknown.length * 3
}

function Status({ db, missing, proteinOk, protein }: { db: DB; missing: Id[]; proteinOk: boolean; protein?: Id[] }) {
  if (proteinOk && !missing.length) return <span className="badge green" style={{ marginTop: 6 }}>✓ tem tudo</span>
  const parts = [...(!proteinOk && protein ? [proteinNames(db, protein)] : []), ...missing.map((m) => nameOf(db, m))]
  return (
    <div className="small" style={{ marginTop: 6, color: 'var(--warn)', fontWeight: 700 }}>
      Falta: {parts.join(', ')}
    </div>
  )
}

function RecipeCard({ db, r, st, onOpen }: { db: DB; r: BuiltinRecipe; st: ReturnType<typeof recipeStatus>; onOpen: () => void }) {
  return (
    <button className="card" style={{ textAlign: 'left' }} onClick={onOpen}>
      <div style={{ fontWeight: 800 }}>{r.name}</div>
      <div className="small muted">
        ⏱ {r.minutes} min · rende {r.serves} {r.serves === 1 ? 'refeição' : 'refeições'}
        {r.grams ? ` · usa ${r.grams >= 1000 ? `${r.grams / 1000} kg` : `${r.grams} g`} de carne` : ''}
      </div>
      <Status db={db} missing={[...st.missing, ...st.unknown]} proteinOk={st.proteinOk} protein={r.protein} />
    </button>
  )
}

function RecipeSheet({ db, r, onClose }: { db: DB; r: BuiltinRecipe; onClose: () => void }) {
  const st = recipeStatus(db, r.uses, r.protein)
  const missing = [...st.missing, ...st.unknown, ...(!st.proteinOk && r.protein ? [r.protein[0]!] : [])]
  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <h2>{r.name}</h2>
        <div className="small muted">
          {r.meals.map((m) => MEAL_LABEL[m]).join(' · ')} · ⏱ {r.minutes} min · rende {r.serves} {r.serves === 1 ? 'refeição' : 'refeições'}
          {r.grams ? ` · ${r.grams >= 1000 ? `${r.grams / 1000} kg` : `${r.grams} g`} de carne` : ''}
        </div>
        {r.tip && (
          <div className="card small" style={{ background: 'var(--primary-soft)', boxShadow: 'none' }}>
            💡 {r.tip}
          </div>
        )}
        <div>
          <h3 style={{ marginBottom: 6 }}>Ingredientes</h3>
          <div className="row wrap" style={{ gap: 6 }}>
            {r.protein && (
              <span className={'badge ' + (st.proteinOk ? 'green' : 'yellow')}>
                {st.proteinOk ? '✓' : '✕'} {proteinNames(db, r.protein)}
              </span>
            )}
            {r.uses
              .filter((u) => !r.protein?.includes(u))
              .map((u) => {
                const ok = !missing.includes(u)
                return (
                  <span key={u} className={'badge ' + (ok ? 'green' : 'yellow')}>
                    {ok ? '✓' : '✕'} {nameOf(db, u)}
                  </span>
                )
              })}
          </div>
        </div>
        <div>
          <h3 style={{ marginBottom: 6 }}>Como fazer</h3>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
            {r.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
        <div className="row">
          {missing.length > 0 && (
            <button className="btn primary grow" onClick={() => addMissing(db, missing)}>
              + Lista o que falta ({missing.length})
            </button>
          )}
          <button className="btn grow" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </Sheet>
  )
}

function SavedSheet({ db, r, onEdit, onClose }: { db: DB; r: SavedRecipe; onEdit: () => void; onClose: () => void }) {
  const st = recipeStatus(db, r.uses)
  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <h2>{r.name}</h2>
        {r.url && (
          <a className="btn sm" href={r.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            Abrir o post original ↗
          </a>
        )}
        {r.uses.length > 0 && (
          <div className="row wrap" style={{ gap: 6 }}>
            {r.uses.map((u) => (
              <span key={u} className={'badge ' + (st.missing.includes(u) ? 'yellow' : 'green')}>
                {st.missing.includes(u) ? '✕' : '✓'} {nameOf(db, u)}
              </span>
            ))}
          </div>
        )}
        {r.text && <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{r.text}</div>}
        <div className="row">
          {st.missing.length > 0 && (
            <button className="btn primary grow" onClick={() => addMissing(db, st.missing)}>
              + Lista o que falta ({st.missing.length})
            </button>
          )}
          <button className="btn grow" onClick={onEdit}>
            Editar
          </button>
        </div>
        <button
          className="btn ghost sm"
          style={{ color: 'var(--accent)' }}
          onClick={() =>
            confirmAction('Apagar essa receita salva?', 'Apagar', () => {
              deleteRecipe(r.id)
              onClose()
            })
          }
        >
          Apagar receita
        </button>
      </div>
    </Sheet>
  )
}

function fromShare(s: { title?: string; text?: string; url?: string }): Partial<SavedRecipe> {
  const text = s.text ?? ''
  const url = s.url || text.match(/https?:\/\/\S+/)?.[0]
  const clean = text.replace(url ?? '', '').trim()
  return { name: s.title || clean.split('\n')[0]?.slice(0, 60) || '', url, text: clean, meals: [] }
}

function SaveSheet({ initial, onClose, onSaved }: { initial: Partial<SavedRecipe>; onClose: () => void; onSaved: () => void }) {
  const db = useDB()
  const [name, setName] = useState(initial.name ?? '')
  const [url, setUrl] = useState(initial.url ?? '')
  const [text, setText] = useState(initial.text ?? '')
  const [meals, setMeals] = useState<Meal[]>(initial.meals ?? [])
  const detected = useMemo(() => matchIngredients(text), [text])
  const [off, setOff] = useState<Set<Id>>(new Set())
  const [extra, setExtra] = useState<Id[]>(initial.uses?.filter((u) => !detected.includes(u)) ?? [])
  const uses = [...new Set([...detected.filter((d) => !off.has(d)), ...extra])]
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [ocr, setOcr] = useState<string | null>(null)

  /** Prints do carrossel ou do vídeo: lê o texto e junta na receita. */
  const readPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setFetchError(null)
    try {
      const got = await readImages([...files], setOcr)
      if (!got.trim()) setFetchError('Não achei texto nessas imagens. Tente um print mais de perto.')
      else {
        setText((t) => (t.trim() ? `${t.trim()}\n\n${got}` : got))
        setName((n) => n || got.split('\n')[0]!.slice(0, 60))
      }
    } catch {
      setFetchError('Não consegui ler as imagens agora. Tente de novo com internet (a primeira vez baixa o leitor).')
    } finally {
      setOcr(null)
    }
  }

  /** Busca título e legenda do post (Instagram, TikTok, YouTube, site de receita). */
  const fetchCaption = async (link: string) => {
    if (!/^https:\/\//.test(link.trim())) return
    setFetching(true)
    setFetchError(null)
    try {
      const r = await fetch(`/api/receita?url=${encodeURIComponent(link.trim())}`)
      const j = (await r.json().catch(() => ({}))) as { title?: string; text?: string; error?: string }
      if (!r.ok) throw new Error(j.error ?? 'Não consegui ler esse post.')
      if (j.text) setText((t) => t || j.text!)
      if (j.title) setName((n) => n || j.title!)
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Não consegui ler esse post.')
    } finally {
      setFetching(false)
    }
  }

  // chegou pelo "Compartilhar" só com o link: já busca a legenda
  useEffect(() => {
    if (initial.url && !initial.text) void fetchCaption(initial.url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const others = Object.values(db.items)
    .filter((i) => !i.deleted && !uses.includes(i.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <h2>{initial.id ? 'Editar receita' : 'Salvar receita'}</h2>
        <label className="field">
          <span>Link do post (Instagram, TikTok…)</span>
          <div className="row" style={{ gap: 8 }}>
            <input id="rec-url" inputMode="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button className="btn sm" disabled={!url.trim() || fetching} onClick={() => void fetchCaption(url)}>
              {fetching ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
          {fetching && <span className="small muted">Buscando a legenda do post…</span>}
          {fetchError && <span className="small" style={{ color: 'var(--warn)' }}>{fetchError}</span>}
        </label>
        <label className="field">
          <span>Nome</span>
          <input id="rec-name" placeholder="Ex.: Escondidinho da vó" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="row wrap" style={{ gap: 6 }}>
          {(['cafe', 'almoco', 'jantar'] as Meal[]).map((m) => (
            <button key={m} className={'chip' + (meals.includes(m) ? ' on' : '')} onClick={() => setMeals((x) => (x.includes(m) ? x.filter((y) => y !== m) : [...x, m]))}>
              {MEAL_LABEL[m]}
            </button>
          ))}
        </div>
        <label className="btn sm block" style={{ cursor: 'pointer' }}>
          📷 Ler foto ou print (carrossel, quadro do vídeo)
          <input type="file" accept="image/*" multiple hidden onChange={(e) => void readPhotos(e.target.files)} />
        </label>
        {ocr && <span className="small muted">{ocr}</span>}
        <label className="field">
          <span>Cole a legenda ou os ingredientes</span>
          <textarea id="rec-text" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={'500 g de carne moída\n2 batatas\n1 caixa de creme de leite…'} />
        </label>
        <div className="field">
          <span>Ingredientes da despensa ({uses.length})</span>
          <div className="row wrap" style={{ gap: 6 }}>
            {uses.map((u) => (
              <button
                key={u}
                className="chip on"
                onClick={() => {
                  if (detected.includes(u)) setOff((s) => new Set(s).add(u))
                  setExtra((x) => x.filter((y) => y !== u))
                }}
              >
                {nameOf(db, u)} ✕
              </button>
            ))}
            {!uses.length && <span className="small muted">Cole o texto acima que eu acho os ingredientes.</span>}
          </div>
          <select
            id="rec-add"
            value=""
            onChange={(e) => {
              const v = e.target.value
              if (!v) return
              setOff((s) => {
                const n = new Set(s)
                n.delete(v)
                return n
              })
              setExtra((x) => [...x, v])
            }}
          >
            <option value="">+ Adicionar ingrediente…</option>
            {others.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn primary block"
          disabled={!name.trim() && !url.trim()}
          onClick={() => {
            saveRecipe({ id: initial.id, name: name.trim() || 'Receita salva', url: url.trim() || undefined, text: text.trim() || undefined, meals, uses })
            toast('Receita salva 📌')
            onSaved()
          }}
        >
          Salvar
        </button>
      </div>
    </Sheet>
  )
}

function YieldSheet({ db, id, onClose }: { db: DB; id: Id; onClose: () => void }) {
  const it = db.items[id]!
  const per = mealsPerUnit(it)
  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <h2>{it.name}</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Da última vez, 1 {it.unit} rendeu quantas refeições do casal? Não precisa pesar: conte quantas vezes ela foi pro prato (sobra conta).
        </p>
        <div className="row between">
          <span style={{ fontWeight: 700 }}>1 {it.unit} rende</span>
          <Stepper value={per} unit="un" min={1} onChange={(v) => updateItem(id, { mealsPerUnit: Math.round(v) })} />
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Dica: ao chegar da feira, divida a carne em saquinhos do tamanho de uma refeição e congele. Aí é só tirar um por dia e ela dura o mês.
        </p>
        <button className="btn primary block" onClick={onClose}>
          Pronto
        </button>
      </div>
    </Sheet>
  )
}
