import { useState } from 'react'
import { Bell, Check, Clock, Pencil, RotateCcw, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import type { Cliente } from '../../types'
import { Botao, Cabecalho, Cartao, Etiqueta, Progresso, TituloDestaque, TituloSecao } from '../../ds/componentes'
import { Alerta, Foto, toast } from '../../ds/extras'
import { IlCabelo, IlCronograma, IlDiagnostico, IlEstrela, IlGaleria, IlHidratacao, IlNutricao, IlReconstrucao, type Icone } from '../../ds/ilustras'
import { atualizarOnboarding } from '../../data/acoes'
import { cronogramaDasRespostas, quimicaRecente } from '../../data/perfilCabelo'
import {
  ETAPA, ROTULO_ESTADO, alternarFeito, montarPlano, recomecar, salvarPerfil, segundaDe, useCronograma,
  type Etapa, type EstadoFio, type Lavagens, type PerfilCronograma, type Sessao,
} from '../../data/cronograma'
import { navegar, voltar } from '../../lib/rotas'
import { formatarData, hojeISO, parseData } from '../../lib/regras'

export const ICONE_ETAPA: Record<Etapa, Icone> = { H: IlHidratacao, N: IlNutricao, R: IlReconstrucao }

/* ---------------- hub ---------------- */
export function Cuidados({ cliente }: { cliente: Cliente }) {
  const salvo = useCronograma(cliente.id)
  return (
    <>
      <section className="cuid-topo">
        <TituloDestaque linha="Seu cronograma" destaque="capilar" tom="azul" />
        <p className="suave centro">Hidratação, nutrição e reconstrução no dia certo, para o seu tipo de cabelo.</p>
      </section>
      <div className="tela">
        {salvo.perfil ? <Plano cliente={cliente} perfil={salvo.perfil} feitos={salvo.feitos} /> : <Configurar cliente={cliente} />}

        <TituloSecao>Meu cabelo</TituloSecao>
        <div className="grade-2 cuid-atalhos">
          <Bloco icone={IlEstrela} titulo="Diário do cabelo" onClick={() => navegar('/diario')} />
          <Bloco icone={IlGaleria} titulo="Evolução" onClick={() => navegar('/evolucao')} />
          <Bloco icone={IlDiagnostico} titulo="Diagnóstico capilar" onClick={() => navegar('/diagnostico')} />
          <Bloco icone={IlCabelo} titulo="Meu perfil de cabelo" onClick={() => navegar('/perfil-cabelo')} />
          <Bloco icone={IlNutricao} titulo="Dicas de cuidado" onClick={() => navegar('/dicas')} />
        </div>
      </div>
    </>
  )
}

function Bloco({ icone: I, titulo, onClick }: { icone: Icone; titulo: string; onClick: () => void }) {
  return (
    <button className="cuid-bloco" onClick={onClick}>
      <I size={52} />
      <strong>{titulo}</strong>
    </button>
  )
}

/* ---------------- configuração ---------------- */
/** Com as respostas do cadastro: um toque cria o plano. Sem elas (ou para ajustar): duas perguntas. */
function Configurar({ cliente }: { cliente: Cliente }) {
  const doCadastro = cronogramaDasRespostas(cliente)
  const [editar, setEditar] = useState(!doCadastro)
  const [estado, setEstado] = useState<EstadoFio | ''>(cliente.onboarding?.estado ?? '')
  const [lavagens, setLavagens] = useState<Lavagens | 0>(cliente.onboarding?.lavagens ?? 0)
  const q = quimicaRecente(cliente)
  const criar = (e: EstadoFio, l: Lavagens, lembretes: boolean) => {
    salvarPerfil(cliente.id, { estado: e, lavagens: l, inicio: segundaDe(hojeISO()), lembretes })
    toast(lembretes ? 'Cronograma pronto! Vamos lembrar você em cada etapa.' : 'Cronograma pronto!')
  }
  const avisoQuimica = q && (
    <Alerta tom="info">Você contou que fez uma química recente. Nas duas primeiras semanas o plano usa só hidratação, para proteger o fio.</Alerta>
  )

  if (doCadastro && !editar)
    return (
      <Cartao className="cuid-config">
        <span className="cuid-config__icone"><IlCronograma size={72} /></span>
        <h2 className="centro">Seu cronograma está quase pronto</h2>
        <p className="suave centro">Usamos as respostas do seu cadastro. Se algo mudou, é só ajustar.</p>
        <div className="cuid-respostas">
          <span><small>Seu fio hoje</small><strong>{ROTULO_ESTADO[doCadastro.estado].titulo}</strong></span>
          <span><small>Lavagens por semana</small><strong>{doCadastro.lavagens}x</strong></span>
        </div>
        {avisoQuimica}
        <Botao icone={Sparkles} onClick={() => criar(doCadastro.estado, doCadastro.lavagens, doCadastro.lembretes)}>Criar com as respostas do seu cadastro</Botao>
        <Botao variante="texto" icone={Pencil} onClick={() => setEditar(true)}>Ajustar as respostas</Botao>
      </Cartao>
    )

  return (
    <Cartao className="cuid-config">
      <span className="cuid-config__icone"><IlCronograma size={72} /></span>
      <h2 className="centro">Monte seu cronograma</h2>
      <p className="suave centro">Duas perguntas e o plano das próximas 4 semanas fica pronto.</p>

      <TituloSecao>Como está seu cabelo hoje?</TituloSecao>
      <div className="pilha-sm">
        {(Object.keys(ROTULO_ESTADO) as EstadoFio[]).map((e) => (
          <button key={e} className={`linha-opcao ${estado === e ? 'sel' : ''}`} onClick={() => setEstado(e)} aria-pressed={estado === e}>
            <span><strong>{ROTULO_ESTADO[e].titulo}</strong><small>{ROTULO_ESTADO[e].texto}</small></span>
            {estado === e && <Check size={18} className="ouro" />}
          </button>
        ))}
      </div>

      <TituloSecao>Quantas vezes você lava por semana?</TituloSecao>
      <div className="cuid-pilulas">
        {([2, 3, 4] as Lavagens[]).map((n) => (
          <button key={n} className={`horario ${lavagens === n ? 'sel' : ''}`} onClick={() => setLavagens(n)} aria-pressed={lavagens === n}>{n}x</button>
        ))}
      </div>

      {avisoQuimica}
      <Botao
        disabled={!estado || !lavagens}
        onClick={() => {
          const e = estado as EstadoFio
          const l = lavagens as Lavagens
          criar(e, l, cliente.onboarding?.lembretes ?? true)
          // mantém o perfil de cabelo igual ao que a cliente acabou de responder
          if (cliente.onboarding?.estado !== e || cliente.onboarding?.lavagens !== l) void atualizarOnboarding(cliente.id, { estado: e, lavagens: l }, { silencioso: true })
        }}
      >Criar meu cronograma</Botao>
      {doCadastro && <Botao variante="texto" onClick={() => setEditar(false)}>Voltar às respostas do cadastro</Botao>}
    </Cartao>
  )
}

/* ---------------- plano ativo ---------------- */
function Plano({ cliente, perfil, feitos }: { cliente: Cliente; perfil: PerfilCronograma; feitos: string[] }) {
  const plano = montarPlano(perfil, cliente, feitos)
  const hoje = hojeISO()
  const deHoje = plano.find((s) => s.data === hoje)
  const proxima = plano.find((s) => s.data > hoje)
  const semanaAtual = Math.min(3, Math.max(0, Math.floor((parseData(hoje).getTime() - parseData(perfil.inicio).getTime()) / (7 * 86_400_000))))
  const feitas = plano.filter((s) => s.feita).length
  const terminou = plano[plano.length - 1].data < hoje
  const usados = [...new Set(plano.map((s) => s.etapa))]
  const [refazer, setRefazer] = useState(false)

  return (
    <>
      <HojeCartao cliente={cliente} sessao={deHoje} proxima={proxima} terminou={terminou} />

      <Cartao>
        <div className="linha">
          <strong>Semana {semanaAtual + 1} de 4</strong>
          <span className="suave">{feitas} de {plano.length} feitas</span>
        </div>
        <Progresso valor={feitas / plano.length} rotulo="Progresso do cronograma" />
        <div className="cuid-semanas">
          {[0, 1, 2, 3].map((w) => (
            <div key={w} className={`cuid-semana ${w === semanaAtual ? 'atual' : ''}`}>
              <small>S{w + 1}</small>
              {plano.filter((s) => s.semana === w).map((s) => <Bolinha key={s.data} s={s} hoje={hoje} id={cliente.id} />)}
            </div>
          ))}
        </div>
        <div className="cuid-legenda">
          {(['H', 'N', 'R'] as Etapa[]).map((e) => <span key={e}><i className={`cuid-cor cuid-cor--${e}`} />{ETAPA[e].nome}</span>)}
        </div>
      </Cartao>

      <TituloSecao>Como fazer cada etapa</TituloSecao>
      <div className="cuid-etapas">
        {(['H', 'N', 'R'] as Etapa[]).map((e) => {
          const I = ICONE_ETAPA[e]
          return (
            <motion.button key={e} className={`cuid-etapa cuid-etapa--${ETAPA[e].tom}`} onClick={() => navegar(`/cuidados/${e}`)} whileTap={{ scale: 0.97 }}>
              <I size={56} />
              <strong>{ETAPA[e].nome}</strong>
              <small><Clock size={12} /> {ETAPA[e].tempo}</small>
            </motion.button>
          )
        })}
      </div>

      <TituloSecao>O que usar no seu cronograma</TituloSecao>
      <Cartao>
        {usados.flatMap((e) => ETAPA[e].produtos.map((p) => ({ ...p, etapa: e }))).map((p) => (
          <div key={p.etapa + p.nome} className="ds-item">
            <i className={`cuid-cor cuid-cor--${p.etapa} cuid-produto`} aria-hidden />
            <span className="ds-item__texto">
              <strong>{p.nome}</strong>
              <small>{ETAPA[p.etapa].nome} · {p.detalhe}</small>
            </span>
          </div>
        ))}
        <p className="fraco">Sugestões de tipo de produto, sem marca. Escolha os que o seu fio aceita bem.</p>
      </Cartao>

      <Cartao>
        <label className="linha interruptor">
          <span className="linha" style={{ gap: 10, justifyContent: 'flex-start' }}><Bell size={18} className="ouro" /><span>Lembrete no dia de cada etapa<br /><small className="suave">Aparece no Início e no sino de notificações</small></span></span>
          <input type="checkbox" checked={perfil.lembretes} onChange={(e) => salvarPerfil(cliente.id, { ...perfil, lembretes: e.target.checked })} />
        </label>
        <button className="ds-link" onClick={() => (refazer ? recomecar(cliente.id) : setRefazer(true))}><RotateCcw size={14} /> {refazer ? 'Toque de novo para apagar e refazer' : 'Refazer cronograma'}</button>
      </Cartao>
    </>
  )
}

function Bolinha({ s, hoje, id }: { s: Sessao; hoje: string; id: string }) {
  const passado = s.data < hoje
  const titulo = `${formatarData(s.data, { weekday: 'short', day: '2-digit' })}: ${ETAPA[s.etapa].nome}${s.feita ? ' (feito)' : ''}`
  return (
    <button
      className={`cuid-bola cuid-bola--${s.etapa} ${s.feita ? 'feita' : ''} ${s.data === hoje ? 'hoje' : ''} ${passado && !s.feita ? 'perdida' : ''}`}
      title={titulo}
      aria-label={titulo}
      disabled={s.data > hoje}
      onClick={() => alternarFeito(id, s.data)}
    >
      {s.feita ? <Check size={14} strokeWidth={3} /> : s.etapa}
    </button>
  )
}

function HojeCartao({ cliente, sessao, proxima, terminou }: { cliente: Cliente; sessao?: Sessao; proxima?: Sessao; terminou: boolean }) {
  if (terminou)
    return (
      <Cartao className="cuid-hoje cuid-hoje--lavanda">
        <IlCronograma size={76} />
        <TituloDestaque linha="Você completou" destaque="4 semanas" tom="lavanda" />
        <p className="suave centro">Hora de começar um novo ciclo. Se o cabelo mudou, refaça as perguntas.</p>
        <Botao onClick={() => recomecar(cliente.id)}>Novo cronograma</Botao>
      </Cartao>
    )
  if (sessao) {
    const e = ETAPA[sessao.etapa]
    const I = ICONE_ETAPA[sessao.etapa]
    return (
      <Cartao className={`cuid-hoje cuid-hoje--${e.tom}`}>
        <I size={84} />
        <span className="cuid-hoje__linha">Hoje é dia de</span>
        <span className="cuid-hoje__grande">{e.nome}</span>
        <span className="suave"><Clock size={13} /> {e.tempo} de pausa</span>
        <div className="cuid-hoje__acoes">
          <Botao variante={sessao.feita ? 'contorno' : 'ouro'} icone={Check} onClick={() => { alternarFeito(cliente.id, sessao.data); if (!sessao.feita) toast('Feito! Seu cabelo agradece.') }}>
            {sessao.feita ? 'Feito hoje' : 'Marquei como feito'}
          </Botao>
          <Botao variante="texto" onClick={() => navegar(`/cuidados/${sessao.etapa}`)}>Como fazer</Botao>
        </div>
      </Cartao>
    )
  }
  return (
    <Cartao className="cuid-hoje cuid-hoje--rosa">
      <span className="cuid-hoje__linha">Hoje</span>
      <span className="cuid-hoje__grande">dia de pausa</span>
      {proxima && <span className="suave">Próxima: <strong>{ETAPA[proxima.etapa].nome}</strong> {formatarData(proxima.data, { weekday: 'long', day: '2-digit', month: 'short' })}</span>}
      {proxima && <Botao variante="texto" bloco={false} onClick={() => navegar(`/cuidados/${proxima.etapa}`)}>Ver como fazer</Botao>}
    </Cartao>
  )
}

/* ---------------- detalhe de uma etapa ---------------- */
export function EtapaCuidado({ cliente, etapa }: { cliente: Cliente; etapa: Etapa }) {
  const e = ETAPA[etapa]
  const I = ICONE_ETAPA[etapa]
  const salvo = useCronograma(cliente.id)
  const hoje = hojeISO()
  const sessaoHoje = salvo.perfil ? montarPlano(salvo.perfil, cliente, salvo.feitos).find((s) => s.data === hoje && s.etapa === etapa) : undefined
  const foto = etapa === 'H' ? 'fios' : etapa === 'N' ? 'produtos' : 'costas'

  return (
    <>
      <Cabecalho titulo={e.nome} onVoltar={() => voltar('/cuidados')} />
      <section className={`cuid-detalhe cuid-detalhe--${e.tom}`}>
        <I size={96} />
        <TituloDestaque linha="Como fazer a" destaque={e.nome} tom={e.tom} />
        <Etiqueta tom="neutro" icone={Clock}>{e.tempo} de pausa</Etiqueta>
      </section>
      <div className="tela">
        <Cartao>
          <TituloSecao>Para que serve</TituloSecao>
          <p>{e.para}</p>
        </Cartao>

        <Cartao>
          <TituloSecao>Passo a passo</TituloSecao>
          <ol className="cuid-passos">
            {e.passos.map((p, i) => <li key={i}><span>{i + 1}</span><p>{p}</p></li>)}
          </ol>
        </Cartao>

        {e.evite && <Alerta tom="aviso">{e.evite}</Alerta>}

        <div className="cuid-foto"><Foto chave={foto} /></div>

        <TituloSecao>Use nesta etapa</TituloSecao>
        <Cartao>
          {e.produtos.map((p) => (
            <div key={p.nome} className="ds-item">
              <i className={`cuid-cor cuid-cor--${etapa} cuid-produto`} aria-hidden />
              <span className="ds-item__texto"><strong>{p.nome}</strong><small>{p.detalhe}</small></span>
            </div>
          ))}
        </Cartao>

        {sessaoHoje && (
          <Botao variante={sessaoHoje.feita ? 'contorno' : 'ouro'} icone={Check} onClick={() => alternarFeito(cliente.id, hoje)}>
            {sessaoHoje.feita ? 'Feito hoje' : 'Marquei como feito'}
          </Botao>
        )}
      </div>
    </>
  )
}
