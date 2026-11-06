import { useState } from 'react'
import { Bell, BellRing } from 'lucide-react'
import type { Cliente } from '../../types'
import { Botao, Cabecalho, Cartao } from '../../ds/componentes'
import { Vazio } from '../../ds/extras'
import { IlCronograma } from '../../ds/ilustras'
import { lembreteDoDia } from '../../data/cronograma'
import { marcarNotificacaoLida, marcarNotificacoesLidas } from '../../data/acoes'
import { notificacoesAtivas, pedirPermissao, suportaNotificacoes } from '../../lib/notificar'
import { navegar, voltar } from '../../lib/rotas'

/** Avisos do app: só lembretes de cuidado (cronograma, pós-química, evolução). */
export function Notificacoes({ cliente }: { cliente: Cliente }) {
  const [ativas, setAtivas] = useState(notificacoesAtivas())
  const lembrete = lembreteDoDia(cliente)
  const novas = cliente.notificacoes.some((n) => !n.lida)
  return (
    <>
      <Cabecalho titulo="Notificações" onVoltar={() => voltar()} direita={novas ? <button className="ds-link" onClick={() => marcarNotificacoesLidas(cliente.id)}>Ler todas</button> : undefined} />
      <div className="tela">
        {suportaNotificacoes() && !ativas && (
          <Cartao tom="ouro">
            <strong>Ative os avisos no celular</strong>
            <span className="suave">Os lembretes do cronograma aparecem mesmo com o app fechado.</span>
            <Botao variante="escuro" icone={BellRing} onClick={async () => setAtivas(await pedirPermissao())}>Ativar notificações</Botao>
          </Cartao>
        )}
        {lembrete && (
          <button className="cuid-lembrete" onClick={() => navegar(lembrete.rota)}>
            <IlCronograma size={48} />
            <span className="ds-item__texto"><strong>{lembrete.titulo}</strong><small>{lembrete.texto}</small></span>
          </button>
        )}
        {cliente.notificacoes.length === 0 && !lembrete && <Vazio icone={Bell} titulo="Tudo em dia por aqui" />}
        {cliente.notificacoes.length > 0 && (
          <Cartao>
            {cliente.notificacoes.map((n) => (
              <button key={n.id} className={`notificacao ${n.lida ? '' : 'nova'}`} onClick={() => { if (!n.lida) marcarNotificacaoLida(cliente.id, n.id); if (n.rota) navegar(n.rota) }}>
                <span className="notificacao__ponto" />
                <span className="ds-item__texto">
                  <strong>{n.titulo}</strong>
                  <small>{n.texto}</small>
                  <small className="fraco">{new Date(n.data).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
                </span>
              </button>
            ))}
          </Cartao>
        )}
      </div>
    </>
  )
}
