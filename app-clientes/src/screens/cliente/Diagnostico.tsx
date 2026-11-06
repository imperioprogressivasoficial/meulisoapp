import { useState } from 'react'
import { ScanFace, Sparkles, UserPlus } from 'lucide-react'
import type { Cliente, Diagnostico as Diag } from '../../types'
import { Botao, Cabecalho, Cartao, Etiqueta, Opcao, Progresso, TituloSecao } from '../../ds/componentes'
import { EntradaFoto, FotoSalva, Hero } from '../../ds/extras'
import { salvarDiagnostico } from '../../data/acoes'
import { ETAPA } from '../../data/cronograma'
import { navegar, voltar } from '../../lib/rotas'
import { formatarData, hojeISO, uid } from '../../lib/regras'

const PERGUNTAS: { id: string; titulo: string; opcoes: [string, string][] }[] = [
  { id: 'tipo', titulo: 'Como é o seu cabelo hoje?', opcoes: [['liso', 'Liso'], ['ondulado', 'Ondulado'], ['cacheado', 'Cacheado'], ['crespo', 'Crespo']] },
  { id: 'espessura', titulo: 'E a espessura dos fios?', opcoes: [['fino', 'Fino'], ['medio', 'Médio'], ['grosso', 'Grosso']] },
  { id: 'quimica', titulo: 'Qual química você tem hoje?', opcoes: [['nenhuma', 'Nenhuma'], ['alisamento', 'Alisamento ou relaxamento'], ['coloracao', 'Coloração'], ['descoloracao', 'Luzes ou descoloração']] },
  { id: 'sensacao', titulo: 'Como o fio molhado se comporta?', opcoes: [['macio', 'Macio e forte'], ['ressecado', 'Áspero e ressecado'], ['elastico', 'Estica e quebra']] },
  { id: 'objetivo', titulo: 'O que você mais quer agora?', opcoes: [['hidratar', 'Mais maciez e brilho'], ['definir', 'Definição e menos frizz'], ['forca', 'Força e menos quebra']] },
]
const NUMERO = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito']
const QTD_PERGUNTAS = `${NUMERO[PERGUNTAS.length] ?? PERGUNTAS.length} perguntas`

/** Rótulo de uma resposta dentro da própria pergunta (ids iguais em perguntas diferentes não se misturam). */
const rotulo = (pergunta: string, valor?: string) => PERGUNTAS.find((p) => p.id === pergunta)?.opcoes.find(([id]) => id === valor)?.[1] ?? '—'

const FINALIZACAO: Record<string, string> = {
  liso: 'Finalizador leve, só do meio às pontas',
  ondulado: 'Finalizador leve com o cabelo úmido, amassando as ondas',
  cacheado: 'Leave-in e creme ou gelatina com o cabelo encharcado',
  crespo: 'Leave-in, creme e óleo em camadas para segurar a hidratação',
}

/** Regras do diagnóstico de cuidados: só orientação para casa, sem procedimento nem preço. */
export function analisar(r: Record<string, string>): Omit<Diag, 'id' | 'data' | 'respostas' | 'fotoId'> {
  const porosidade = r.quimica === 'descoloracao' || r.sensacao === 'elastico' ? 'Alta' : r.quimica === 'coloracao' || r.quimica === 'alisamento' || r.sensacao === 'ressecado' ? 'Média' : 'Baixa'
  const danos = r.sensacao === 'elastico' || r.quimica === 'descoloracao' ? 'Alto' : r.sensacao === 'ressecado' || r.quimica === 'coloracao' || r.quimica === 'alisamento' ? 'Médio' : 'Baixo'
  const cachos = r.tipo === 'cacheado' || r.tipo === 'crespo'
  const foco: Diag['foco'] = danos === 'Alto' || r.objetivo === 'forca' ? 'R' : r.objetivo === 'definir' || (cachos && r.sensacao === 'ressecado') ? 'N' : 'H'

  const rotina: string[] = []
  rotina.push(foco === 'H' ? 'Hidratação toda semana: é o seu foco' : 'Hidratação toda semana')
  rotina.push(foco === 'N' ? 'Nutrição a cada 7 dias: é o seu foco' : 'Nutrição a cada 10 a 15 dias')
  rotina.push(foco === 'R' ? 'Reconstrução a cada 15 dias, até o fio ganhar força' : 'Reconstrução uma vez por mês')
  if (FINALIZACAO[r.tipo]) rotina.push(FINALIZACAO[r.tipo])
  if (r.espessura === 'fino') rotina.push('Fio fino: fórmulas leves e calor em temperatura baixa')

  const obs: string[] = []
  if (r.sensacao === 'elastico') obs.push('Fio que estica e quebra molhado está pedindo massa: a reconstrução vem primeiro.')
  if (r.quimica === 'descoloracao') obs.push('Fio clareado é mais poroso: evite outra química sem orientação de um profissional.')
  if (r.quimica === 'alisamento') obs.push('Com alisamento ou relaxamento, use protetor térmico sempre e não exagere na reconstrução.')
  if (r.quimica === 'coloracao') obs.push('Fio com coloração perde água mais rápido: a hidratação é a base do seu cronograma.')
  if (cachos && r.objetivo === 'definir') obs.push('Cachos definidos pedem nutrição em dia e finalização com o cabelo bem molhado.')

  return { fio: `${rotulo('tipo', r.tipo)}, ${rotulo('espessura', r.espessura).toLowerCase()}`, porosidade, danos, foco, rotina, observacoes: obs }
}

