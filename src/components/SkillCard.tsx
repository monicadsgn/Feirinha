import { strToU8, zipSync } from 'fflate'
import { skillMarkdown } from '../data/skill'
import { toast } from './ui'

/** Baixar a skill do claude.ai com o link da casa já dentro. */
export function SkillCard({ casaLink, me }: { casaLink: string | null; me: string }) {
  if (!casaLink)
    return (
      <div className="small muted">
        <b>Skill do Claude:</b> crie a casa em “Compartilhar a casa” pra liberar.
      </div>
    )
  const md = skillMarkdown(casaLink, me || 'a casa')

  const download = async () => {
    const zip = zipSync({ 'feirinha/SKILL.md': strToU8(md) })
    const file = new File([zip], 'feirinha-skill.zip', { type: 'application/zip' })
    // no iPhone, o app instalado baixa melhor pelo menu de compartilhar (Salvar em Arquivos)
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
    if (nav.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Skill Feirinha' })
        return
      } catch {
        /* cancelou: tenta o download normal */
      }
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(file)
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md)
      toast('Texto da skill copiado ✓')
    } catch {
      toast('Não deu pra copiar')
    }
  }

  return (
    <div className="stack small" style={{ gap: 6 }}>
      <b>Skill do Claude (claude.ai): mande prints de receita ou de lista e salve com um toque</b>
      <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
        <li>
          Toque em <b>Baixar skill</b> (no iPhone: <b>Salvar em Arquivos</b>).
        </li>
        <li>
          No claude.ai (de preferência no computador ou no navegador): <b>Configurações → Capacidades</b>, ative <b>Execução de código</b> e, em{' '}
          <b>Skills</b>, toque em <b>Enviar skill</b> e escolha o <b>feirinha-skill.zip</b>.
        </li>
        <li>
          Numa conversa, mande os prints e escreva “salva na Feirinha”. O Claude organiza a receita e responde com o botão{' '}
          <b>🧺 Salvar no Feirinha</b>.
        </li>
      </ol>
      <div className="row">
        <button className="btn sm primary grow" onClick={() => void download()}>
          ⬇ Baixar skill
        </button>
        <button className="btn sm grow" onClick={() => void copy()}>
          Copiar texto
        </button>
      </div>
      <span className="muted">A skill tem o código da casa: não compartilhe o arquivo.</span>
    </div>
  )
}
