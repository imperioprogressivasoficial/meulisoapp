import { Bell, CircleHelp, LogOut, RotateCcw, Settings, User } from 'lucide-react'
import { IlCabelo, IlDiagnostico, IlEstrela, IlGaleria, IlNutricao } from '../../ds/ilustras'
import type { Cliente } from '../../types'
import { Avatar, Botao, Cabecalho, Campo, CampoAniversario, Cartao, ItemLista } from '../../ds/componentes'
import { toast } from '../../ds/extras'
import { atualizarCliente, sair } from '../../data/acoes'
import { resetarDemo } from '../../data/store'
import { modoNuvem } from '../../data/nuvem'
import { resumoPerfil } from '../../data/perfilCabelo'
import { navegar } from '../../lib/rotas'
import { InstalarApp } from './InstalarApp'
import { formatarData, formatarTelefone } from '../../lib/regras'
import { Sino } from './Inicio'

export function Perfil({ cliente }: { cliente: Cliente }) {
  const fotos = cliente.fotos.filter((f) => f.tipo === 'evolucao').length
  return (
    <>
      <Cabecalho titulo="Meu Perfil" direita={<Sino cliente={cliente} />} />
      <div className="tela">
        <div className="perfil-topo">
          <Avatar nome={cliente.nome} tamanho={84} />
          <h1>{cliente.nome}</h1>
          <span className="suave">{formatarTelefone(cliente.telefone)} · no app desde {formatarData(cliente.criadoEm, { month: 'short', year: 'numeric' })}</span>
        </div>

        <Cartao>
          <Campo rotulo="Nome" icone={User} defaultValue={cliente.nome} onBlur={(e) => { const v = e.target.value.trim(); if (v.length >= 2 && v !== cliente.nome) atualizarCliente(cliente.id, { nome: v }) }} />
          <CampoAniversario valor={cliente.aniversario} onTrocar={(v) => { if (v) atualizarCliente(cliente.id, { aniversario: v }) }} />
        </Cartao>

        <Cartao>
          <ItemLista icone={IlCabelo} titulo="Meu perfil de cabelo" subtitulo={resumoPerfil(cliente.onboarding) ?? 'Responda e deixe o app com a sua cara'} onClick={() => navegar('/perfil-cabelo')} seta />
          <ItemLista icone={IlEstrela} titulo="Diário do cabelo" onClick={() => navegar('/diario')} seta />
          <ItemLista icone={IlGaleria} titulo="Evolução" subtitulo={fotos ? `${fotos} ${fotos === 1 ? 'foto' : 'fotos'}` : 'Guarde a primeira foto'} onClick={() => navegar('/evolucao')} seta />
          <ItemLista icone={IlDiagnostico} titulo="Diagnóstico capilar" subtitulo={cliente.diagnosticos[0] ? `Último: ${formatarData(cliente.diagnosticos[0].data, { day: '2-digit', month: 'short' })}` : 'Descubra o que seu fio pede'} onClick={() => navegar('/diagnostico')} seta />
          <ItemLista icone={IlNutricao} titulo="Dicas de cuidado" onClick={() => navegar('/dicas')} seta />
        </Cartao>

        <Cartao>
          <ItemLista icone={Bell} titulo="Notificações" onClick={() => navegar('/notificacoes')} seta />
          <ItemLista icone={Settings} titulo="Configurações e privacidade" subtitulo="Avisos, seus dados e exclusão de conta" onClick={() => navegar('/configuracoes')} seta />
          <ItemLista icone={CircleHelp} titulo="Ajuda" subtitulo="Perguntas frequentes" onClick={() => navegar('/ajuda')} seta />
        </Cartao>

        <InstalarApp fixo />

        <Botao variante="contorno" icone={LogOut} onClick={() => { sair(); navegar('/') }}>Sair</Botao>
        {!modoNuvem() && <Botao variante="texto" icone={RotateCcw} onClick={() => { resetarDemo(); navegar('/'); toast('Demonstração reiniciada.') }}>Reiniciar dados da demonstração</Botao>}
      </div>
    </>
  )
}
