import { useState } from 'react'
import { BUILD } from '../pwa'
import { useDB } from '../data/store'
import { useSync } from '../data/sync'
import { SkillCard } from './SkillCard'
import { toast } from './ui'

/**
 * Passo a passo dos atalhos do celular. Os atalhos só abrem links do app
 * (nada de conta ou senha): o app entende ?voz=, ?acao= e ?url=.
 */

function Copy({ text }: { text: string }) {
  return (
    <div className="row" style={{ gap: 6 }}>
      <code className="small grow" style={{ wordBreak: 'break-all', background: 'var(--surface-2)', padding: 8, borderRadius: 8, userSelect: 'all' }}>
        {text}
      </code>
      <button
        className="btn sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text)
            toast('Copiado ✓')
          } catch {
            toast('Segure o texto pra copiar')
          }
        }}
      >
        Copiar
      </button>
    </div>
  )
}

export function Atalhos() {
  const [os, setOs] = useState<'iphone' | 'android'>(/android/i.test(navigator.userAgent) ? 'android' : 'iphone')
  const base = location.origin + location.pathname
  const db = useDB()
  const sync = useSync()
  const casaLink = sync.casa ? `${location.origin}/api/casa?c=${sync.casa}&quem=${encodeURIComponent(db.settings.me || 'Casa')}` : null
  return (
    <div className="card stack">
      <h3>Atalhos e voz</h3>
      <div className="row" style={{ gap: 6 }}>
        <button className={'chip grow' + (os === 'iphone' ? ' on' : '')} style={{ justifyContent: 'center' }} onClick={() => setOs('iphone')}>
          iPhone
        </button>
        <button className={'chip grow' + (os === 'android' ? ' on' : '')} style={{ justifyContent: 'center' }} onClick={() => setOs('android')}>
          Android
        </button>
      </div>

      <div className="small">
        <b>Dentro do app:</b> no “Adicionar” e no “Acabou alguma coisa?”, toque no 🎤 e fale, ou escreva a frase: “acabou detergente e arroz”, “coloca
        dois pacotes de café e leite”.
      </div>

      {os === 'iphone' ? (
        <div className="stack small" style={{ gap: 14 }}>
          <div>
            <b>0. Instale o app:</b> no Safari, abra {base}, toque em Compartilhar → “Adicionar à Tela de Início”.
          </div>
          {!casaLink ? (
            <div className="badge yellow" style={{ padding: 10, borderRadius: 12 }}>
              Pra Siri e o Compartilhar funcionarem, crie a casa primeiro em “Compartilhar a casa” (acima). Os links dos atalhos aparecem aqui.
            </div>
          ) : (
            <>
              <div className="muted">
                No iPhone, os atalhos falam direto com a casa, sem abrir o app: a Siri responde e tudo aparece nos dois celulares. Os links abaixo
                têm o código da casa: não mande pra ninguém de fora.
              </div>
              <div className="stack" style={{ gap: 6 }}>
                <b>1. “E aí Siri, Feirinha anota” (voz)</b>
                <span>
                  No app <b>Atalhos</b>, toque em + e dê o nome “Feirinha anota”. Adicione 4 ações, nesta ordem:
                </span>
                <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
                  <li>
                    <b>Ditar Texto</b> (idioma Português)
                  </li>
                  <li>
                    <b>Codificar URL</b> → o Texto Ditado
                  </li>
                  <li>
                    <b>Obter Conteúdo do URL</b> → cole o link abaixo e, no fim dele, coloque a variável “Texto Codificado”
                  </li>
                  <li>
                    <b>Falar Texto</b> → Conteúdo do URL
                  </li>
                </ol>
                <Copy text={`${casaLink}&voz=`} />
                <span className="muted">Uso: “E aí Siri, Feirinha anota” → “acabou o arroz e o feijão” ou “coloca dois pacotes de café”.</span>
              </div>
              <div className="stack" style={{ gap: 6 }}>
                <b>2. “Salvar no Feirinha” no Compartilhar (receitas)</b>
                <span>
                  Novo atalho “Salvar no Feirinha”. Nos detalhes (ⓘ), ative <b>Mostrar na Folha de Compartilhamento</b> (aceitar URLs e Texto).
                  Ações:
                </span>
                <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
                  <li>
                    <b>Codificar URL</b> → Entrada do Atalho
                  </li>
                  <li>
                    <b>Obter Conteúdo do URL</b> → cole o link abaixo + “Texto Codificado” no fim
                  </li>
                  <li>
                    <b>Mostrar Notificação</b> → Conteúdo do URL
                  </li>
                </ol>
                <Copy text={`${casaLink}&receita=`} />
                <span className="muted">No post do Instagram/TikTok: Compartilhar → Salvar no Feirinha. A receita aparece em Receitas → Salvas, com os ingredientes da despensa.</span>
              </div>
              <div className="stack" style={{ gap: 6 }}>
                <b>3. “Receita do print” (carrossel ou vídeo)</b>
                <span>
                  Quando os ingredientes estão na imagem e não na legenda: tire print do slide (ou pause o vídeo e tire print). Novo atalho
                  “Receita do print”, com <b>Mostrar na Folha de Compartilhamento</b> aceitando <b>Imagens</b>. Ações:
                </span>
                <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
                  <li>
                    <b>Extrair Texto da Imagem</b> → Entrada do Atalho
                  </li>
                  <li>
                    <b>Codificar URL</b> → Texto da Imagem
                  </li>
                  <li>
                    <b>Obter Conteúdo do URL</b> → cole o link abaixo + “Texto do URL Codificado” no fim
                  </li>
                  <li>
                    <b>Mostrar Notificação</b> → Conteúdo do URL
                  </li>
                </ol>
                <Copy text={`${casaLink}&texto=`} />
                <span className="muted">No print (ou na foto): Compartilhar → Receita do print.</span>
              </div>
            </>
          )}
          <div>
            <b>4. Ditado:</b> se o 🎤 não aparecer dentro do app, use o microfone do próprio teclado no “Adicionar” e toque em Enter: a frase vira
            comando do mesmo jeito.
          </div>
          <div>
            <b>5. Lembrete ao chegar em casa:</b> Atalhos → Automação → Chegar (casa) → <b>Mostrar Notificação</b> “Conferir a nota no Feirinha”.
          </div>
        </div>
      ) : (
        <div className="stack small" style={{ gap: 14 }}>
          <div>
            <b>0. Instale o app:</b> no Chrome, abra {base} e toque em “Instalar app” (ou ⋮ → Adicionar à tela inicial).
          </div>
          <div>
            <b>1. Atalhos do ícone:</b> segure o ícone do Feirinha: aparecem “Acabou algo”, “Adicionar”, “Modo Mercado” e “Receitas”. Dá pra
            arrastar cada um pra tela inicial.
          </div>
          <div>
            <b>2. Salvar receita:</b> no Instagram/TikTok, Compartilhar → <b>Feirinha</b>. O app busca a legenda e acha os ingredientes. Se os
            ingredientes estiverem na imagem (carrossel ou vídeo), tire print e use <b>📷 Ler foto ou print</b> na tela de salvar receita.
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <b>3. Voz com o Google Assistente</b>
            <span>“Ok Google, abrir Feirinha” e toque no 🎤. Pra ir direto, crie uma Rotina no app Google com a ação “Abrir site” neste endereço:</span>
            <Copy text={`${base}?acao=acabou`} />
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <b>4. Links diretos (pra widgets ou apps de automação)</b>
            <span>Modo Mercado:</span>
            <Copy text={`${base}?acao=mercado`} />
            <span>Conferir nota fiscal:</span>
            <Copy text={`${base}?acao=nota`} />
            <span>Anotar por texto (troque o final):</span>
            <Copy text={`${base}?voz=acabou arroz e feijão`} />
          </div>
        </div>
      )}
      <SkillCard casaLink={casaLink} me={db.settings.me} />
      <div className="small muted">Versão do app: {BUILD}</div>
    </div>
  )
}
