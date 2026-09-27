import { useState } from 'react'
import { BUILD } from '../pwa'
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
          <div className="stack" style={{ gap: 6 }}>
            <b>1. “E aí Siri, Feirinha anota” (voz)</b>
            <span>
              No app <b>Atalhos</b>, toque em + e dê o nome “Feirinha anota”. Adicione 3 ações: <b>Ditar Texto</b> (idioma Português),{' '}
              <b>Codificar URL</b> (usando o Texto Ditado) e <b>Abrir URLs</b> com o endereço abaixo seguido da variável “Texto Codificado”:
            </span>
            <Copy text={`${base}?voz=`} />
            <span className="muted">Depois é só dizer: “E aí Siri, Feirinha anota” → “acabou o arroz e o feijão”.</span>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <b>2. Salvar receita do Instagram/TikTok (Compartilhar)</b>
            <span>
              Novo atalho “Salvar no Feirinha”. Nos detalhes (ⓘ), ative <b>Mostrar na Folha de Compartilhamento</b> e aceite URLs. Adicione{' '}
              <b>Codificar URL</b> (usando a Entrada do Atalho) e <b>Abrir URLs</b> com o endereço abaixo seguido de “Texto Codificado”:
            </span>
            <Copy text={`${base}?url=`} />
            <span className="muted">No post: Compartilhar → Salvar no Feirinha. O app busca a legenda e acha os ingredientes da despensa.</span>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <b>3. Botões rápidos (Tela de Início ou Widget de Atalhos)</b>
            <span>Um atalho com só a ação Abrir URLs pra cada um:</span>
            <span>Acabou algo:</span>
            <Copy text={`${base}?acao=acabou`} />
            <span>Modo Mercado:</span>
            <Copy text={`${base}?acao=mercado`} />
            <span>Conferir nota fiscal:</span>
            <Copy text={`${base}?acao=nota`} />
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <b>4. Automação: chegou em casa depois da feira</b>
            <span>
              Atalhos → Automação → Chegar (em casa), só nos dias de feira se quiser → Abrir URLs com o link de “Conferir nota fiscal” acima. Aparece
              uma notificação e, tocando, já abre a leitura do QR.
            </span>
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
            <b>2. Salvar receita:</b> no Instagram/TikTok, Compartilhar → <b>Feirinha</b>. O app busca a legenda e acha os ingredientes.
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
      <div className="small muted">Versão do app: {BUILD}</div>
    </div>
  )
}
