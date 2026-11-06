/**
 * Perguntas do perfil de cabelo, uma por tela. Usadas no primeiro acesso (Entrada)
 * e no "Meu perfil de cabelo" (para editar as respostas depois).
 */
import { useState } from 'react'
import { Bell, Check, User } from 'lucide-react'
import { Botao, Campo } from '../../ds/componentes'
import { toast } from '../../ds/extras'
import { IlAgendar, IlCabelo, IlCronograma, IlDiagnostico, IlHidratacao, IlNutricao, IlPrancha, IlRaiz, IlReconstrucao, type Icone } from '../../ds/ilustras'
import {
  CALOR, COMPRIMENTOS, ESTADOS, INCOMODOS, LAVAGENS, OBJETIVOS, QUIMICAS_ATUAIS, TIPOS, ULTIMA, primeiroNomeDe, temQuimica,
} from '../../data/perfilCabelo'
import { pedirPermissao, suportaNotificacoes } from '../../lib/notificar'
import type { QuimicaAtual, RespostasOnboarding } from '../../types'
import './entrada.css'

export type IdPergunta =
  | 'nome' | 'objetivos' | 'cabelo' | 'quimicas' | 'ultima' | 'comprimento' | 'estado' | 'incomodos' | 'lavagens' | 'calor' | 'lembretes'

/** Ordem do primeiro acesso. */
export const ORDEM_ONBOARDING: IdPergunta[] = ['nome', 'objetivos', 'cabelo', 'quimicas', 'ultima', 'comprimento', 'estado', 'incomodos', 'lavagens', 'calor', 'lembretes']
/** As que dizem respeito ao cabelo (editáveis no perfil). */
export const ORDEM_PERFIL: IdPergunta[] = ['objetivos', 'cabelo', 'quimicas', 'ultima', 'comprimento', 'estado', 'incomodos', 'lavagens', 'calor']

/** Pode pular (objetivos, tipo de cabelo e química montam o básico do plano). */
export const OPCIONAL: Record<IdPergunta, boolean> = {
  nome: true, objetivos: false, cabelo: false, quimicas: false, ultima: true, comprimento: true,
  estado: true, incomodos: true, lavagens: true, calor: true, lembretes: true,
}

/** "Quando foi a última química?" só aparece para quem tem química. */
export const pularPergunta = (id: IdPergunta, r: RespostasOnboarding) => id === 'ultima' && !temQuimica(r)

export const vazio = (): RespostasOnboarding => ({ objetivos: [], ultimaProgressiva: '', tipoCabelo: '' })

/** Tira campos vazios (o servidor guarda só o que foi respondido). */
export function limparRespostas(r: RespostasOnboarding): RespostasOnboarding | undefined {
  const apelido = r.apelido ? primeiroNomeDe(r.apelido) : ''
  const out: RespostasOnboarding = { objetivos: r.objetivos ?? [], ultimaProgressiva: temQuimica(r) ? r.ultimaProgressiva ?? '' : '', tipoCabelo: r.tipoCabelo ?? '' }
  if (apelido) out.apelido = apelido
  if (r.comprimento) out.comprimento = r.comprimento
  if (r.quimicas?.length) out.quimicas = r.quimicas
  if (r.estado) out.estado = r.estado
  if (r.incomodos?.length) out.incomodos = r.incomodos
  if (r.lavagens) out.lavagens = r.lavagens
  if (r.calor) out.calor = r.calor
  if (r.lembretes !== undefined) out.lembretes = r.lembretes
  const algo = out.objetivos.length || out.ultimaProgressiva || out.tipoCabelo || Object.keys(out).length > 3
  return algo ? out : undefined
}