export function Diagnostico({ cliente }: { cliente?: Cliente }) {
  const [passo, setPasso] = useState(0)
  const [resp, setResp] = useState<Record<string, string>>({})
  const [foto, setFoto] = useState<string>()
  const [resultado, setResultado] = useState<Diag>()
  const total = PERGUNTAS.length + 1

  const finalizar = () => {
    const d: Diag = { id: uid(), data: hojeISO(), respostas: resp, fotoId: foto, ...analisar(resp) }
    salvarDiagnostico(cliente?.id, d)
    setResultado(d)
  }

  if (resultado) {
    const e = ETAPA[resultado.foco]
    const nivelDano = { Baixo: 0.25, Médio: 0.6, Alto: 0.9 }[resultado.danos] ?? 0.5
    return (
      <>
        <Cabecalho titulo="Diagnóstico capilar" onVoltar={() => voltar('/')} />
        <div className="tela">
          {resultado.fotoId && <FotoSalva id={resultado.fotoId} className="foto-larga" />}
          <TituloSecao>Resultado</TituloSecao>
          <div className="grade-3">
            <Cartao tom="creme" className="centro"><small className="suave">Seu fio</small><strong>{resultado.fio}</strong></Cartao>
            <Cartao tom="creme" className="centro"><small className="suave">Porosidade</small><strong>{resultado.porosidade}</strong></Cartao>
            <Cartao tom="creme" className="centro"><small className="suave">Danos</small><strong>{resultado.danos}</strong></Cartao>
          </div>
          <Cartao>
            <span className="suave">Saúde do fio</span>
            <Progresso valor={1 - nivelDano} tom={nivelDano > 0.7 ? 'erro' : nivelDano > 0.4 ? 'aviso' : 'sucesso'} />
          </Cartao>
          <Cartao tom="ouro" className="diag-rotina">
            <span className="rotulo">Sua rotina recomendada</span>
            <strong style={{ fontSize: 'var(--t-lg)' }}>Foco em {e.nome.toLowerCase()}</strong>
            <ul className="lista-artigo">{resultado.rotina.map((t) => <li key={t}>{t}</li>)}</ul>
            {resultado.observacoes.map((o) => <span key={o} className="linha" style={{ justifyContent: 'flex-start', gap: 8 }}><Sparkles size={14} /> {o}</span>)}
          </Cartao>
          <p className="fraco">Orientação de cuidados com base nas suas respostas, não um diagnóstico médico. Queda forte, coceira ou feridas no couro cabeludo pedem um dermatologista.</p>
          {cliente ? (
            <>
              <Botao icone={Sparkles} onClick={() => navegar('/cuidados')}>Ver meu cronograma</Botao>
              <Botao variante="contorno" onClick={() => navegar(`/cuidados/${resultado.foco}`)}>Como fazer a {e.nome.toLowerCase()}</Botao>
            </>
          ) : (
            <>
              <Botao icone={UserPlus} onClick={() => navegar('/')}>Criar minha conta</Botao>
              <p className="centro suave">Seu diagnóstico fica salvo no cadastro e vira um cronograma de 4 semanas.</p>
            </>
          )}
        </div>
      </>
    )
  }

  const p = PERGUNTAS[passo]
  return (
    <>
      <Cabecalho titulo="Diagnóstico capilar" onVoltar={() => (passo ? setPasso(passo - 1) : voltar('/'))} />
      <div className="tela">
        {passo === 0 && <Hero chave="crespo" alto titulo="Conheça o seu cabelo" texto={`${QTD_PERGUNTAS[0].toUpperCase()}${QTD_PERGUNTAS.slice(1)} e uma foto, se quiser. O resultado sai na hora.`} />}
        <Progresso valor={(passo + 1) / total} fina />
        <span className="suave">Passo {passo + 1} de {total}</span>
        {passo < PERGUNTAS.length ? (
          <>
            <h2 className="titulo-passo">{p.titulo}</h2>
            <div className="grade-2">
              {p.opcoes.map(([id, rot]) => (
                <Opcao key={id} rotulo={rot} selecionada={resp[p.id] === id} onClick={() => { setResp({ ...resp, [p.id]: id }); setTimeout(() => setPasso(passo + 1), 180) }} />
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="titulo-passo">Tire uma foto do seu cabelo</h2>
            <p className="suave">Solto, com boa luz natural. A foto fica guardada junto com o seu diagnóstico, para comparar depois.</p>
            {foto ? <FotoSalva id={foto} className="foto-larga" /> : <EntradaFoto onFoto={setFoto} />}
            <Botao icone={ScanFace} onClick={finalizar}>{foto ? 'Ver meu diagnóstico' : 'Pular e ver diagnóstico'}</Botao>
          </>
        )}
        {cliente && cliente.diagnosticos.length > 0 && passo === 0 && (
          <Cartao tom="creme">
            <TituloSecao>Diagnósticos anteriores</TituloSecao>
            {cliente.diagnosticos.slice(0, 3).map((d) => (
              <div key={d.id} className="linha">
                <span>{formatarData(d.data)} · {d.fio}</span>
                <Etiqueta tom="ouro">{ETAPA[d.foco]?.nome ?? 'Cuidados'}</Etiqueta>
              </div>
            ))}
          </Cartao>
        )}
      </div>
    </>
  )
}
