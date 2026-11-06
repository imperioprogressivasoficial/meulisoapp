import { useState } from 'react'
import { BellRing, Copy, Database, FileText, ShieldCheck, Trash2 } from 'lucide-react'
import type { Cliente } from '../../types'
import { Botao, Cabecalho, Cartao, Folha, ItemLista, TituloSecao } from '../../ds/componentes'
import { Alerta, toast } from '../../ds/extras'
import { atualizarCliente, excluirConta, exportarDados } from '../../data/acoes'
import { modoNuvem } from '../../data/nuvem'
import { notificacoesAtivas, pedirPermissao, suportaNotificacoes } from '../../lib/notificar'
import { navegar, voltar } from '../../lib/rotas'
import { formatarData } from '../../lib/regras'

export function Configuracoes({ cliente }: { cliente: Cliente }) {
  const [push, setPush] = useState(notificacoesAtivas())
  const [excluir, setExcluir] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')

  const exportar = async () => {
    const json = JSON.stringify(await exportarDados(cliente.id), null, 2)
    try {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `meus-dados-meu-liso-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast('Arquivo com seus dados baixado.')
    } catch {
      await navigator.clipboard?.writeText(json)
      toast('Seus dados foram copiados.')
    }
  }

  return (
    <>
      <Cabecalho titulo="Configurações e privacidade" onVoltar={() => voltar('/perfil')} />
      <div className="tela">
        {!modoNuvem() && (
          <Alerta tom="aviso">
            <Database size={18} />
            <span>Modo demonstração: seus dados ficam só neste aparelho e não são enviados a nenhum servidor.</span>
          </Alerta>
        )}

        <TituloSecao>Avisos</TituloSecao>
        <Cartao>
          <label className="linha interruptor">
            <span>Avisos no celular<br /><small className="suave">Lembretes do cronograma e cuidados com o cabelo</small></span>
            <input type="checkbox" checked={push} disabled={!suportaNotificacoes()} onChange={async () => setPush(push ? true : await pedirPermissao())} />
          </label>
          <label className="linha interruptor">
            <span>Dicas e novidades<br /><small className="suave">Novidades do Meu Liso pelo WhatsApp</small></span>
            <input type="checkbox" checked={!!cliente.consentimentoMarketing} onChange={(e) => atualizarCliente(cliente.id, { consentimentoMarketing: e.target.checked })} />
          </label>
          {push && <Alerta tom="sucesso"><BellRing size={18} /><span>Avisos ativos neste aparelho.</span></Alerta>}
        </Cartao>

        <TituloSecao>Seus dados</TituloSecao>
        <Cartao>
          <span className="linha" style={{ justifyContent: 'flex-start', gap: 10 }}><ShieldCheck size={20} className="ouro" /><strong>Como cuidamos dos seus dados</strong></span>
          <p className="suave">
            Usamos seus dados só para personalizar o app: seu perfil de cabelo, o cronograma, os diagnósticos e as fotos da Evolução.
            O diário e o cronograma ficam guardados neste aparelho. As fotos são vistas só por você.
            Nunca vendemos seus dados.
          </p>
          {cliente.consentimentoLgpdEm && <p className="fraco">Política aceita em {formatarData(cliente.consentimentoLgpdEm.slice(0, 10))}.</p>}
          <Botao variante="contorno" icone={Copy} onClick={exportar}>Baixar uma cópia dos meus dados</Botao>
        </Cartao>

        <Cartao>
          <ItemLista icone={ShieldCheck} titulo="Política de Privacidade" onClick={() => navegar('/privacidade')} seta />
          <ItemLista icone={FileText} titulo="Termos de Uso" onClick={() => navegar('/termos')} seta />
        </Cartao>

        <Cartao tom="creme">
          <strong>Excluir minha conta</strong>
          <p className="suave">Apaga seu perfil, as respostas sobre o cabelo, os diagnósticos, as fotos, o diário e o cronograma.</p>
          <Botao variante="texto" icone={Trash2} onClick={() => setExcluir(true)}>Excluir conta</Botao>
        </Cartao>
      </div>

      <Folha aberta={excluir} onFechar={() => setExcluir(false)}>
        <h2>Excluir a conta?</h2>
        <p className="suave">Seu perfil de cabelo, {cliente.fotos.length ? `suas ${cliente.fotos.length} fotos` : 'suas fotos'}, o diário e o cronograma serão apagados. Isso não pode ser desfeito.</p>
        <label className="ds-campo" style={{ width: '100%', textAlign: 'left' }}>
          <span className="ds-campo__rotulo">Digite EXCLUIR para confirmar</span>
          <span className="ds-campo__caixa"><input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value.toUpperCase())} /></span>
        </label>
        <Botao variante="escuro" disabled={confirmacao !== 'EXCLUIR'} onClick={() => { excluirConta(cliente.id); navegar('/'); toast('Conta excluída.') }}>Excluir definitivamente</Botao>
        <Botao variante="contorno" onClick={() => setExcluir(false)}>Manter minha conta</Botao>
      </Folha>
    </>
  )
}
