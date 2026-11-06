import { Bell, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react'
import {
  IlCabelo, IlCronograma, IlDiagnostico, IlEstrela, IlGaleria, IlHidratacao, IlNutricao, IlReconstrucao, IlSino, type Icone,
} from '../../ds/ilustras'
import { ETAPA, lembreteDoDia, resumoHoje, useCronograma } from '../../data/cronograma'
import { useDiario } from '../../data/diario'
import { ICONE_ETAPA } from './Cuidados'
import { comoChamar, dicaDoPerfil, quimicaRecente } from '../../data/perfilCabelo'
import type { Cliente, Incomodo } from '../../types'
import { Atalho, Botao, Cartao, TituloSecao } from '../../ds/componentes'
import { navegar } from '../../lib/rotas'
import { InstalarApp } from './InstalarApp'
import { formatarData, hojeISO, parseData, somarDias } from '../../lib/regras'

export function Sino({ cliente }: { cliente: Cliente }) {
  const n = cliente.notificacoes.filter((x) => !x.lida).length + (lembreteDoDia(cliente) ? 1 : 0)
  return (
    <button className="ds-sino" onClick={() => navegar('/notificacoes')} aria-label={`Notificações${n ? `, ${n} novas` : ''}`}>
      <Bell size={20} />
      {n > 0 && <span>{n > 9 ? '9+' : n}</span>}
    </button>
  )
}

/** Faixa da semana: hoje em destaque e os dias de cuidado do cronograma marcados. */
function Semana({ diasDeCuidado }: { diasDeCuidado: Set<string> }) {
  const hoje = hojeISO()
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(hoje, i))
  return (
    <div className="semana" aria-label="Próximos 7 dias">
      {dias.map((d, i) => {
        const dt = parseData(d)
        return (
          <div key={d} className={`semana__dia ${i === 0 ? 'hoje' : ''} ${diasDeCuidado.has(d) ? 'marcado' : ''}`} title={diasDeCuidado.has(d) ? 'Dia de cuidado' : undefined}>
            <small>{i === 0 ? 'HOJE' : dt.toLocaleDateString('pt-BR', { weekday: 'narrow' }).toUpperCase()}</small>
            <span>{dt.getDate()}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Etapa do cronograma capilar de hoje (ou convite para montar). */
function CronogramaHoje({ cliente }: { cliente: Cliente }) {
  useCronograma(cliente.id)
  const r = resumoHoje(cliente)
  if (!r)
    return (
      <button className="cartao-crono" onClick={() => navegar('/cuidados')}>
        <IlCronograma size={64} />
        <span className="ds-item__texto"><small>Cronograma</small><strong>Monte seu cronograma capilar</strong><small>Hidratação, nutrição e reconstrução no dia certo</small></span>
        <ChevronRight size={18} />
      </button>
    )
  const s = r.deHoje ?? r.proxima
  if (!s)
    return (
      <button className="cartao-crono cartao-crono--lavanda" onClick={() => navegar('/cuidados')}>
        <IlCronograma size={64} />
        <span className="ds-item__texto"><small>Cronograma</small><strong>Ciclo de 4 semanas completo</strong><small>Comece um novo ciclo na aba Cronograma</small></span>
        <ChevronRight size={18} />
      </button>
    )
  const I = ICONE_ETAPA[s.etapa]
  const ehHoje = s.data === r.deHoje?.data
  return (
    <button className={`cartao-crono cartao-crono--${ETAPA[s.etapa].tom}`} onClick={() => navegar(`/cuidados/${s.etapa}`)}>
      <I size={64} />
      <span className="ds-item__texto">
        <small>{ehHoje ? (s.feita ? 'Feito hoje' : 'Hoje é dia de') : `Próxima etapa · ${formatarData(s.data, { weekday: 'long' })}`}</small>
        <strong className="cartao-crono__nome">{ETAPA[s.etapa].nome}</strong>
        <small>{r.feitas} de {r.plano.length} etapas feitas</small>
      </span>
      <ChevronRight size={18} />
    </button>
  )
}

/** Check-in do diário: um toque leva ao registro do dia. */
function DiarioHoje({ cliente }: { cliente: Cliente }) {
  const registros = useDiario(cliente.id)
  const hoje = registros.find((r) => r.data === hojeISO())
  return (
    <button className="cartao-crono cartao-crono--areia cartao-diario" onClick={() => navegar('/diario')}>
      <IlEstrela size={64} />
      <span className="ds-item__texto">
        <small>Diário do cabelo</small>
        <strong>{hoje ? 'Registrado hoje' : 'Como está seu cabelo hoje?'}</strong>
        <small>{hoje ? `Frizz ${hoje.frizz} · brilho ${hoje.brilho} · maciez ${hoje.maciez}` : 'Leva um minuto: frizz, brilho e maciez'}</small>
      </span>
      {hoje ? <CheckCircle2 size={18} /> : <ChevronRight size={18} />}
    </button>
  )
}

const ICONE_DICA: Record<Incomodo, Icone> = {
  frizz: IlNutricao, volume: IlCabelo, definicao: IlHidratacao, pontas: IlNutricao, quebra: IlReconstrucao, oleosidade: IlHidratacao, brilho: IlNutricao, queda: IlCabelo,
}

/** Dica do perfil de cabelo: a partir do que mais incomoda a cliente (respostas do cadastro). */
function DicaDoPerfil({ cliente }: { cliente: Cliente }) {
  const d = dicaDoPerfil(cliente)
  if (!d) return null
  const I = ICONE_DICA[d.incomodo]
  return (
    <button className={`cartao-crono cartao-crono--${d.tom} cartao-dica`} onClick={() => navegar(d.rota)}>
      <I size={64} />
      <span className="ds-item__texto">
        <small>Para o seu cabelo</small>
        <strong>{d.titulo}</strong>
        <small className="cartao-dica__texto">{d.texto}</small>
        <small className="cartao-dica__acao">{d.acao}</small>
      </span>
      <ChevronRight size={18} />
    </button>
  )
}

export function Inicio({ cliente }: { cliente: Cliente }) {
  useCronograma(cliente.id)
  const r = resumoHoje(cliente)
  const q = quimicaRecente(cliente)
  const diasDeCuidado = new Set((r?.plano ?? []).map((s) => s.data))
  const deHoje = r?.deHoje

  return (
    <>
      <section className="hoje">
        <header className="linha">
          <span className="hoje__ola">Olá, {comoChamar(cliente)}</span>
          <Sino cliente={cliente} />
        </header>
        <Semana diasDeCuidado={diasDeCuidado} />
        <div className="hoje__centro">
          <span className="hoje__linha">{!r ? 'Seu cabelo' : deHoje ? (deHoje.feita ? 'Hoje você já fez' : 'Hoje é dia de') : 'Hoje'}</span>
          <span className="hoje__grande">{!r ? 'do seu jeito' : deHoje ? ETAPA[deHoje.etapa].nome.toLowerCase() : 'dia de pausa'}</span>
          {r && !deHoje && r.proxima && <span className="suave">Próxima: {ETAPA[r.proxima.etapa].nome.toLowerCase()}, {formatarData(r.proxima.data, { weekday: 'long', day: '2-digit', month: 'short' })}</span>}
          <Botao tamanho="sm" bloco={false} icone={Sparkles} onClick={() => navegar(!r ? '/cuidados' : deHoje ? `/cuidados/${deHoje.etapa}` : '/cuidados')}>
            {!r ? 'Montar meu cronograma' : deHoje ? 'Ver o passo a passo' : 'Ver meu cronograma'}
          </Botao>
        </div>
      </section>

      <div className="tela">
        <TituloSecao>Para você hoje</TituloSecao>
        <CronogramaHoje cliente={cliente} />
        <DiarioHoje cliente={cliente} />
        <DicaDoPerfil cliente={cliente} />

        {q && (
          <Cartao className="cuidado-quimica">
            <span className="linha" style={{ justifyContent: 'flex-start', gap: 10 }}><IlHidratacao size={40} /><strong>Cuidado pós-química</strong></span>
            <span className="suave">
              {q.semana ? 'Química feita nesta semana: siga o tempo sem lavar que o profissional indicou. ' : ''}
              Nas próximas semanas, priorize a hidratação, use protetor térmico e pegue leve no calor.
            </span>
          </Cartao>
        )}

        <TituloSecao>Explorar</TituloSecao>
        <div className="grade-4">
          <Atalho icone={IlCronograma} rotulo="Cronograma" onClick={() => navegar('/cuidados')} />
          <Atalho icone={IlEstrela} rotulo="Diário" onClick={() => navegar('/diario')} />
          <Atalho icone={IlGaleria} rotulo="Evolução" onClick={() => navegar('/evolucao')} />
          <Atalho icone={IlDiagnostico} rotulo="Diagnóstico" onClick={() => navegar('/diagnostico')} />
          <Atalho icone={IlNutricao} rotulo="Dicas" onClick={() => navegar('/dicas')} />
          <Atalho icone={IlCabelo} rotulo="Meu cabelo" onClick={() => navegar('/perfil-cabelo')} />
          <Atalho icone={IlSino} rotulo="Ajuda" onClick={() => navegar('/ajuda')} />
        </div>

        <InstalarApp />
      </div>
    </>
  )
}
