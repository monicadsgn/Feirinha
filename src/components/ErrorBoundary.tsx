import { Component, type ReactNode } from 'react'

/**
 * Se alguma tela quebrar, mostra um aviso com "Recarregar" em vez de deixar
 * a tela vazia. Os dados ficam no celular e no servidor, nada se perde.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="empty" style={{ marginTop: 80 }}>
        <div className="big">🧺</div>
        <h2>Ops, essa tela travou</h2>
        <p>Suas coisas estão salvas: a despensa, a lista e a compra continuam no celular e na casa.</p>
        <button className="btn primary" onClick={() => location.reload()}>
          Recarregar
        </button>
        <p className="small muted" style={{ marginTop: 16 }}>
          Se acontecer de novo, manda um print desta tela: {String(this.state.error.message).slice(0, 140)}
        </p>
      </div>
    )
  }
}