const ICONE_OBJETIVO: Record<string, Icone> = {
  hidratar: IlHidratacao, definir: IlCabelo, frizz: IlNutricao, crescimento: IlRaiz, recuperar: IlReconstrucao, liso: IlPrancha, entender: IlDiagnostico,
}
const FIO: Record<string, string> = {
  liso: 'M12 4v40',
  ondulado: 'M12 4c6 6-6 10 0 16s-6 10 0 16 0 8 0 8',
  cacheado: 'M12 4c7 0 7 7 0 7s-7 7 0 7 7 7 0 7-7 7 0 7 7 7 0 7',
  crespo: 'M12 4l3 2.5-3 2.5 3 2.5-3 2.5 3 2.5-3 2.5 3 2.5-3 2.5 3 2.5-3 2.5 3 2.5-3 2.5 3 2.5-3 2.5 3 2.5-3 2.5',
}

const alternar = <T,>(lista: T[] | undefined, v: T) => ((lista ?? []).includes(v) ? (lista ?? []).filter((x) => x !== v) : [...(lista ?? []), v])

export interface PropsPergunta {
  id: IdPergunta
  r: RespostasOnboarding
  mudar: (p: Partial<RespostasOnboarding>) => void
  /** Vai para a próxima tela (ou salva, no perfil). */
  avancar: () => void
  /** Texto do botão das perguntas de múltipla escolha. */
  rotuloAvancar?: string
}

/** Pergunta de resposta única: marca e já avança. */
function useEscolher(mudar: PropsPergunta['mudar'], avancar: () => void) {
  return (p: Partial<RespostasOnboarding>) => { mudar(p); setTimeout(avancar, 260) }
}

