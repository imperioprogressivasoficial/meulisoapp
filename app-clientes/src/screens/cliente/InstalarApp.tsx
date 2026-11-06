import { useState } from 'react'
import { Download, MoreVertical, Share, SquarePlus, X } from 'lucide-react'
import { Botao, Folha, SimboloMeuLiso } from '../../ds/componentes'
import { toast } from '../../ds/extras'
import { esconder, instalarAgora, useInstalacao } from '../../lib/instalar'

/** Cartão "Instale o Meu Liso" (some quando já está instalado ou a usuária fechou). */
export function InstalarApp({ fixo }: { fixo?: boolean }) {
  const { modo, escondido } = useInstalacao()
  const [passos, setPassos] = useState(false)
  if (modo === 'instalado' || (escondido && !fixo)) return null

  const instalar = async () => {
    if (modo === 'nativo') {
      const ok = await instalarAgora()
      if (ok) toast('Pronto! O Meu Liso está na sua tela inicial.')
      return
    }
    setPassos(true)
  }

  return (
    <>
      <div className="instalar">
        <SimboloMeuLiso altura={44} />
        <div className="instalar__texto">
          <strong>Instale o Meu Liso</strong>
          <small>Abre como app, direto da tela inicial, e te lembra do cronograma.</small>
        </div>
        <Botao tamanho="sm" bloco={false} icone={Download} onClick={instalar}>Instalar</Botao>
        {!fixo && <button className="instalar__fechar" aria-label="Agora não" onClick={esconder}><X size={16} /></button>}
      </div>

      <Folha aberta={passos} onFechar={() => setPassos(false)}>
        <h2>Adicionar à tela inicial</h2>
        {modo === 'ios' ? (
          <ol className="instalar__passos">
            <li><Share size={18} /> <span>No Safari, toque em <strong>Compartilhar</strong>, na barra de baixo.</span></li>
            <li><SquarePlus size={18} /> <span>Role e toque em <strong>Adicionar à Tela de Início</strong>.</span></li>
            <li><Download size={18} /> <span>Toque em <strong>Adicionar</strong>. O Meu Liso aparece junto dos seus apps.</span></li>
          </ol>
        ) : (
          <ol className="instalar__passos">
            <li><MoreVertical size={18} /> <span>No Chrome, toque no menu <strong>⋮</strong>, no canto de cima.</span></li>
            <li><Download size={18} /> <span>Toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</span></li>
            <li><SquarePlus size={18} /> <span>Confirme. O Meu Liso aparece junto dos seus apps.</span></li>
          </ol>
        )}
        <p className="suave">Em breve o Meu Liso também estará na App Store e no Google Play.</p>
        <Botao onClick={() => setPassos(false)}>Entendi</Botao>
      </Folha>
    </>
  )
}