export function CorpoPergunta({ id, r, mudar, avancar, rotuloAvancar = 'Continuar' }: PropsPergunta) {
  const escolher = useEscolher(mudar, avancar)
  const [pedindo, setPedindo] = useState(false)

  switch (id) {
    case 'nome':
      return (
        <form className="ob-form" onSubmit={(e) => { e.preventDefault(); if (r.apelido?.trim()) avancar() }}>
          <Pergunta titulo="Como podemos te chamar?" texto="Seu primeiro nome ou apelido. É assim que o app vai falar com você." />
          <Campo icone={User} placeholder="Seu nome" value={r.apelido ?? ''} onChange={(e) => mudar({ apelido: e.target.value.slice(0, 40) })} autoComplete="given-name" aria-label="Como podemos te chamar" autoFocus />
          <div className="ob-rodape"><Botao type="submit" disabled={!r.apelido?.trim()}>{rotuloAvancar}</Botao></div>
        </form>
      )
    case 'objetivos':
      return (
        <>
          <Pergunta titulo={r.apelido?.trim() ? `${primeiroNomeDe(r.apelido)}, o que você quer agora?` : 'O que você quer agora?'} texto="Escolha quantas quiser. Assim o app fica com a sua cara." />
          <div className="ob-tiles" role="group" aria-label="Objetivos">
            {OBJETIVOS.map((o) => {
              const sel = r.objetivos.includes(o.id)
              const I = ICONE_OBJETIVO[o.id] ?? IlCronograma
              return (
                <button key={o.id} className={`ob-tile${sel ? ' ob-tile--sel' : ''}`} aria-pressed={sel} onClick={() => mudar({ objetivos: alternar(r.objetivos, o.id) })}>
                  <I size={48} />
                  <span>{o.rotulo}</span>
                  <span className="ob-tile__marca" aria-hidden>{sel && <Check size={14} strokeWidth={3} />}</span>
                </button>
              )
            })}
          </div>
          <div className="ob-rodape"><Botao disabled={!r.objetivos.length} onClick={avancar}>{rotuloAvancar}</Botao></div>
        </>
      )
    case 'ultima':
      return (
        <>
          <Pergunta titulo="Quando foi a última química?" texto="Fio com química recente pede mais hidratação e menos calor nas primeiras semanas." />
          <div className="ob-lista" role="radiogroup" aria-label="Última química">
            {ULTIMA.map((o) => <Escolha key={o.id} rotulo={o.rotulo} selecionada={r.ultimaProgressiva === o.id} onClick={() => escolher({ ultimaProgressiva: o.id })} />)}
          </div>
        </>
      )
    case 'cabelo':
      return (
        <>
          <Pergunta titulo="Como é o seu cabelo hoje?" texto="Se ele tem alisamento, escolha como ele está agora. Dá para mudar depois." />
          <div className="ob-cabelos" role="radiogroup" aria-label="Tipo de cabelo">
            {TIPOS.map((o) => (
              <button key={o.id} role="radio" aria-checked={r.tipoCabelo === o.id} className={`ob-cabelo${r.tipoCabelo === o.id ? ' ob-cabelo--sel' : ''}`} onClick={() => escolher({ tipoCabelo: o.id })}>
                <svg width="48" height="48" viewBox="0 0 24 48" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d={FIO[o.id]} transform="translate(-4 0)" /><path d={FIO[o.id]} /><path d={FIO[o.id]} transform="translate(4 0)" />
                </svg>
                <span>{o.rotulo}</span>
              </button>
            ))}
          </div>
        </>
      )
    case 'comprimento':
      return (
        <>
          <Pergunta titulo="Qual o comprimento do seu cabelo?" texto="Ajuda a saber quanto produto usar em cada etapa." />
          <div className="ob-lista" role="radiogroup" aria-label="Comprimento">
            {COMPRIMENTOS.map((o) => <Escolha key={o.id} rotulo={o.rotulo} detalhe={o.detalhe} selecionada={r.comprimento === o.id} onClick={() => escolher({ comprimento: o.id })} />)}
          </div>
        </>
      )
    case 'quimicas':
      return (
        <>
          <Pergunta titulo="Tem química no cabelo?" texto="Pode marcar mais de uma. Isso muda o cuidado com o seu fio." />
          <div className="ob-lista" role="group" aria-label="Química no cabelo">
            {QUIMICAS_ATUAIS.map((o) => {
              const sel = !!r.quimicas?.includes(o.id)
              const proxima = (): QuimicaAtual[] => (o.id === 'nenhuma' ? (sel ? [] : ['nenhuma']) : alternar(r.quimicas?.filter((x) => x !== 'nenhuma'), o.id))
              return <Escolha key={o.id} multipla rotulo={o.rotulo} detalhe={o.detalhe} selecionada={sel} onClick={() => mudar({ quimicas: proxima() })} />
            })}
          </div>
          <div className="ob-rodape"><Botao disabled={!r.quimicas?.length} onClick={avancar}>{rotuloAvancar}</Botao></div>
        </>
      )
    case 'estado':
      return (
        <>
          <Pergunta titulo="Como está seu fio hoje?" texto="Com isso o cronograma capilar já sai pronto." />
          <div className="ob-lista" role="radiogroup" aria-label="Estado do fio">
            {ESTADOS.map((o) => <Escolha key={o.id} rotulo={o.rotulo} detalhe={o.detalhe} selecionada={r.estado === o.id} onClick={() => escolher({ estado: o.id })} />)}
          </div>
        </>
      )
    case 'incomodos': {
      const marcados = r.incomodos ?? []
      return (
        <>
          <Pergunta titulo="O que mais te incomoda?" texto="Marque na ordem: o primeiro é o que mais pesa para você." />
          <div className="ob-chips" role="group" aria-label="O que mais incomoda">
            {INCOMODOS.map((o) => {
              const ordem = marcados.indexOf(o.id)
              return (
                <button key={o.id} className={`ob-chip${ordem >= 0 ? ' ob-chip--sel' : ''}`} aria-pressed={ordem >= 0} onClick={() => mudar({ incomodos: alternar(marcados, o.id) })}>
                  {ordem >= 0 && <span className="ob-chip__ordem" aria-hidden>{ordem + 1}</span>}
                  {o.rotulo}
                </button>
              )
            })}
          </div>
          <div className="ob-rodape"><Botao disabled={!marcados.length} onClick={avancar}>{rotuloAvancar}</Botao></div>
        </>
      )
    }
    case 'lavagens':
      return (
        <>
          <Pergunta titulo="Quantas vezes você lava o cabelo por semana?" texto="Cada lavagem vira uma etapa do cronograma." />
          <div className="ob-lista" role="radiogroup" aria-label="Lavagens por semana">
            {LAVAGENS.map((o) => <Escolha key={o.id} rotulo={o.rotulo} selecionada={r.lavagens === o.id} onClick={() => escolher({ lavagens: o.id })} />)}
          </div>
        </>
      )
    case 'calor':
      return (
        <>
          <Pergunta titulo="Usa secador, difusor ou chapinha?" texto="O calor pede proteção extra para o fio." />
          <div className="ob-lista" role="radiogroup" aria-label="Uso de calor">
            {CALOR.map((o) => <Escolha key={o.id} rotulo={o.rotulo} detalhe={o.detalhe} selecionada={r.calor === o.id} onClick={() => escolher({ calor: o.id })} />)}
          </div>
        </>
      )
    case 'lembretes':
      return (
        <>
          <div className="ob-lembrete__icone"><IlAgendar size={96} /></div>
          <Pergunta titulo="Quer receber lembretes?" texto="A gente avisa só o que importa para o seu cabelo:" />
          <ul className="ob-lembrete__lista">
            <li><Check size={16} strokeWidth={3} /> No dia de cada etapa do cronograma</li>
            <li><Check size={16} strokeWidth={3} /> Cuidados extras depois de uma química</li>
            <li><Check size={16} strokeWidth={3} /> Quando for hora de uma foto nova na Evolução</li>
          </ul>
          <div className="ob-rodape pilha-sm">
            <Botao icone={Bell} disabled={pedindo} onClick={async () => {
              setPedindo(true)
              // o navegador mostra a pergunta dele; se demorar ou não houver suporte, segue com os lembretes do app
              const ok = suportaNotificacoes() ? await Promise.race([pedirPermissao().catch(() => false), new Promise<boolean>((res) => setTimeout(() => res(false), 4000))]) : false
              setPedindo(false)
              toast(ok ? 'Lembretes ativados.' : 'Combinado: os lembretes aparecem dentro do app. Dá para ativar os avisos do celular em Configurações.')
              mudar({ lembretes: true })
              avancar()
            }}>Ativar lembretes</Botao>
            <Botao variante="texto" onClick={() => { mudar({ lembretes: false }); avancar() }}>Agora não</Botao>
          </div>
        </>
      )
  }
}

export function Pergunta({ titulo, texto }: { titulo: string; texto?: string }) {
  return (
    <div className="ob-pergunta">
      <h1>{titulo}</h1>
      {texto && <p>{texto}</p>}
    </div>
  )
}

export function Escolha({ rotulo, detalhe, selecionada, desabilitada, multipla, onClick }: { rotulo: string; detalhe?: string; selecionada: boolean; desabilitada?: boolean; multipla?: boolean; onClick: () => void }) {
  return (
    <button role={multipla ? undefined : 'radio'} aria-checked={multipla ? undefined : selecionada} aria-pressed={multipla ? selecionada : undefined}
      className={`ob-escolha${detalhe ? ' ob-escolha--detalhe' : ''}${selecionada ? ' ob-escolha--sel' : ''}`} disabled={desabilitada} onClick={onClick}>
      <span className="ob-escolha__texto">
        <span>{rotulo}</span>
        {detalhe && <small>{detalhe}</small>}
      </span>
      <span className={`ob-escolha__marca${multipla ? ' ob-escolha__marca--quadrada' : ''}`} aria-hidden>{selecionada && <Check size={14} strokeWidth={3} />}</span>
    </button>
  )
}
